const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {createCanvas,DOMMatrix,ImageData,Path2D}=require('@napi-rs/canvas');
globalThis.DOMMatrix??=DOMMatrix;
globalThis.ImageData??=ImageData;
globalThis.Path2D??=Path2D;
// Import the worker explicitly so serverless file tracing includes it.
const pdfjsPromise=Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'),import('pdfjs-dist/legacy/build/pdf.worker.mjs')]).then(([pdfjs,worker])=>{globalThis.pdfjsWorker=worker;return pdfjs});

const ROOT=process.env.WONDERLEARN_ROOT||__dirname;
if(fs.existsSync(path.join(ROOT,'.env'))){for(const line of fs.readFileSync(path.join(ROOT,'.env'),'utf8').split(/\r?\n/)){const match=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);if(match&&process.env[match[1]]===undefined)process.env[match[1]]=match[2].replace(/^(["'])(.*)\1$/,'$2')}}
const DATA=process.env.WONDERLEARN_DATA||(process.env.VERCEL?path.join(require('node:os').tmpdir(),'pequenos-brincantes'):path.join(ROOT,'private'));
const PDF_DIR=path.join(DATA,'pdfs');
const PREVIEW_DIR=path.join(DATA,'previews');
const PRODUCTS=path.join(DATA,'products.json');
const ORDERS=path.join(DATA,'orders.json');
const USERS=path.join(DATA,'users.json');
const ADMIN_FILE=path.join(DATA,'admin.json');
fs.mkdirSync(PDF_DIR,{recursive:true});
fs.mkdirSync(PREVIEW_DIR,{recursive:true});

const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return fallback}};
const writeJson=(file,value)=>{const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value,null,2));fs.renameSync(tmp,file)};
if(!fs.existsSync(ADMIN_FILE)){const password=crypto.randomBytes(12).toString('base64url');writeJson(ADMIN_FILE,{password});if(!process.env.VERCEL)console.log('Senha inicial do administrador:',password)}

const adminPassword=process.env.WONDERLEARN_ADMIN_PASSWORD||readJson(ADMIN_FILE,{}).password;
const adminSessions=new Set();
const userSessions=new Map();
const stripeKey=process.env.STRIPE_SECRET_KEY||'';
const webhookSecret=process.env.STRIPE_WEBHOOK_SECRET||'';
const supabaseUrl=process.env.SUPABASE_URL||'';
const supabaseServiceRoleKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const supabaseAuthApiKey=process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_PUBLISHABLE_KEY||supabaseServiceRoleKey;
const assets={
  '/brand-logo-footer.png':'brand-logo-footer.png',
  '/icone-infantil.png':'icone-infantil.png','/icone-fundamental-i.png':'icone-fundamental-i.png',
  '/icone-fundamental-ii.png':'icone-fundamental-ii.png',
  '/textura_formas.png':'textura_formas.png','/textura_educativa.png':'textura_educativa.png',
  '/textura_papel.png':'textura_papel.png','/textura_rabiscos.png':'textura_rabiscos.png',
  '/':'index.html','/index.html':'index.html','/account':'account.html','/account.html':'account.html',
  '/dashboard':'dashboard.html','/dashboard.html':'dashboard.html','/style.css':'style.css','/account.css':'account.css',
  '/admin.css':'admin.css','/hero.jpg':'hero.jpg','/brand-logo.png':'brand-logo.png',
  '/assets/app.js':'assets/app.js','/assets/account.js':'assets/account.js','/assets/dashboard.js':'assets/dashboard.js',
  '/assets/twemoji/1f9e9.svg':'assets/twemoji/1f9e9.svg','/assets/twemoji/270f.svg':'assets/twemoji/270f.svg',
  '/assets/twemoji/1f52c.svg':'assets/twemoji/1f52c.svg','/assets/twemoji/1f393.svg':'assets/twemoji/1f393.svg',
  '/assets/twemoji/1f4d6.svg':'assets/twemoji/1f4d6.svg','/assets/twemoji/1f392.svg':'assets/twemoji/1f392.svg'
};
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf'};

