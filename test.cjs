const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');

const data=fs.mkdtempSync(path.join(os.tmpdir(),'pequenos-brincantes-'));
const port=35000+Math.floor(Math.random()*5000);
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['server.cjs'],{cwd:__dirname,env:{...process.env,PORT:String(port),WONDERLEARN_DATA:data},stdio:['ignore','pipe','pipe']});
let childErrors='';child.stderr.on('data',chunk=>{childErrors+=chunk.toString()});
const cookieFrom=response=>(response.headers.get('set-cookie')||'').split(';')[0];
const request=(route,options={})=>fetch(base+route,options);

async function waitForServer(){for(let attempt=0;attempt<150;attempt++){try{const response=await request('/api/account/session');if(response.ok)return}catch{}await new Promise(resolve=>setTimeout(resolve,100))}throw new Error('O servidor de teste não iniciou: '+childErrors.slice(-3000))}

(async()=>{try{
  await waitForServer();
  assert.equal((await request('/account')).status,200);
  assert.equal((await request('/brand-logo.png')).status,200);

  const register=await request('/api/account/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Cliente Teste',email:'cliente@example.com',password:'SenhaSegura123'})});
  assert.equal(register.status,201);const cookie=cookieFrom(register);assert.ok(cookie.startsWith('pequenos_session='));
  const user=(await register.json()).user;

  const session=await request('/api/account/session',{headers:{Cookie:cookie}});assert.equal((await session.json()).user.email,'cliente@example.com');
  const empty=await request('/api/account/library',{headers:{Cookie:cookie}});assert.deepEqual((await empty.json()).orders,[]);

  const productId='11111111-1111-4111-8111-111111111111',orderId='22222222-2222-4222-8222-222222222222';
  fs.mkdirSync(path.join(data,'pdfs'),{recursive:true});fs.writeFileSync(path.join(data,'pdfs',productId+'.pdf'),'%PDF-1.4\n%%EOF');
  fs.writeFileSync(path.join(data,'orders.json'),JSON.stringify([{id:orderId,userId:user.id,email:user.email,items:[{id:productId,title:'Atividade teste',price:1290}],total:1290,status:'pago',created:Date.now(),paidAt:Date.now()}]));
  const library=await request('/api/account/library',{headers:{Cookie:cookie}}),orders=(await library.json()).orders;assert.equal(orders[0].items[0].available,true);
  assert.equal((await request(`/api/account/download/${orderId}/${productId}`,{headers:{Cookie:cookie}})).status,200);

  const otherRegister=await request('/api/account/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Outra Pessoa',email:'outra@example.com',password:'OutraSenha123'})});
  const otherCookie=cookieFrom(otherRegister);assert.equal((await request(`/api/account/download/${orderId}/${productId}`,{headers:{Cookie:otherCookie}})).status,403);
  assert.equal((await request('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productIds:[productId]})})).status,401);

  const logout=await request('/api/account/logout',{method:'POST',headers:{Cookie:cookie}});assert.equal(logout.status,200);assert.equal((await request('/api/account/library',{headers:{Cookie:cookie}})).status,401);
  const badLogin=await request('/api/account/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'cliente@example.com',password:'senha-errada'})});assert.equal(badLogin.status,401);
  const login=await request('/api/account/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'cliente@example.com',password:'SenhaSegura123'})});assert.equal(login.status,200);
  console.log('Autenticação, isolamento da biblioteca e downloads verificados.');
}finally{child.kill();fs.rmSync(data,{recursive:true,force:true})}})().catch(error=>{console.error(error);process.exitCode=1});
