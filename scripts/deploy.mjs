import {readFile} from 'node:fs/promises';
import './package-worker.mjs';
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!account||!token)throw Error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your deployment environment. Never commit tokens.');
const bundle=JSON.parse(await readFile(new URL('../.build/worker-upload.json',import.meta.url),'utf8'));
const form=new FormData();form.append('metadata',new Blob([JSON.stringify(bundle.metadata)],{type:'application/json'}));
for(const p of bundle.parts)form.append(p.name,new Blob([p.text??Buffer.from(p.base64,'base64')],{type:p.type}),p.name);
async function api(route,init){const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${route}`,{...init,headers:{Authorization:`Bearer ${token}`,...init.headers}});const data=await response.json();if(!response.ok||!data.success)throw Error(JSON.stringify(data.errors));return data.result;}
await api(`/workers/scripts/${bundle.name}`,{method:'PUT',body:form});
await api(`/workers/scripts/${bundle.name}/subdomain`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:true,previews_enabled:true})});
const {subdomain}=await api('/workers/subdomain',{method:'GET'});console.log(`https://${bundle.name}.${subdomain}.workers.dev`);