function send(res,status,data,extra={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(JSON.stringify(data))}
function body(req,limit=1024*1024){return new Promise((resolve,reject)=>{const chunks=[];let size=0;req.on('data',chunk=>{size+=chunk.length;if(size>limit){reject(new Error('Arquivo muito grande'));req.destroy();return}chunks.push(chunk)});req.on('end',()=>resolve(Buffer.concat(chunks)));req.on('error',reject)})}
function json(raw){try{return JSON.parse(raw.toString()||'{}')}catch{const error=new Error('Dados inválidos');error.status=400;throw error}}
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(value=>value.trim().split('=')).filter(parts=>parts[0]).map(([key,...value])=>[key,decodeURIComponent(value.join('='))]))}
function safeEqual(a,b){const left=Buffer.from(String(a)),right=Buffer.from(String(b));return left.length===right.length&&crypto.timingSafeEqual(left,right)}
function secureCookie(req){return req.headers['x-forwarded-proto']==='https'||req.socket.encrypted?' Secure;':''}
function sessionCookie(req,name,value,maxAge=60*60*24*30){return `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge};${secureCookie(req)}`}
function adminAuthenticated(req){return adminSessions.has(cookies(req).wonder_admin)}
function currentUser(req){const id=userSessions.get(cookies(req).pequenos_session);return id?users().find(user=>user.id===id)||null:null}
function requireAdmin(req,res){if(adminAuthenticated(req))return true;send(res,401,{error:'Acesso do administrador necessário'});return false}
function requireUser(req,res){const user=currentUser(req);if(user)return user;send(res,401,{error:'Entre na sua conta para continuar'});return null}
function publicUser(user){return{id:user.id,name:user.name,email:user.email}}
function publicProduct(p){return{id:p.id,title:p.title,level:p.level,subject:p.subject,grade:p.grade,description:p.description,price:p.price,created:p.created,active:p.active!==false,previewUrls:Array.isArray(p.previewUrls)?p.previewUrls:[],pageCount:Number(p.pageCount)||0}}
function products(){return readJson(PRODUCTS,[])}
function orders(){return readJson(ORDERS,[])}
function users(){return readJson(USERS,[])}
function origin(req){return process.env.PUBLIC_BASE_URL||`http://${req.headers.host||'localhost:3000'}`}
function passwordHash(password,salt){return crypto.scryptSync(password,salt,64).toString('hex')}
function normalizeEmail(value){return String(value||'').trim().toLowerCase()}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&value.length<=160}
function startUserSession(req,user){const token=crypto.randomBytes(32).toString('base64url');userSessions.set(token,user.id);return sessionCookie(req,'pequenos_session',token)}

