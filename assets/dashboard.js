const $=selector=>document.querySelector(selector);
const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(url,options={}){const response=await fetch(url,options),data=await response.json();if(!response.ok)throw new Error(data.error||'Erro no servidor');return data}
async function session(){const state=await api('/api/admin/session');$('#login-panel').hidden=state.authenticated;$('#dashboard').hidden=!state.authenticated;$('#logout').hidden=!state.authenticated;if(state.authenticated)await loadDashboard(state);else if(state.signedIn){$('#login-status').textContent='Esta conta não tem permissão para administrar a loja. Saia para usar outra conta.';$('#logout').hidden=false}}
async function loadDashboard(state){const [products,orders]=await Promise.all([api('/api/admin/products'),api('/api/admin/orders')]);$('#stat-products').textContent=products.filter(p=>p.active).length;$('#stat-orders').textContent=orders.length;const paid=orders.filter(o=>o.status==='pago');$('#stat-sales').textContent=paid.length;$('#stat-revenue').textContent=money(paid.reduce((sum,o)=>sum+o.total,0));const stripe=$('#stripe-state');stripe.className='stripe-state'+(state.stripeReady?' ready':'');stripe.textContent=state.stripeReady?'Stripe configurada. '+(state.webhookReady?'Webhook configurado.':'Configure o webhook para confirmar pagamentos automaticamente.'):'Stripe ainda não configurada. Os produtos ficam visíveis, mas o checkout permanece desativado até definir STRIPE_SECRET_KEY.';$('#admin-products').innerHTML=products.length?products.map(p=>`<article class="admin-item"><strong>${safe(p.title)}</strong><small>${safe(p.level)} · ${safe(p.subject)} · <span class="price">${money(p.price)}</span> ${p.active?'':'· Arquivado'}</small><div class="admin-actions"><a href="/?material=${p.id}" target="_blank" rel="noopener">Link de compra ↗</a><button data-view="${p.id}">Abrir PDF</button></div></article>`).join(''):'<p>Nenhum produto publicado.</p>';$('#admin-orders').innerHTML=orders.length?orders.map(o=>`<article class="admin-item"><strong>Pedido ${safe(o.id.slice(0,8))} <span class="status-pill ${o.status==='pago'?'paid':''}">${o.status==='pago'?'Pago':'Pendente'}</span></strong><small>${new Date(o.created).toLocaleString('pt-BR')} · ${o.items.length} ${o.items.length===1?'item':'itens'} · ${money(o.total)}</small>${o.email?`<small>Cliente: ${safe(o.email)}</small>`:''}<small>${o.items.map(x=>safe(x.title)).join(', ')}</small></article>`).join(''):'<p>Nenhum pedido ainda.</p>';$('#admin-products').querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>window.open(`/api/admin/products/${b.dataset.view}/file`,'_blank'))}
$('#logout').onclick=async()=>{await api('/api/admin/logout',{method:'POST'});await session()};
const fileInput=$('#product-file');fileInput.onchange=()=>{$('#selected-file').textContent=fileInput.files[0]?.name||'Escolher PDF'};
$('#product-form').onsubmit=async e=>{
 e.preventDefault();const form=e.currentTarget,file=fileInput.files[0],status=$('#upload-status'),button=$('#publish-button'),link=$('#drive-link').value.trim();
 let driveId;
 if(link){try{const url=new URL(link);if(url.protocol!=='https:'||url.hostname!=='drive.google.com')throw Error();driveId=url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{20,100})(?:\/|$)/)?.[1]||url.searchParams.get('id');if(!/^[A-Za-z0-9_-]{20,100}$/.test(driveId||''))throw Error();}catch{status.textContent='Informe o link de um PDF do Google Drive.';return}}
 else if(!file||file.size>4*1024*1024||!(file.type==='application/pdf'||/\.pdf$/i.test(file.name))){status.textContent='Escolha um PDF de até 4 MB ou use o link do Drive para arquivos de até 30 MB.';return}
 const data=new FormData(form),meta={title:String(data.get('title')).trim(),price:Number(data.get('price')),level:data.get('level'),subject:String(data.get('subject')).trim(),grade:String(data.get('grade')).trim(),description:String(data.get('description')).trim(),driveId};
 button.disabled=true;status.textContent='Importando arquivo, gerando prévias e configurando o pagamento...';
 try{await api(driveId?'/api/admin/products/import':'/api/admin/products',{method:'POST',headers:driveId?{'Content-Type':'application/json'}:{'Content-Type':'application/pdf','X-Product-Meta':encodeURIComponent(JSON.stringify(meta))},body:driveId?JSON.stringify(meta):file});form.reset();$('#selected-file').textContent='Escolher PDF';status.style.color='#138462';status.textContent='Produto publicado com prévias e preço configurado!';await session()}catch(error){status.style.color='#ad4b43';status.textContent=error.message}finally{button.disabled=false}
};
async function initializeDashboard(){
  const hash=new URLSearchParams(location.hash.slice(1));
  const token=hash.get('access_token'),failure=hash.get('error_description')||hash.get('error');
  if(token||failure)history.replaceState(null,'',location.pathname);
  if(failure)throw new Error(failure.replaceAll('+',' '));
  if(token)await api('/api/account/google',{method:'POST',headers:{Authorization:'Bearer '+token}});
  await session();
}
initializeDashboard().catch(error=>{$('#login-status').textContent=error.message});

