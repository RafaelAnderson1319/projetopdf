module.exports = async function driveTitle(id) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(id || '')) throw Object.assign(new Error('Link do Google Drive inválido.'), {status:400});
  const response = await fetch(`https://drive.google.com/file/d/${id}/view`, {redirect:'error',signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw Object.assign(new Error('Não foi possível ler o título no Drive.'), {status:400});
  const reader=response.body.getReader();let html='',size=0;
  try {while(size<1024*1024){const {done,value}=await reader.read();if(done)break;size+=value.length;html+=Buffer.from(value).toString('utf8');if(/<\/title>/i.test(html))break;}}finally{await reader.cancel();}
  const raw=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'';
  const title=raw.replace(/\s*[-–]\s*Google Drive\s*$/i,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  if(!/\.pdf$/i.test(title))throw Object.assign(new Error('Não foi possível reconhecer o PDF. Preencha o título manualmente.'),{status:400});
  return title;
};
