const $=s=>document.querySelector(s);
const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let products=[];
let stripeReady=false;
let currentUser=null;
let cart=JSON.parse(localStorage.getItem('pequenos-cart')||localStorage.getItem('wonderlearn-cart')||'[]');
const api=async(url,options={})=>{const response=await fetch(url,options),data=await response.json();if(!response.ok){const error=new Error(data.error||'Erro na solicitação');error.status=response.status;throw error}return data};
const monthNames=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const currentMonth=new Date().getMonth();
const currentYear=new Date().getFullYear();
let seasonalMonth=currentMonth;
const iconPaths={
  book:'<path d="M12 7v14"/><path d="M3 18V5a2 2 0 0 1 2-2h3a4 4 0 0 1 4 4 4 4 0 0 1 4-4h3a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1h-4a4 4 0 0 0-4 2 4 4 0 0 0-4-2H4a1 1 0 0 1-1-1Z"/>',
  calendar:'<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
  leaf:'<path d="M11 20A7 7 0 0 1 4 13c0-6 8-10 16-9 1 8-3 16-9 16Z"/><path d="M8 16c2-2 5-4 9-6"/>',
  party:'<path d="M5.8 11.3 2 22l10.7-3.8"/><path d="m4 3 1 2"/><path d="m22 8-2 .5"/><path d="m14 2 .5 2"/><path d="m5 8 2 1"/><path d="m19 3 .5 2"/><path d="M12.3 14.7 21 6"/><path d="M17 4 20 7"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  sparkles:'<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z"/>',
  globe:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/>',
  pencil:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/><path d="m15 5 3 3"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/>'
};
const svgIcon=name=>`<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.calendar}</svg>`;
const fmtDay=(year,month,day)=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'}).format(new Date(year,month,day));
function easterSunday(year){const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31)-1,day=(h+l-7*m+114)%31+1;return new Date(year,month,day)}
function nthWeekday(year,month,weekday,nth){const first=new Date(year,month,1).getDay();return 1+(weekday-first+7)%7+(nth-1)*7}
function seasonThemes(month,year){
  const easter=easterSunday(year),carnival=new Date(easter);carnival.setDate(carnival.getDate()-47);
  const easterText=fmtDay(easter.getFullYear(),easter.getMonth(),easter.getDate());
  const carnivalText=fmtDay(carnival.getFullYear(),carnival.getMonth(),carnival.getDate());
  const mothersDay=fmtDay(year,4,nthWeekday(year,4,0,2));
  const fathersDay=fmtDay(year,7,nthWeekday(year,7,0,2));
  const item=(name,date,icon)=>({name,date,icon});
  const anytime='Ao longo do mês';
  return [
    [item('Dia da Paz','01/01','heart'),item('Volta às aulas','Data variável','book')],
    [item('Acolhimento',anytime,'heart'),item('Carnaval',carnivalText,'party')],
    [item('Dia da Mulher','08/03','users'),item('Dia da Escola','15/03','book'),item('Dia da Poesia','21/03','pencil'),item('Dia da Água','22/03','globe')],
    [item('Dia do Livro Infantil','18/04','book'),item('Tiradentes','21/04','calendar'),item('Descobrimento do Brasil','22/04','globe'),item('Dia dos Povos Indígenas','19/04','users'),item('Páscoa',easterText,'sparkles')],
    [item('Dia do Trabalho','01/05','users'),item('Abolição','13/05','book'),item('Dia das Mães',mothersDay,'heart'),item('Dia da Família','15/05','users')],
    [item('Meio Ambiente','05/06','leaf'),item('Festa Junina','24/06','party'),item('Dia dos Namorados','12/06','heart')],
    [item('Revisão',anytime,'pencil'),item('Dia do Amigo','20/07','users')],
    [item('Dia dos Pais',fathersDay,'heart'),item('Dia do Estudante','11/08','book'),item('Folclore','22/08','sparkles')],
    [item('Independência','07/09','globe'),item('Dia da Árvore','21/09','leaf'),item('Primavera','22/09','sparkles'),item('Setembro Amarelo',anytime,'heart')],
    [item('Dia dos Animais','04/10','heart'),item('Dia das Crianças','12/10','sparkles'),item('Dia do Professor','15/10','book'),item('Saci/Halloween','31/10','sparkles')],
    [item('Finados','02/11','heart'),item('Proclamação da República','15/11','globe'),item('Dia da Bandeira','19/11','globe'),item('Consciência Negra','20/11','users')],
    [item('Direitos Humanos','10/12','users'),item('Natal','25/12','sparkles'),item('Encerramento do ano',anytime,'party')]
  ][month];
}
function seasonalYear(){return currentYear+(seasonalMonth<currentMonth?1:0)}
function normalizeTheme(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim()}
function hasThemeProducts(theme){return products.some(product=>normalizeTheme(product.subject)===normalizeTheme(theme))}
function updateSubjects(){const select=$('#filter-subject'),value=select.value,suggested=seasonThemes(seasonalMonth,seasonalYear()).map(theme=>theme.name),subjects=[...new Set([...products.map(p=>p.subject),...suggested])].filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt-BR'));select.innerHTML='<option value="">Todos os temas</option>'+subjects.map(s=>`<option value="${safe(s)}">${safe(s)}</option>`).join('');if(subjects.includes(value))select.value=value}
function renderSeasonal(){const title=$('#seasonal-title'),description=$('#seasonal-description'),toggle=$('#month-toggle'),grid=$('#seasonal-grid'),month=monthNames[seasonalMonth],events=seasonThemes(seasonalMonth,seasonalYear());title.textContent=products.length?'Sugestões para o mês':`Em ${month}, os professores costumam trabalhar:`;description.textContent=products.length?`Temas para trabalhar em ${month}.`:'';toggle.textContent=`Ver ${monthNames[(seasonalMonth+1)%12]}`;grid.innerHTML=events.map(event=>{const product=findThemeProduct(event.name),urls=Array.isArray(product?.previewUrls)?product.previewUrls.slice(0,3):[],price=product?(Number(product.price)===0?'Grátis':money(product.price)):'',pageCount=Number(product?.pageCount)||0,media=product?`<button class="seasonal-preview-button" type="button" data-preview-open="${safe(product.id)}" aria-label="Abrir prévia de ${safe(product.title)}"><span class="preview-rotator">${urls.map((url,index)=>`<img class="preview-frame${index===0?' is-current':''}" ${index===0?`src="${safe(url)}"`:`data-src="${safe(url)}"`} alt="" aria-hidden="true" loading="lazy">`).join('')}${urls.length?'':`<span class="seasonal-placeholder is-unavailable"><span>${svgIcon('file')}</span><small>Prévia indisponível</small></span>`}</span><span class="preview-badges"><span>${pageCount?`${pageCount} páginas`:'PDF'}</span><strong>${price}</strong><span>Pronto para imprimir</span></span></button>`:`<div class="seasonal-placeholder" aria-hidden="true"><span>${svgIcon('file')}</span></div>`;return `<article class="seasonal-card">${media}<h3>${safe(event.name)}</h3><time>${safe(event.date)}</time><a class="seasonal-link" href="#acervo" data-theme-link="${safe(event.name)}">Ver materiais →</a>${product?'':`<span class="coming-badge">Em breve</span><button class="notify-button" type="button" data-notify-theme="${safe(event.name)}">Avisar-me</button>`}</article>`}).join('');grid.querySelectorAll('[data-theme-link]').forEach(link=>link.onclick=event=>{event.preventDefault();const theme=link.dataset.themeLink;$('#search').value='';$('#filter-level').value='';if(![...$('#filter-subject').options].some(option=>option.value===theme))$('#filter-subject').add(new Option(theme,theme));$('#filter-subject').value=theme;render();$('#acervo').scrollIntoView({behavior:'smooth'})});grid.querySelectorAll('[data-notify-theme]').forEach(button=>button.onclick=()=>openThemeAlert(button.dataset.notifyTheme));grid.querySelectorAll('[data-preview-open]').forEach(button=>{button.onclick=()=>openProductPreview(button.dataset.previewOpen);button.onpointerenter=()=>startPreviewCycle(button);button.onpointerleave=()=>stopPreviewCycle(button)})}
function startPreviewCycle(button){const frames=[...button.querySelectorAll('.preview-frame')];if(frames.length<2)return;frames.forEach(frame=>{if(frame.dataset.src){frame.src=frame.dataset.src;delete frame.dataset.src}});let active=frames.findIndex(frame=>frame.classList.contains('is-current'));previewHoverTimer=setInterval(()=>{frames[active]?.classList.remove('is-current');active=(active+1)%frames.length;frames[active]?.classList.add('is-current')},1100)}
function stopPreviewCycle(button){clearInterval(previewHoverTimer);previewHoverTimer=null;button.querySelectorAll('.preview-frame').forEach((frame,index)=>frame.classList.toggle('is-current',index===0))}
function openProductPreview(id){previewModalProduct=products.find(product=>product.id===id);if(!previewModalProduct)return;previewModalPages=Array.isArray(previewModalProduct.previewUrls)?previewModalProduct.previewUrls.slice(0,3):[];previewModalIndex=0;$('#preview-title').textContent=previewModalProduct.title;$('#preview-description').textContent=previewModalProduct.description||previewModalProduct.subject;$('#preview-level').textContent=previewModalProduct.level;$('#preview-page-count').textContent=`${previewModalProduct.pageCount||0} páginas`;$('#preview-price').textContent=Number(previewModalProduct.price)===0?'Grátis':money(previewModalProduct.price);$('#preview-action').textContent=Number(previewModalProduct.price)===0?'Baixar grátis ↓':'Adicionar ao carrinho';$('#preview-action').onclick=()=>{if(Number(previewModalProduct.price)===0){location.assign(`/api/products/${encodeURIComponent(previewModalProduct.id)}/download`);return}const id=previewModalProduct.id;$('#preview-dialog').close();addToCart(id);showCart()};$('#preview-dialog').showModal();showPreviewModalPage()}
function showPreviewModalPage(){const image=$('#preview-modal-image'),empty=$('#preview-modal-placeholder'),hasPages=previewModalPages.length>0;$('#preview-stage').classList.toggle('is-empty',!hasPages);image.hidden=!hasPages;empty.hidden=hasPages;if(hasPages){image.src=previewModalPages[previewModalIndex];image.alt=`Página ${previewModalIndex+1} da prévia de ${previewModalProduct.title}`}$('#preview-page-indicator').textContent=hasPages?`${previewModalIndex+1} / ${previewModalPages.length}`:'Prévia indisponível';$('#preview-page-indicator').hidden=!hasPages;$('#preview-previous').hidden=previewModalPages.length<2;$('#preview-next').hidden=previewModalPages.length<2}
function movePreviewPage(delta){if(previewModalPages.length<2)return;previewModalIndex=(previewModalIndex+delta+previewModalPages.length)%previewModalPages.length;showPreviewModalPage()}
$('#preview-previous').onclick=()=>movePreviewPage(-1);$('#preview-next').onclick=()=>movePreviewPage(1);$('#close-preview').onclick=()=>$('#preview-dialog').close();$('#preview-stage').addEventListener('touchstart',event=>{touchStartX=event.changedTouches[0].screenX},{passive:true});$('#preview-stage').addEventListener('touchend',event=>{if(touchStartX===null)return;const delta=event.changedTouches[0].screenX-touchStartX;if(Math.abs(delta)>40)movePreviewPage(delta<0?1:-1);touchStartX=null},{passive:true});
