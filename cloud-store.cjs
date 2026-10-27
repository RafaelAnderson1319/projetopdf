const crypto = require('node:crypto');
const {Readable} = require('node:stream');

// All privileged requests stay on the server. No secret or PDF path is returned
// to the browser. Local development without Supabase still uses server.cjs.
module.exports = function createCloudStore(options) {
  const {base, secret, authKey, send, body, json, cookies, sessionCookie,
    publicProduct, renderPdfPreviews, storePreview, stripeSession, stripeStatus, ensureStripeProduct,
    verifiedWebhook, stripeReady, webhookReady, adminPassword, safeEqual, publicBase} = options;
  const headers = {apikey: secret, Authorization: `Bearer ${secret}`};
  const error = (message, status = 502) => Object.assign(new Error(message), {status});
  async function rest(resource, {method = 'GET', data, prefer} = {}) {
    const response = await fetch(`${base}/rest/v1/${resource}`, {
      method, headers: {...headers, 'Content-Type': 'application/json',
        ...(prefer ? {Prefer: prefer} : {})}, body: data === undefined ? undefined : JSON.stringify(data)
    });
    if (!response.ok) { console.error('Supabase request rejected:', method, resource.split('?')[0], response.status); throw error('Não foi possível acessar sua biblioteca. Tente novamente.'); }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  async function auth(resource, data, token) {
    const response = await fetch(`${base}/auth/v1/${resource}`, {
      method: data ? 'POST' : 'GET', headers: {apikey: authKey,
        'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})},
      body: data ? JSON.stringify(data) : undefined
    });
    const result = await response.json();
    if (!response.ok) throw error(resource.startsWith('token') ? 'E-mail ou senha incorretos, ou e-mail ainda não confirmado.' : 'Não foi possível validar a conta. Confira os dados e tente novamente.', response.status === 429 ? 429 : 400);
    return result;
  }
  const digest = token => crypto.createHash('sha256').update(token).digest('hex');
  const cookieName = kind => kind === 'admin' ? 'wonder_admin' : 'pequenos_session';
  async function getSession(req, kind = 'customer') {
    const token = cookies(req)[cookieName(kind)];
    if (!token || token.length > 100) return null;
    const rows = await rest(`store_sessions?token_hash=eq.${digest(token)}&kind=eq.${kind}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=user_id`);
    return rows[0] || null;
  }
  async function currentUser(req) {
    const session = await getSession(req);
    if (!session) return null;
    const profiles = await rest(`profiles?id=eq.${session.user_id}&select=id,nome,email`);
    const profile = profiles[0];
    return profile ? {id: profile.id, name: profile.nome, email: profile.email} : null;
  }
  async function requireUser(req) {
    const user = await currentUser(req);
    if (!user) throw error('Entre na sua conta para continuar', 401);
    return user;
  }
  async function isAdmin(req) {
    const user = await currentUser(req);
    if (!user) return false;
    const response = await fetch(base + '/auth/v1/admin/users/' + user.id, {headers});
    if (!response.ok) throw error('Não foi possível verificar o acesso administrativo.');
    const identity = await response.json();
    return identity.id === user.id && identity.email?.toLowerCase() === 'faelanderson03@gmail.com'
      && !!identity.email_confirmed_at && identity.identities?.some(item => item.provider === 'google');
  }
  async function requireAdmin(req) {
    if (!await isAdmin(req)) throw error('Esta conta não tem permissão para administrar a loja.', 403);
  }
  async function startSession(req, userId, kind = 'customer') {
    const token = crypto.randomBytes(32).toString('base64url');
    await rest('store_sessions', {method: 'POST', prefer: 'return=minimal', data: {
      token_hash: digest(token), user_id: userId, kind,
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString()
    }});
    return sessionCookie(req, cookieName(kind), token);
  }
  async function endSession(req, kind = 'customer') {
    const token = cookies(req)[cookieName(kind)];
    if (token) await rest(`store_sessions?token_hash=eq.${digest(token)}&kind=eq.${kind}`, {method: 'DELETE'});
    return sessionCookie(req, cookieName(kind), '', 0);
  }
  async function saveProfile(user, name) {
    // Never accept role or identity from browser data.
    await rest('profiles?on_conflict=id', {method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
      data: {id: user.id, nome: name || user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0], email: user.email}});
    return {id: user.id, name: name || user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0], email: user.email};
  }
  function product(row) {
    return {id: row.id, title: row.titulo, description: row.descricao, price: row.preco_centavos,
      level: row.nivel, subject: row.tema, grade: row.ano, active: row.ativo,
      created: Date.parse(row.created_at), previewUrls: row.preview_urls, pageCount: row.page_count, pdfPath: row.pdf_path, stripePriceId:row.stripe_price_id};
  }
  async function products(filter = '') {return (await rest(`products?select=*&order=created_at.desc${filter}`)).map(product);}
  function order(row) {
    return {id: row.id, userId: row.user_id, email: row.email, items: row.items, total: row.total,
      status: row.status, created: Date.parse(row.created_at), paidAt: row.paid_at ? Date.parse(row.paid_at) : null, session: row.stripe_session_id};
  }
  async function orders(filter = '') {return (await rest(`store_orders?select=*&order=created_at.desc${filter}`)).map(order);}
  async function markPaid(session) {
    if (session.payment_status !== 'paid') return false;
    if (!/^[a-f0-9-]{36}$/.test(session.metadata?.order_id || '') || !/^[a-f0-9-]{36}$/.test(session.metadata?.user_id || '')) return false;
    return rest('rpc/complete_store_order', {method: 'POST', data: {
      p_order_id: session.metadata.order_id, p_user_id: session.metadata.user_id,
      p_session_id: session.id, p_amount: session.amount_total, p_currency: session.currency,
      p_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null
    }});
  }
  async function storage(path, method = 'GET', file, upsert = false) {
    const response = await fetch(`${base}/storage/v1/object/${method === 'GET' ? 'authenticated/' : ''}pdfs/${path.split('/').map(encodeURIComponent).join('/')}`, {
      method, headers: {...headers, ...(file ? {'Content-Type': 'application/pdf', 'x-upsert': String(upsert)} : {})}, body: file
    });
    if (!response.ok) throw error('Arquivo indisponível. Tente novamente.', response.status === 404 ? 404 : 502);
    return response;
  }
  async function download(res, material) {
    const response = await storage(material.pdfPath);
    res.writeHead(200, {'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="material-${material.id}.pdf"`,
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'});
    await require('node:stream/promises').pipeline(Readable.fromWeb(response.body), res);
  }
  return async function cloudStore(req, res, route, method) {
    if (route === '/api/config' && method === 'GET') {send(res, 200, {stripeReady, user: await currentUser(req)}); return true;}
    if (route === '/api/account/register' && method === 'POST') {
      const input = json(await body(req)), name = String(input.name || '').trim(), email = String(input.email || '').trim().toLowerCase(), password = String(input.password || '');
      if (name.length < 2 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160 || password.length < 8 || password.length > 128) throw error('Informe nome, e-mail válido e senha de 8 a 128 caracteres.', 400);
      const result = await auth(`signup?redirect_to=${encodeURIComponent(`${publicBase}/account`)}`, {email, password, data: {full_name: name}});
      // Supabase can return an obfuscated user for an existing email. Only create
      // an application session after Auth actually issues an access token.
      if (!result.access_token) {send(res, 201, {requiresEmailConfirmation: true}); return true;}
      const verified = await auth('user', null, result.access_token);
      const user = await saveProfile(verified, name);
      send(res, 201, {user}, {'Set-Cookie': await startSession(req, user.id)}); return true;
    }
    if (route === '/api/account/login' && method === 'POST') {
      const input = json(await body(req));
      const result = await auth('token?grant_type=password', {email: String(input.email || '').trim().toLowerCase(), password: String(input.password || '')});
      const user = await saveProfile(result.user);
      send(res, 200, {user}, {'Set-Cookie': await startSession(req, user.id)}); return true;
    }
    if (['/api/account/google','/api/account/token'].includes(route) && method === 'POST') {
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (token.length < 20 || token.length > 8192) throw error('Sessão inválida', 401);
      const verified = await auth('user', null, token);
      if (!verified.email_confirmed_at || (route.endsWith('/google') && !verified.identities?.some(identity => identity.provider === 'google'))) throw error('Use uma conta com e-mail confirmado.', 403);
      const user = await saveProfile(verified);
      send(res, 200, {user}, {'Set-Cookie': await startSession(req, user.id)}); return true;
    }
    if (route === '/api/account/session' && method === 'GET') {
      const user = await currentUser(req); send(res, 200, {authenticated: !!user, user}); return true;
    }
    if (route === '/api/account/logout' && method === 'POST') {send(res, 200, {ok: true}, {'Set-Cookie': await endSession(req)}); return true;}
    if (route === '/api/products' && method === 'GET') {send(res, 200, (await products('&ativo=eq.true')).map(publicProduct)); return true;}
    if (route === '/api/admin/session' && method === 'GET') {send(res, 200, {authenticated: !!await isAdmin(req), signedIn: !!await currentUser(req), stripeReady, webhookReady}); return true;}
    if (route === '/api/admin/login' && method === 'POST') throw error('Entre com a conta Google autorizada.', 405);
    if (route === '/api/admin/logout' && method === 'POST') {send(res, 200, {ok: true}, {'Set-Cookie': await endSession(req)}); return true;}
    if (route === '/api/admin/products' && method === 'GET') {await requireAdmin(req); send(res, 200, (await products()).map(publicProduct)); return true;}
    if (['/api/admin/products','/api/admin/products/import'].includes(route) && method === 'POST') {
      await requireAdmin(req);
      const fromDrive=route.endsWith('/import');
      const meta = fromDrive?json(await body(req)):json(Buffer.from(decodeURIComponent(String(req.headers['x-product-meta'] || '%7B%7D')))), price = Math.round(Number(meta.price) * 100);
      if (!meta.title || !meta.level || !meta.subject || !Number.isSafeInteger(price) || price < 0 || price > 10000000) throw error('Preencha os dados e informe um preço válido.', 400);
      if(fromDrive&&!/^[A-Za-z0-9_-]{20,100}$/.test(meta.driveId||''))throw error('Link do Google Drive inválido.',400);
      const id=fromDrive?crypto.createHash('sha256').update('pequenos-drive:'+meta.driveId).digest('hex').slice(0,32).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,'$1-$2-$3-$4-$5'):crypto.randomUUID();
      if(fromDrive){const existing=(await products(`&id=eq.${id}`))[0];if(existing){send(res,200,publicProduct(existing));return true;}}
      if (!fromDrive&&req.headers['content-type'] !== 'application/pdf') throw error('Envie um arquivo PDF.', 400);
      const file = fromDrive?await require('./drive-import.cjs')(meta.driveId):await body(req, 30 * 1024 * 1024);
      if (file.subarray(0, 5).toString() !== '%PDF-') throw error('Arquivo PDF inválido.', 400);
      let rendered;
      try {rendered = await renderPdfPreviews(file);} catch {throw error('Não foi possível ler este PDF.', 400);}
      const previews = [];
      await storage(`${id}.pdf`, 'POST', file,fromDrive);
      for (let index = 0; index < rendered.previews.length; index++) previews.push(await storePreview(id, index, rendered.previews[index]));
      const row = {id, titulo: String(meta.title).trim().slice(0, 100), descricao: String(meta.description || '').slice(0, 300),
        preco_centavos: price, nivel: String(meta.level).slice(0, 60), tema: String(meta.subject).slice(0, 60), ano: String(meta.grade || '').slice(0, 40),
        pdf_path: `${id}.pdf`, capa_url:previews[0]||null, preview_urls: previews, page_count: rendered.pageCount, ativo: true};
      if(ensureStripeProduct)Object.assign(row,await ensureStripeProduct({id,title:row.titulo,description:row.descricao,price},fromDrive?meta.driveId:null));
      const saved = await rest('products', {method: 'POST', data: row, prefer: 'return=representation'});
      send(res, 201, publicProduct(product(saved[0]))); return true;
    }
    const adminProduct = route.match(/^\/api\/admin\/products\/([a-f0-9-]+)(\/file)?$/);
    if (adminProduct && (method === 'DELETE' || method === 'GET' && adminProduct[2])) {
      await requireAdmin(req);
      const material = (await products(`&id=eq.${adminProduct[1]}`))[0];
      if (!material) throw error('Produto não encontrado.', 404);
      if (method === 'GET') await download(res, material);
      else {await rest(`products?id=eq.${material.id}`, {method: 'PATCH', data: {ativo: false}}); send(res, 200, {ok: true});}
      return true;
    }
    if (route === '/api/admin/orders' && method === 'GET') {await requireAdmin(req); send(res, 200, await orders()); return true;}
    if (route === '/api/checkout' && method === 'POST') {
      const user = await requireUser(req);
      if (!stripeReady) throw error('Pagamento Stripe ainda não configurado.', 503);
      const input = json(await body(req));
      if (!Array.isArray(input.productIds) || !input.productIds.length || input.productIds.length > 20 || input.productIds.some(id => !/^[a-f0-9-]{36}$/.test(id))) throw error('Escolha de 1 a 20 produtos.', 400);
      const ids = [...new Set(input.productIds)], catalog = await products('&ativo=eq.true'), items = ids.map(id => catalog.find(p => p.id === id));
      if (items.some(p => !p)) throw error('Produto indisponível.', 400);
      const owned = await rest(`purchases?user_id=eq.${user.id}&status=in.(paid,manual)&select=product_id`);
      if (owned.some(p => ids.includes(p.product_id))) throw error('Você já tem um desses materiais na sua biblioteca.', 409);
      const checkout = {id: crypto.randomUUID(), userId: user.id, email: user.email,
        items: items.map(p => ({id: p.id, title: p.title, price: p.price})), total: items.reduce((sum, p) => sum + p.price, 0)};
      await rest('store_orders', {method: 'POST', data: {id: checkout.id, user_id: user.id, email: user.email, items: checkout.items, total: checkout.total}});
      const session = await stripeSession(checkout, items, req);
      await rest(`store_orders?id=eq.${checkout.id}&stripe_session_id=is.null`, {method: 'PATCH', data: {stripe_session_id: session.id}});
      send(res, 200, {url: session.url}); return true;
    }
    if (route === '/api/stripe/webhook' && method === 'POST') {
      const raw = await body(req, 1024 * 1024);
      if (!verifiedWebhook(raw, req.headers['stripe-signature'])) throw error('Assinatura inválida.', 400);
      const event = json(raw);
      if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
        const session = event.data.object;
        if (session.payment_status === 'paid' && !await markPaid(session)) throw error('Pedido não corresponde ao pagamento.', 409);
      }
      send(res, 200, {received: true}); return true;
    }
    if (route === '/api/account/library' && method === 'GET') {
      const user = await requireUser(req);
      let list = await orders(`&user_id=eq.${user.id}`);
      if (stripeReady) for (const pending of list.filter(o => o.status === 'pendente' && o.session).slice(0, 5)) {
        try {await markPaid(await stripeStatus(pending.session));} catch (err) {console.error('Payment refresh failed:', err.message);}
      }
      list = await orders(`&user_id=eq.${user.id}`);
      const rights = await rest(`purchases?user_id=eq.${user.id}&status=in.(paid,manual)&select=product_id`), catalog = await products();
      send(res, 200, {orders: list.filter(o => o.status !== 'cancelado').map(o => ({id: o.id, status: o.status, created: o.created, paidAt: o.paidAt, total: o.total,
        items: o.items.map(item => ({...item, available: o.status === 'pago' && rights.some(p => p.product_id === item.id) && !!catalog.find(p => p.id === item.id)?.pdfPath}))}))});
      return true;
    }
    const ownedFile = route.match(/^\/api\/account\/download\/([a-f0-9-]+)\/([a-f0-9-]+)$/);
    if (ownedFile && method === 'GET') {
      const user = await requireUser(req), list = await orders(`&id=eq.${ownedFile[1]}&user_id=eq.${user.id}&status=eq.pago`);
      if (!list[0]?.items.some(p => p.id === ownedFile[2])) throw error('Este material não está disponível na sua conta.', 403);
      const rights = await rest(`purchases?user_id=eq.${user.id}&product_id=eq.${ownedFile[2]}&status=in.(paid,manual)&select=id`);
      if (!rights.length) throw error('Este material não está disponível na sua conta.', 403);
      const material = (await products(`&id=eq.${ownedFile[2]}`))[0];
      if (!material) throw error('Arquivo indisponível.', 404);
      await download(res, material); return true;
    }
    const freeFile = route.match(/^\/api\/products\/([a-f0-9-]+)\/download$/);
    if (freeFile && method === 'GET') {
      const material = (await products(`&id=eq.${freeFile[1]}&ativo=eq.true`))[0];
      if (!material) throw error('Material não encontrado.', 404);
      if (material.price !== 0) throw error('Este material precisa ser comprado.', 403);
      await download(res, material); return true;
    }
    // Legacy access-token download URLs cannot bypass account ownership.
    if (route.startsWith('/api/orders/')) {throw error('Entre na sua biblioteca para acessar a compra.', 403);}
    return false;
  };
};
