export function createHandler(files, revision) {
  return { async fetch(request) {
    const headers = new Headers({'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Source-Revision':revision});
    if (!['GET','HEAD'].includes(request.method)) {headers.set('Allow','GET, HEAD');return new Response('Method not allowed',{status:405,headers});}
    let path; try {path=decodeURIComponent(new URL(request.url).pathname);} catch {return new Response('Bad request',{status:400,headers});}
    if(path==='/')path='/index.html';
    const file=files.get(path);
    if(!file)return new Response(request.method==='HEAD'?null:'Not found',{status:404,headers});
    headers.set('Content-Type',file.type);headers.set('ETag',file.etag);
    headers.set('Cache-Control',path.endsWith('.html')?'no-cache':'public, max-age=300, must-revalidate');
    if(request.headers.get('If-None-Match')===file.etag)return new Response(null,{status:304,headers});
    return new Response(request.method==='HEAD'?null:file.body,{headers});
  }};
}
