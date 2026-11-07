import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else out.push(p);}return out.sort();}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.otf':'font/otf','.ttf':'font/ttf','.svg':'image/svg+xml','.json':'application/json'};
let revision=process.env.SOURCE_REVISION; if(!revision){try{revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()}catch{revision='local'}}
const parts=[],imports=[],entries=[];
for(const [i,p] of (await walk(path.join(root,'public'))).entries()){const bytes=await readFile(p),name=`files/${i}.bin`,url='/'+path.relative(path.join(root,'public'),p).split(path.sep).join('/');imports.push(`import asset${i} from './${name}';`);entries.push(`[${JSON.stringify(url)},{body:asset${i},type:${JSON.stringify(mime[path.extname(p)]||'application/octet-stream')},etag:${JSON.stringify('"'+createHash('sha256').update(bytes).digest('hex')+'"')}}]`);parts.push({name,type:'application/octet-stream',base64:bytes.toString('base64')});}
const code=imports.join('\n')+`\nimport {createHandler} from './handler.mjs';\nexport default createHandler(new Map([${entries.join(',')}]),${JSON.stringify(revision)});\n`;
parts.push({name:'worker.mjs',type:'application/javascript+module',text:code},{name:'handler.mjs',type:'application/javascript+module',text:await readFile(path.join(root,'worker/handler.mjs'),'utf8')});
const config=JSON.parse(await readFile(path.join(root,'worker/config.json'),'utf8'));
const bundle={name:config.name,metadata:{main_module:'worker.mjs',compatibility_date:config.compatibility_date,observability:{enabled:true,head_sampling_rate:0.1,traces:{enabled:true,head_sampling_rate:0.1}}},parts};
await mkdir(path.join(root,'.build'),{recursive:true});await writeFile(path.join(root,'.build/worker-upload.json'),JSON.stringify(bundle));console.log(`Packaged ${parts.length-2} site files at revision ${revision}`);