async function stripeSession(order,items,req){
  const params=new URLSearchParams();
  params.set('mode','payment');
  params.set('success_url',`${origin(req)}/account?pagamento=sucesso&session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url',`${origin(req)}/?pagamento=cancelado`);
  params.set('locale','pt-BR');
  params.set('customer_email',order.email);
  params.set('metadata[order_id]',order.id);
  params.set('metadata[user_id]',order.userId);
  items.forEach((p,i)=>{if(p.stripePriceId)params.set(`line_items[${i}][price]`,p.stripePriceId);else{params.set(`line_items[${i}][price_data][currency]`,'brl');params.set(`line_items[${i}][price_data][unit_amount]`,String(p.price));params.set(`line_items[${i}][price_data][product_data][name]`,p.title)}params.set(`line_items[${i}][quantity]`,'1')});
  const response=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${stripeKey}`,'Content-Type':'application/x-www-form-urlencoded'},body:params});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error?.message||'Falha ao criar pagamento');
  return data;
}
async function stripeStatus(id){const response=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${stripeKey}`}});if(!response.ok)throw new Error('Falha ao conferir pagamento');return response.json()}
async function ensureStripeProduct(material,sourceId){
  if(!stripeKey)return {};
  const id=sourceId?`pb_drive_${sourceId}`:`pb_store_${material.id}`;
  const headers={Authorization:`Bearer ${stripeKey}`};
  let response=await fetch(`https://api.stripe.com/v1/products/${encodeURIComponent(id)}`,{headers});
  let product=await response.json();
  if(response.status===404){
    const params=new URLSearchParams({id,name:material.title,description:material.description,'default_price_data[currency]':'brl','default_price_data[unit_amount]':String(material.price)});
    response=await fetch('https://api.stripe.com/v1/products',{method:'POST',headers:{...headers,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':`catalog-${id}-${material.price}`},body:params});product=await response.json();
  }
  if(!response.ok||!product.active||!product.default_price)throw new Error('Não foi possível cadastrar o produto na Stripe.');
  const priceResponse=await fetch(`https://api.stripe.com/v1/prices/${encodeURIComponent(product.default_price)}`,{headers}),price=await priceResponse.json();
  if(!priceResponse.ok||!price.active||price.currency!=='brl'||price.unit_amount!==material.price||price.type!=='one_time')throw new Error('O preço da Stripe não corresponde ao preço do PDF.');
  return {stripe_product_id:product.id,stripe_price_id:price.id};
}
function verifiedWebhook(raw,header){if(!webhookSecret||!header)return false;const parts=Object.fromEntries(header.split(',').map(part=>part.split('=')));const timestamp=Number(parts.t);if(!timestamp||Math.abs(Date.now()/1000-timestamp)>300)return false;const expected=crypto.createHmac('sha256',webhookSecret).update(`${parts.t}.${raw.toString('utf8')}`).digest('hex');return safeEqual(expected,parts.v1||'')}
function markPaid(orderId,session){const list=orders(),order=list.find(item=>item.id===orderId);if(!order||order.session!==session.id||session.payment_status!=='paid')return false;if(order.status!=='pago'){order.status='pago';order.paidAt=Date.now();writeJson(ORDERS,list)}return true}
async function refreshUserOrders(userId){if(!stripeKey)return;const pending=orders().filter(order=>order.userId===userId&&order.status!=='pago'&&order.session).slice(0,5);for(const order of pending){try{markPaid(order.id,await stripeStatus(order.session))}catch{}}}

async function renderPdfPreviews(file){
  const pdfjs=await pdfjsPromise;
  const loadingTask=pdfjs.getDocument({data:new Uint8Array(file),isEvalSupported:false,enableXfa:false,useWorkerFetch:false});
  const pdf=await loadingTask.promise;
  const pageCount=pdf.numPages;
  const previews=[],width=450,height=600;
  for(let number=1;number<=Math.min(pdf.numPages,3);number++){
    const page=await pdf.getPage(number),base=page.getViewport({scale:1}),scale=Math.min(width/base.width,height/base.height),viewport=page.getViewport({scale});
    const pageCanvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
    await page.render({canvasContext:pageCanvas.getContext('2d'),viewport}).promise;
    const canvas=createCanvas(width,height),context=canvas.getContext('2d');
    context.fillStyle='#fff';context.fillRect(0,0,width,height);
    context.drawImage(pageCanvas,(width-viewport.width)/2,(height-viewport.height)/2,viewport.width,viewport.height);
    context.save();context.translate(width/2,height/2);context.rotate(-Math.PI/4);context.textAlign='center';context.textBaseline='middle';context.font='bold 58px Arial';context.fillStyle='rgba(7,84,152,.22)';context.fillText('PRÉVIA',0,0);context.restore();
    previews.push(canvas.toBuffer('image/webp',78));page.cleanup();
  }
  await loadingTask.destroy();
  return{pageCount,previews};
}
async function storePreview(productId,index,image){
  if(supabaseUrl&&supabaseServiceRoleKey){
    const base=supabaseUrl.replace(/\/$/,''),objectPath=`${productId}/${index+1}.webp`,endpoint=`${base}/storage/v1/object/pdf-previews/${objectPath}`;
    const response=await fetch(endpoint,{method:'POST',headers:{apikey:supabaseServiceRoleKey,Authorization:`Bearer ${supabaseServiceRoleKey}`,'Content-Type':'image/webp','x-upsert':'true'},body:image});
    if(!response.ok)throw new Error(`Supabase Storage recusou uma prévia (${response.status})`);
    return`${base}/storage/v1/object/public/pdf-previews/${objectPath}`;
  }
  const directory=path.join(PREVIEW_DIR,productId);fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,`${index+1}.webp`),image);
  return`/api/previews/${productId}/${index+1}.webp`;
}
async function syncMaterial(product){
  if(!supabaseUrl||!supabaseServiceRoleKey)return;
  const endpoint=`${supabaseUrl.replace(/\/$/,'')}/rest/v1/materials?on_conflict=id`;
  const row={id:product.id,title:product.title,level:product.level,subject:product.subject,grade:product.grade,description:product.description,price:product.price,created_at:new Date(product.created).toISOString(),active:product.active,preview_urls:product.previewUrls,page_count:product.pageCount};
  const response=await fetch(endpoint,{method:'POST',headers:{apikey:supabaseServiceRoleKey,Authorization:`Bearer ${supabaseServiceRoleKey}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(row)});
  if(!response.ok)throw new Error(`Supabase não salvou o material (${response.status}): ${await response.text()}`);
}
async function archiveRemoteMaterial(id){if(!supabaseUrl||!supabaseServiceRoleKey)return;const endpoint=`${supabaseUrl.replace(/\/$/,'')}/rest/v1/materials?id=eq.${encodeURIComponent(id)}`;const response=await fetch(endpoint,{method:'PATCH',headers:{apikey:supabaseServiceRoleKey,Authorization:`Bearer ${supabaseServiceRoleKey}`,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({active:false})});if(!response.ok)throw new Error(`Supabase não atualizou o material (${response.status})`)}
async function removeStoredPreviews(id,count){if(!supabaseUrl||!supabaseServiceRoleKey)return;for(let index=0;index<count;index++){const endpoint=`${supabaseUrl.replace(/\/$/,'')}/storage/v1/object/pdf-previews/${id}/${index+1}.webp`;try{await fetch(endpoint,{method:'DELETE',headers:{apikey:supabaseServiceRoleKey,Authorization:`Bearer ${supabaseServiceRoleKey}`}})}catch{}}}
async function googleProviderEnabled(){if(!supabaseUrl||!supabaseAuthApiKey)return false;try{const response=await fetch(`${supabaseUrl.replace(/\/$/,'')}/auth/v1/settings`,{headers:{apikey:supabaseAuthApiKey}});if(!response.ok)return false;const settings=await response.json();return settings.external?.google===true}catch{return false}}

const cloudStore=supabaseUrl&&supabaseServiceRoleKey?require('./cloud-store.cjs')({
  base:supabaseUrl.replace(/\/$/,''),secret:supabaseServiceRoleKey,authKey:supabaseAuthApiKey,
  send,body,json,cookies,sessionCookie,publicProduct,renderPdfPreviews,storePreview,
  stripeSession,stripeStatus,ensureStripeProduct,verifiedWebhook,stripeReady:!!stripeKey,webhookReady:!!webhookSecret,
  adminPassword:process.env.WONDERLEARN_ADMIN_PASSWORD||'',safeEqual,publicBase:(process.env.PUBLIC_BASE_URL||'http://localhost:3000').replace(/\/$/,'')
}):null;

async function handleRequest(req,res){try{
  const url=new URL(req.url,origin(req)),route=url.pathname,method=req.method;
  if(['/admin','/admin.html','/assets/admin.js'].includes(route))return send(res,404,{error:'Não encontrado'});
  if(process.env.VERCEL&&!cloudStore&&(route.startsWith('/api/')||route.startsWith('/auth/')))return send(res,503,{error:'Configure as variáveis do Supabase no servidor para ativar a loja.'});
  if(cloudStore&&await cloudStore(req,res,route,method))return;
  if(route==='/api/account/google/config'&&method==='GET')return send(res,200,{enabled:await googleProviderEnabled()});
  if(route==='/auth/google'&&method==='GET'){
    if(!await googleProviderEnabled())return send(res,503,{error:'O provedor Google ainda não está ativado no Supabase.'});
    const authorization=new URL('/auth/v1/authorize',supabaseUrl);authorization.searchParams.set('provider','google');authorization.searchParams.set('redirect_to',`${origin(req)}/${url.searchParams.get('retorno')==='dashboard'?'dashboard':'account'}`);authorization.searchParams.set('flow_type','implicit');
    res.writeHead(302,{Location:authorization.toString(),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});return res.end();
  }
  if(['/api/account/google','/api/account/token'].includes(route)&&method==='POST'){
    if(!supabaseUrl||!supabaseAuthApiKey)return send(res,503,{error:'Login Google ainda não configurado.'});
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(token.length<20||token.length>8192)return send(res,401,{error:'Sessão Google inválida'});
    let response;try{response=await fetch(`${supabaseUrl.replace(/\/$/,'')}/auth/v1/user`,{headers:{apikey:supabaseAuthApiKey,Authorization:`Bearer ${token}`}})}catch{return send(res,502,{error:'Não foi possível validar sua conta Google.'})}
    if(!response.ok)return send(res,401,{error:'Não foi possível validar sua conta Google'});
    const profile=await response.json(),email=normalizeEmail(profile.email||''),provider=profile.app_metadata?.provider;
    const googleIdentity=Array.isArray(profile.identities)&&profile.identities.some(identity=>identity.provider==='google');
    if(!validEmail(email)||(!googleIdentity&&provider!=='google')||!(profile.email_confirmed_at||profile.confirmed_at))return send(res,403,{error:'Use uma conta Google com e-mail confirmado.'});
    const list=users();let user=list.find(item=>item.email===email);
    if(!user){const salt=crypto.randomBytes(16).toString('hex'),randomPassword=crypto.randomBytes(32).toString('base64url');user={id:crypto.randomUUID(),name:String(profile.user_metadata?.full_name||profile.user_metadata?.name||email.split('@')[0]).trim().slice(0,80),email,salt,passwordHash:passwordHash(randomPassword,salt),authProvider:'google',created:Date.now()};list.push(user);writeJson(USERS,list)}
    return send(res,200,{user:publicUser(user)},{'Set-Cookie':startUserSession(req,user)});
  }
  if(route==='/api/admin/products'&&method==='POST'){
    if(!requireAdmin(req,res))return;
    const meta=json(Buffer.from(decodeURIComponent(String(req.headers['x-product-meta']||'%7B%7D')))),price=Math.round(Number(meta.price)*100);
    if(!meta.title||!meta.level||!meta.subject||!Number.isSafeInteger(price)||price<0||price>10000000)return send(res,400,{error:'Preencha os dados e informe um preço válido'});
    if(req.headers['content-type']!=='application/pdf')return send(res,400,{error:'Envie um arquivo PDF'});
    const file=await body(req,30*1024*1024);if(file.subarray(0,5).toString()!=='%PDF-')return send(res,400,{error:'Arquivo PDF inválido'});
    let rendered;try{rendered=await renderPdfPreviews(file)}catch(error){console.error('PDF preview rendering failed:',error);return send(res,400,{error:'Não foi possível ler este PDF para criar as prévias.'})}
    const id=crypto.randomUUID(),product={id,title:String(meta.title).trim().slice(0,100),level:String(meta.level).slice(0,60),subject:String(meta.subject).trim().slice(0,60),grade:String(meta.grade||'').trim().slice(0,40),description:String(meta.description||'').trim().slice(0,300),price,created:Date.now(),active:true,previewUrls:[],pageCount:rendered.pageCount};
    try{
      for(let index=0;index<rendered.previews.length;index++)product.previewUrls.push(await storePreview(id,index,rendered.previews[index]));
      await syncMaterial(product);
      fs.writeFileSync(path.join(PDF_DIR,id+'.pdf'),file);
      const list=products();list.unshift(product);writeJson(PRODUCTS,list);
      return send(res,201,publicProduct(product));
    }catch(error){console.error('Product publish failed:',error);await removeStoredPreviews(id,product.previewUrls.length);fs.rmSync(path.join(PREVIEW_DIR,id),{recursive:true,force:true});return send(res,502,{error:'Não foi possível salvar o material e as prévias. Confira a configuração do Supabase e tente novamente.'})}
  }
  if(method==='GET'&&assets[route]){const file=path.join(ROOT,assets[route]);res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':route.endsWith('.png')?'public, max-age=86400':'no-cache','X-Content-Type-Options':'nosniff'});return fs.createReadStream(file).pipe(res)}
  if(route==='/api/config'&&method==='GET'){const user=currentUser(req);return send(res,200,{stripeReady:!!stripeKey,user:user?publicUser(user):null})}
  if(route==='/api/products'&&method==='GET')return send(res,200,products().filter(p=>p.active!==false).map(publicProduct));
  const previewFile=route.match(/^\/api\/previews\/([a-f0-9-]+)\/([1-3])\.webp$/);if(previewFile&&method==='GET'){const product=products().find(item=>item.id===previewFile[1]);if(!product)return send(res,404,{error:'Prévia não encontrada'});const file=path.join(PREVIEW_DIR,previewFile[1],`${previewFile[2]}.webp`);if(!fs.existsSync(file))return send(res,404,{error:'Prévia não encontrada'});res.writeHead(200,{'Content-Type':'image/webp','Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'});return fs.createReadStream(file).pipe(res)}
  const freeProduct=route.match(/^\/api\/products\/([a-f0-9-]+)\/download$/);if(freeProduct&&method==='GET'){const product=products().find(item=>item.id===freeProduct[1]&&item.active!==false);if(!product)return send(res,404,{error:'Material não encontrado'});if(Number(product.price)!==0)return send(res,403,{error:'Este material precisa ser comprado'});const file=path.join(PDF_DIR,product.id+'.pdf');if(!fs.existsSync(file))return send(res,404,{error:'Arquivo indisponível'});res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${product.id}.pdf"`,'X-Content-Type-Options':'nosniff'});return fs.createReadStream(file).pipe(res)}
  const archiveMatch=route.match(/^\/api\/admin\/products\/([a-f0-9-]+)$/);if(archiveMatch&&method==='DELETE'){if(!requireAdmin(req,res))return;const list=products(),product=list.find(item=>item.id===archiveMatch[1]);if(!product)return send(res,404,{error:'Produto não encontrado'});try{await archiveRemoteMaterial(product.id)}catch(error){console.error(error);return send(res,502,{error:'Não foi possível atualizar o catálogo do Supabase.'})}product.active=false;writeJson(PRODUCTS,list);return send(res,200,{ok:true})}
  if(route==='/api/theme-alerts'&&method==='POST'){
    const input=json(await body(req,4096)),theme=String(input.theme||'').trim(),contact=String(input.contact||'').trim();
    const email=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)&&contact.length<=160;
    const phone=/^[+\d().\s-]+$/.test(contact)&&contact.replace(/\D/g,'').length>=10&&contact.replace(/\D/g,'').length<=15;
    if(theme.length<2||theme.length>80)return send(res,400,{error:'Tema inválido'});
    if(!email&&!phone)return send(res,400,{error:'Informe um e-mail válido ou um número de WhatsApp com DDD'});
    if(!supabaseUrl||!supabaseServiceRoleKey)return send(res,503,{error:'Os avisos ainda não estão configurados. Tente novamente mais tarde.'});
    let endpoint;try{endpoint=new URL('/rest/v1/theme_alerts',supabaseUrl)}catch{return send(res,503,{error:'Os avisos ainda não estão configurados.'})}
    try{const response=await fetch(endpoint,{method:'POST',headers:{apikey:supabaseServiceRoleKey,Authorization:`Bearer ${supabaseServiceRoleKey}`,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({theme,contact,created_at:new Date().toISOString()})});if(!response.ok){console.error('Supabase theme_alerts rejected insert:',response.status,await response.text());return send(res,502,{error:'Não foi possível salvar seu contato agora. Tente novamente.'})}}catch(error){console.error('Supabase theme_alerts request failed:',error);return send(res,502,{error:'Não foi possível salvar seu contato agora. Tente novamente.'})}
    return send(res,201,{ok:true});
  }

  if(route==='/api/account/register'&&method==='POST'){
    const input=json(await body(req)),name=String(input.name||'').trim().replace(/\s+/g,' '),email=normalizeEmail(input.email),password=String(input.password||'');
    if(name.length<2||name.length>80)return send(res,400,{error:'Informe seu nome completo'});
    if(!validEmail(email))return send(res,400,{error:'Informe um e-mail válido'});
    if(password.length<8||password.length>128)return send(res,400,{error:'A senha deve ter entre 8 e 128 caracteres'});
    const list=users();if(list.some(user=>user.email===email))return send(res,409,{error:'Já existe uma conta com este e-mail'});
    const salt=crypto.randomBytes(16).toString('hex'),user={id:crypto.randomUUID(),name,email,salt,passwordHash:passwordHash(password,salt),created:Date.now()};
    list.push(user);writeJson(USERS,list);
    return send(res,201,{user:publicUser(user)},{'Set-Cookie':startUserSession(req,user)});
  }
  if(route==='/api/account/login'&&method==='POST'){
    const input=json(await body(req)),email=normalizeEmail(input.email),password=String(input.password||'');if(password.length>128)return send(res,401,{error:'E-mail ou senha incorretos'});const user=users().find(item=>item.email===email);
    if(!user||!safeEqual(passwordHash(password,user.salt),user.passwordHash))return send(res,401,{error:'E-mail ou senha incorretos'});
    return send(res,200,{user:publicUser(user)},{'Set-Cookie':startUserSession(req,user)});
  }
  if(route==='/api/account/session'&&method==='GET'){const user=currentUser(req);return send(res,200,{authenticated:!!user,user:user?publicUser(user):null})}
  if(route==='/api/account/logout'&&method==='POST'){userSessions.delete(cookies(req).pequenos_session);return send(res,200,{ok:true},{'Set-Cookie':sessionCookie(req,'pequenos_session','',0)})}
  if(route==='/api/account/library'&&method==='GET'){
    const user=requireUser(req,res);if(!user)return;
    await refreshUserOrders(user.id);
    const list=orders().filter(order=>order.userId===user.id).map(order=>({id:order.id,status:order.status,created:order.created,paidAt:order.paidAt||null,total:order.total,items:order.items.map(item=>({...item,available:fs.existsSync(path.join(PDF_DIR,item.id+'.pdf'))}))}));
    return send(res,200,{orders:list});
  }
  const accountDownload=route.match(/^\/api\/account\/download\/([a-f0-9-]+)\/([a-f0-9-]+)$/);
  if(accountDownload&&method==='GET'){
    const user=requireUser(req,res);if(!user)return;
    const order=orders().find(item=>item.id===accountDownload[1]&&item.userId===user.id&&item.status==='pago'&&item.items.some(product=>product.id===accountDownload[2]));
    if(!order)return send(res,403,{error:'Este material não está disponível na sua conta'});
    const file=path.join(PDF_DIR,accountDownload[2]+'.pdf');if(!fs.existsSync(file))return send(res,404,{error:'Arquivo indisponível'});
    res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="material-${accountDownload[2]}.pdf"`,'X-Content-Type-Options':'nosniff'});return fs.createReadStream(file).pipe(res);
  }

  if(route==='/api/admin/session'&&method==='GET')return send(res,200,{authenticated:adminAuthenticated(req),stripeReady:!!stripeKey,webhookReady:!!webhookSecret});
  if(route==='/api/admin/login'&&method==='POST'){const data=json(await body(req));if(!safeEqual(data.password||'',adminPassword))return send(res,401,{error:'Senha incorreta'});const token=crypto.randomBytes(32).toString('hex');adminSessions.add(token);return send(res,200,{ok:true},{'Set-Cookie':sessionCookie(req,'wonder_admin',token)})}
  if(route==='/api/admin/logout'&&method==='POST'){adminSessions.delete(cookies(req).wonder_admin);return send(res,200,{ok:true},{'Set-Cookie':sessionCookie(req,'wonder_admin','',0)})}
  if(route==='/api/admin/products'&&method==='GET'){if(!requireAdmin(req,res))return;return send(res,200,products().map(publicProduct))}
  if(route==='/api/admin/products'&&method==='POST'){if(!requireAdmin(req,res))return;const meta=json(Buffer.from(decodeURIComponent(String(req.headers['x-product-meta']||'%7B%7D'))));const price=Math.round(Number(meta.price)*100);if(!meta.title||!meta.level||!meta.subject||!Number.isSafeInteger(price)||price<100||price>10000000)return send(res,400,{error:'Preencha os dados e informe um preço válido'});if(req.headers['content-type']!=='application/pdf')return send(res,400,{error:'Envie um arquivo PDF'});const file=await body(req,30*1024*1024);if(file.subarray(0,5).toString()!=='%PDF-')return send(res,400,{error:'Arquivo PDF inválido'});const id=crypto.randomUUID();fs.writeFileSync(path.join(PDF_DIR,id+'.pdf'),file);const product={id,title:String(meta.title).slice(0,100),level:String(meta.level).slice(0,60),subject:String(meta.subject).slice(0,60),grade:String(meta.grade||'').slice(0,40),description:String(meta.description||'').slice(0,300),price,created:Date.now(),active:true};const list=products();list.unshift(product);writeJson(PRODUCTS,list);return send(res,201,publicProduct(product))}
  const productFile=route.match(/^\/api\/admin\/products\/([a-f0-9-]+)\/file$/);if(productFile&&method==='GET'){if(!requireAdmin(req,res))return;const p=products().find(item=>item.id===productFile[1]);if(!p)return send(res,404,{error:'Produto não encontrado'});res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${p.id}.pdf"`});return fs.createReadStream(path.join(PDF_DIR,p.id+'.pdf')).pipe(res)}
  const productDelete=route.match(/^\/api\/admin\/products\/([a-f0-9-]+)$/);if(productDelete&&method==='DELETE'){if(!requireAdmin(req,res))return;const list=products(),p=list.find(item=>item.id===productDelete[1]);if(!p)return send(res,404,{error:'Produto não encontrado'});p.active=false;writeJson(PRODUCTS,list);return send(res,200,{ok:true})}
  if(route==='/api/admin/orders'&&method==='GET'){if(!requireAdmin(req,res))return;return send(res,200,orders().map(({access,...order})=>order))}

  if(route==='/api/checkout'&&method==='POST'){
    const user=requireUser(req,res);if(!user)return;
    if(!stripeKey)return send(res,503,{error:'Pagamento Stripe ainda não configurado'});
    const input=json(await body(req)),ids=[...new Set(input.productIds||[])];if(!ids.length||ids.length>20)return send(res,400,{error:'Escolha ao menos um produto'});
    const items=ids.map(id=>products().find(product=>product.id===id&&product.active!==false));if(items.some(item=>!item))return send(res,400,{error:'Produto indisponível'});
    const order={id:crypto.randomUUID(),userId:user.id,email:user.email,access:crypto.randomBytes(24).toString('hex'),items:items.map(item=>({id:item.id,title:item.title,price:item.price})),total:items.reduce((sum,item)=>sum+item.price,0),status:'pendente',created:Date.now()};
    const session=await stripeSession(order,items,req);order.session=session.id;const list=orders();list.unshift(order);writeJson(ORDERS,list);return send(res,200,{url:session.url});
  }
  const orderStatus=route.match(/^\/api\/orders\/([a-f0-9-]+)$/);if(orderStatus&&method==='GET'){const list=orders(),order=list.find(item=>item.id===orderStatus[1]&&item.access===url.searchParams.get('acesso'));if(!order)return send(res,404,{error:'Pedido não encontrado'});if(order.status!=='pago'&&stripeKey&&order.session){try{markPaid(order.id,await stripeStatus(order.session))}catch{}}const updated=orders().find(item=>item.id===order.id);return send(res,200,{id:updated.id,status:updated.status,items:updated.items,total:updated.total})}
  const download=route.match(/^\/api\/orders\/([a-f0-9-]+)\/download\/([a-f0-9-]+)$/);if(download&&method==='GET'){const order=orders().find(item=>item.id===download[1]&&item.access===url.searchParams.get('acesso'));if(!order||order.status!=='pago'||!order.items.some(item=>item.id===download[2]))return send(res,403,{error:'Compra não confirmada'});const file=path.join(PDF_DIR,download[2]+'.pdf');if(!fs.existsSync(file))return send(res,404,{error:'Arquivo indisponível'});res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="material-${download[2]}.pdf"`});return fs.createReadStream(file).pipe(res)}
  if(route==='/api/stripe/webhook'&&method==='POST'){const raw=await body(req,1024*1024);if(!verifiedWebhook(raw,req.headers['stripe-signature']))return send(res,400,{error:'Assinatura inválida'});const event=json(raw);if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))markPaid(event.data.object.metadata?.order_id,event.data.object);return send(res,200,{received:true})}
  return send(res,404,{error:'Não encontrado'});
}catch(error){console.error(error);if(!res.headersSent)send(res,error.status||500,{error:error.status?error.message:'Erro no servidor'})}}

const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
if(require.main===module){const server=http.createServer(handleRequest);server.listen(port,host,()=>console.log(`Pequenos Brincantes: http://${host}:${port}`))}else module.exports=handleRequest;
