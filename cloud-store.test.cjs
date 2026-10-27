const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Writable} = require('node:stream');
const createStore = require('./cloud-store.cjs');
const crypto = require('node:crypto');

const userId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const productId = '33333333-3333-4333-8333-333333333333';
const orderId = '44444444-4444-4444-8444-444444444444';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
class Result extends Writable {
  constructor() {super(); this.chunks = [];}
  writeHead(status, headers) {this.status = status; this.headers = headers;}
  _write(chunk, encoding, done) {this.chunks.push(Buffer.from(chunk)); done();}
  get text() {return Buffer.concat(this.chunks).toString();}
  get json() {return JSON.parse(this.text);}
}
function setup(t) {
  const db = {
    store_sessions: ['alice','bob'].map((token, i) => ({token_hash: hash(token), user_id: i ? otherId : userId, kind: 'customer', expires_at: '2099-01-01T00:00:00Z'})),
    profiles: [{id: userId, nome: 'Alice', email: 'alice@example.com'}, {id: otherId, nome: 'Bob', email: 'bob@example.com'}],
    products: [{id: productId, titulo: 'Meu PDF', descricao: '', preco_centavos: 1290, nivel: 'Infantil', tema: 'Letras', ano: '', ativo: true, created_at: new Date().toISOString(), preview_urls: [], page_count: 1, pdf_path: 'protected.pdf'}],
    store_orders: [{id: orderId, user_id: userId, email: 'alice@example.com', items: [{id: productId, title: 'Meu PDF', price: 1290}], total: 1290, status: 'pago', created_at: new Date().toISOString(), paid_at: new Date().toISOString(), stripe_session_id: 'cs_test'}],
    purchases: [{id: 'entitlement', user_id: userId, product_id: productId, status: 'paid'}]
  };
  db.identities = {[userId]: {id:userId,email:'faelanderson03@gmail.com',email_confirmed_at:'2026-01-01',identities:[{provider:'google'}]},[otherId]:{id:otherId,email:'bob@example.com',email_confirmed_at:'2026-01-01',identities:[{provider:'google'}]}};
  let storageCalls = 0, checkoutPrice;
  t.mock.method(global, 'fetch', async (input, options = {}) => {
    const url = new URL(input);
    if (url.pathname.startsWith('/auth/v1/admin/users/')) return Response.json(db.identities[url.pathname.split('/').at(-1)]);
    if (url.pathname.startsWith('/storage/')) {storageCalls++; return new Response('%PDF-1.4 protected');}
    const table = url.pathname.split('/').at(-1), rows = db[table];
    assert.ok(rows, `Unexpected request: ${url.pathname}`);
    const matching = row => [...url.searchParams].every(([key, filter]) => {
      if (['select','order','on_conflict'].includes(key)) return true;
      if (filter.startsWith('eq.')) return String(row[key]) === filter.slice(3);
      if (filter.startsWith('gt.')) return row[key] > filter.slice(3);
      if (filter === 'is.null') return row[key] == null;
      if (filter.startsWith('in.(')) return filter.slice(4, -1).split(',').includes(row[key]);
      assert.fail(`Unhandled filter: ${filter}`);
    });
    if (options.method === 'POST') {rows.push(JSON.parse(options.body)); return new Response(null, {status: 201});}
    if (options.method === 'DELETE') {db[table] = rows.filter(row => !matching(row)); return new Response(null, {status: 204});}
    if (options.method === 'PATCH') {for (const row of rows.filter(matching)) Object.assign(row, JSON.parse(options.body)); return new Response(null, {status: 204});}
    return Response.json(rows.filter(matching));
  });
  const options = {
    base: 'https://supabase.test', secret: 'server-secret', authKey: 'public-key', publicBase: 'https://store.test',
    send: (res, status, data, headers = {}) => {res.writeHead(status, headers); res.end(JSON.stringify(data));},
    body: async req => Buffer.from(JSON.stringify(req.input || {})), json: raw => JSON.parse(raw),
    cookies: req => req.cookies, sessionCookie: (req, name, value) => `${name}=${value}`,
    publicProduct: ({pdfPath, ...product}) => product,
    stripeReady: true, webhookReady: true, verifiedWebhook: () => false, safeEqual: (a,b) => a === b,
    stripeSession: async (order, items) => {checkoutPrice = items[0].price; return {id: 'cs_new', url: 'https://checkout.stripe.com/test'};}
  };
  const request = async (route, {token = 'alice', method = 'GET', input = {}, handler = createStore(options)} = {}) => {
    const req = {headers: {}, cookies: {pequenos_session: token}, input}, res = new Result();
    await handler(req, res, route, method); return res;
  };
  return {db, options, request, storageCalls: () => storageCalls, checkoutPrice: () => checkoutPrice};
}
test('a customer session works across application instances and logout revokes it', async t => {
  const {options, request} = setup(t);
  const one = createStore(options), two = createStore(options);
  assert.equal((await request('/api/account/session', {handler: one})).json.user.id, userId);
  assert.equal((await request('/api/account/session', {handler: two})).json.user.id, userId);
  await request('/api/account/logout', {handler: one, method: 'POST'});
  assert.equal((await request('/api/account/session', {handler: two})).json.authenticated, false);
});
test('Drive imports require the verified Google administrator before reading input or fetching files',async t=>{
 const {request}=setup(t);
 await assert.rejects(request('/api/admin/products/import',{method:'POST',token:'bob',input:{driveId:'1xphoOm5t4WxUNX_8AyXjZ_DBciG4Ezs2'}}),{status:403});
 await assert.rejects(request('/api/admin/products/import',{method:'POST',token:'',input:{}}),{status:403});
});
test('only the buyer sees a paid PDF, including archived products', async t => {
  const {db, request} = setup(t);
  db.products[0].ativo = false;
  const owner = (await request('/api/account/library')).json;
  assert.equal(owner.orders[0].items[0].available, true);
  assert.deepEqual((await request('/api/account/library', {token: 'bob'})).json.orders, []);
});
test('private download requires ownership and an active paid entitlement', async t => {
  const {request, storageCalls, db} = setup(t), route = `/api/account/download/${orderId}/${productId}`;
  await assert.rejects(request(route, {token: 'bob'}), {status: 403});
  await assert.rejects(request(route, {token: ''}), {status: 401});
  assert.equal(storageCalls(), 0);
  const file = await request(route);
  assert.match(file.text, /^%PDF/); assert.equal(file.headers['Cache-Control'], 'private, no-store');
  db.purchases[0].status = 'refunded';
  await assert.rejects(request(route), {status: 403});
  db.purchases[0].status = 'paid'; db.store_orders[0].status = 'pendente';
  await assert.rejects(request(route), {status: 403});
});
test('checkout prices come from the database and the order is persisted first', async t => {
  const {db, request, checkoutPrice} = setup(t);
  db.purchases = [];
  const result = await request('/api/checkout', {method: 'POST', input: {productIds: [productId], price: 1, userId: otherId}});
  assert.equal(result.status, 200); assert.equal(checkoutPrice(), 1290);
  const pending = db.store_orders.at(-1);
  assert.equal(pending.user_id, userId); assert.equal(pending.total, 1290); assert.equal(pending.stripe_session_id, 'cs_new');
});
test('invalid Stripe signatures and legacy access URLs cannot release PDFs', async t => {
  const {request, storageCalls} = setup(t);
  await assert.rejects(request('/api/stripe/webhook', {method: 'POST'}), {status: 400});
  await assert.rejects(request(`/api/orders/${orderId}/download/${productId}`), {status: 403});
  assert.equal(storageCalls(), 0);
});

test('dashboard authorizes only the verified Google owner, ignoring profile spoofing', async t => {
  const {db,request}=setup(t);
  assert.equal((await request('/api/admin/session')).json.authenticated,true);
  assert.equal((await request('/api/admin/products')).status,200);
  db.profiles[1].email='faelanderson03@gmail.com';
  assert.equal((await request('/api/admin/session',{token:'bob'})).json.authenticated,false);
  await assert.rejects(request('/api/admin/products',{token:'bob'}),{status:403});
  await assert.rejects(request('/api/admin/orders',{token:''}),{status:403});
  await assert.rejects(request('/api/admin/login',{method:'POST',input:{password:'old-password'}}),{status:405});
  db.identities[userId].identities=[{provider:'email'}];
  await assert.rejects(request('/api/admin/products'),{status:403});
});
