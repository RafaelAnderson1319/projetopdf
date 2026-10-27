const {test}=require('node:test'),assert=require('node:assert/strict');
const download=require('./drive-import.cjs'),id='1xphoOm5t4WxUNX_8AyXjZ_DBciG4Ezs2';
test('Drive import rejects arbitrary sources and redirects before fetching them',async t=>{
 let calls=0;t.mock.method(global,'fetch',async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://169.254.169.254/latest/meta-data'}})});
 await assert.rejects(download('https://evil.example/file'),{status:400});assert.equal(calls,0);
 await assert.rejects(download(id),{status:400});assert.equal(calls,1);
});
test('Drive import follows Google download redirects and validates PDF bytes',async t=>{
 let calls=0;t.mock.method(global,'fetch',async(url,options)=>{calls++;assert.equal(options.redirect,'manual');if(calls===1)return new Response(null,{status:302,headers:{location:'https://drive.usercontent.google.com/download?id='+id}});return new Response('%PDF-1.4 original')});
 assert.match((await download(id)).toString(),/^%PDF-/);assert.equal(calls,2);
});
test('Drive import refuses HTML permission pages and oversized files',async t=>{
 t.mock.method(global,'fetch',async()=>new Response('<html>Login required</html>'));await assert.rejects(download(id),{status:400});
 t.mock.method(global,'fetch',async()=>new Response('%PDF-',{headers:{'Content-Length':String(31*1024*1024)}}));await assert.rejects(download(id),{status:400});
});
