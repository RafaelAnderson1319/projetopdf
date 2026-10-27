const $=selector=>document.querySelector(selector);
const safe=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
const date=value=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(value));
const api=async(url,options={})=>{const response=await fetch(url,options),data=await response.json();if(!response.ok)throw new Error(data.error||'Erro na solicitação');return data};
const params=new URLSearchParams(location.search);
let libraryRefresh,libraryRefreshCount=0;

function selectTab(tab){const login=tab==='login';$('#login-tab').classList.toggle('active',login);$('#register-tab').classList.toggle('active',!login);$('#login-tab').setAttribute('aria-selected',String(login));$('#register-tab').setAttribute('aria-selected',String(!login));$('#login-form').hidden=!login;$('#register-form').hidden=login;(login?$('#login-form input'):$('#register-form input')).focus()}
function setBusy(form,busy){const button=form.querySelector('button[type=submit]');button.disabled=busy;button.textContent=busy?'Aguarde...':form.id==='login-form'?'Entrar na minha biblioteca':'Criar conta'}
function afterAuthentication(){if(params.get('retorno')==='checkout'){location.assign('/?abrirCarrinho=1');return}showLibrary()}
async function submitAuth(form,endpoint,statusId){const status=$(statusId);status.textContent='';setBusy(form,true);try{const values=Object.fromEntries(new FormData(form));const result=await api(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)});form.reset();if(result.requiresEmailConfirmation){status.textContent='Confira seu e-mail para confirmar a conta. Depois, entre na sua biblioteca.';return}await afterAuthentication()}catch(error){status.textContent=error.message}finally{setBusy(form,false)}}
function activeAuthStatus(){return $('#login-form').hidden?$('#register-status'):$('#login-status')}
async function startGoogleLogin(){const button=$('#google-login'),status=activeAuthStatus();status.textContent='';button.disabled=true;try{const config=await api('/api/account/google/config');if(!config.enabled)throw new Error('Login Google ainda não configurado. Configure o Supabase e ative o provedor Google.');location.assign('/auth/google')}catch(error){status.textContent=error.message;button.disabled=false}}
async function finishGoogleLogin(){const hash=new URLSearchParams(location.hash.slice(1)),accessToken=hash.get('access_token'),oauthError=hash.get('error_description')||hash.get('error');if(oauthError){history.replaceState(null,'',location.pathname+location.search);throw new Error(oauthError.replaceAll('+',' '))}if(!accessToken)return false;history.replaceState(null,'',location.pathname+location.search);$('#login-status').textContent='Conectando sua conta...';await api('/api/account/token',{method:'POST',headers:{Authorization:`Bearer ${accessToken}`}});await afterAuthentication();return true}
async function showLibrary(){
  clearTimeout(libraryRefresh);
  const session=await api('/api/account/session');
  if(!session.authenticated){$('#auth-view').hidden=false;$('#library-view').hidden=true;return}
  $('#auth-view').hidden=true;$('#library-view').hidden=false;$('#welcome-name').textContent=`Olá, ${session.user.name.split(' ')[0]}`;
  if(params.get('pagamento')==='sucesso'){$('#payment-notice').hidden=false;localStorage.removeItem('pequenos-cart');localStorage.removeItem('wonderlearn-cart')}
  const {orders}=await api('/api/account/library'),paid=orders.filter(order=>order.status==='pago'),pending=orders.filter(order=>order.status!=='pago');
  if(params.get('pagamento')==='sucesso'&&!pending.length&&paid.length){$('#payment-notice strong').textContent='Pagamento confirmado.';$('#payment-notice span').textContent='Seus materiais estão disponíveis para baixar abaixo.'}
  const available=paid.reduce((total,order)=>total+order.items.filter(item=>item.available).length,0);$('#material-total').textContent=available;
  const list=$('#library-list'),empty=$('#library-empty');empty.hidden=orders.length>0;
  const pendingHtml=pending.map(order=>`<article class="order-group pending"><header><div><span>Confirmação em andamento</span><strong>Pedido ${safe(order.id.slice(0,8))}</strong></div><time>${date(order.created)}</time></header><p>Assim que o pagamento for confirmado, os downloads aparecerão aqui automaticamente.</p></article>`).join('');
  const paidHtml=paid.map(order=>`<article class="order-group"><header><div><span>Compra confirmada</span><strong>${order.items.length} ${order.items.length===1?'material':'materiais'} · ${money(order.total)}</strong></div><time>${date(order.paidAt||order.created)}</time></header><div class="purchased-files">${order.items.map(item=>`<div class="purchased-file"><span class="file-type">PDF</span><div><strong>${safe(item.title)}</strong><small>Arquivo digital</small></div>${item.available?`<a class="button button-green" href="/api/account/download/${encodeURIComponent(order.id)}/${encodeURIComponent(item.id)}">Baixar PDF</a>`:'<span class="unavailable">Arquivo indisponível</span>'}</div>`).join('')}</div></article>`).join('');
  list.innerHTML=pendingHtml+paidHtml;
  if(pending.length&&libraryRefreshCount++<24)libraryRefresh=setTimeout(()=>showLibrary().catch(error=>{$('#payment-notice').hidden=false;$('#payment-notice span').textContent=error.message}),5000);
}

$('#login-tab').onclick=()=>selectTab('login');$('#register-tab').onclick=()=>selectTab('register');
$('#login-form').onsubmit=event=>{event.preventDefault();submitAuth(event.currentTarget,'/api/account/login','#login-status')};
$('#register-form').onsubmit=event=>{event.preventDefault();submitAuth(event.currentTarget,'/api/account/register','#register-status')};
$('#google-login').onclick=startGoogleLogin;
$('#logout-button').onclick=async()=>{await api('/api/account/logout',{method:'POST'});location.replace('/account')};
finishGoogleLogin().then(finished=>{if(!finished)return showLibrary()}).catch(error=>{$('#auth-view').hidden=false;$('#login-status').textContent=error.message});
