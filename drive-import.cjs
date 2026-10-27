// Only fetch public Drive downloads. Never forward credentials or follow arbitrary redirects.
module.exports = async function downloadDrivePdf(id) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(id)) throw Object.assign(new Error('Link do Google Drive inválido.'), {status:400});
  let url = new URL('https://drive.google.com/uc');
  url.search = new URLSearchParams({export:'download',id}).toString();
  const allowed = new Set(['drive.google.com','drive.usercontent.google.com','drive.googleusercontent.com']);
  for (let count=0;count<6;count++) {
    if(url.protocol!=='https:' || !allowed.has(url.hostname) || url.username || url.password || (url.port && url.port!=='443')) throw Object.assign(new Error('O Google Drive retornou um endereço não permitido.'), {status:400});
    const response = await fetch(url, {redirect:'manual',signal:AbortSignal.timeout(45000)});
    if ([301,302,303,307,308].includes(response.status)) {
      const location=response.headers.get('location');await response.body?.cancel();
      if(!location)break;url=new URL(location,url);continue;
    }
    if(!response.ok)break;
    if(Number(response.headers.get('content-length'))>30*1024*1024){await response.body?.cancel();throw Object.assign(new Error('O PDF deve ter até 30 MB.'),{status:400});}
    const reader=response.body.getReader(),chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>30*1024*1024){await reader.cancel();throw Object.assign(new Error('O PDF deve ter até 30 MB.'),{status:400});}chunks.push(Buffer.from(value));}
    const file=Buffer.concat(chunks);
    if(file.subarray(0,5).toString()!=='%PDF-')break;
    return file;
  }
  throw Object.assign(new Error('Não foi possível baixar o PDF. Confira se o link permite leitura e download.'),{status:400});
};
