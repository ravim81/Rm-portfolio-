import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
export default { content:[path.join(root,'index.html'),path.join(root,'src/**/*.{js,jsx}')], theme:{extend:{colors:{ink:'#101722',cream:'#f5efe5',coral:'#ff765f',aqua:'#87d5d0'},fontFamily:{display:['Space Grotesk','sans-serif'],mono:['DM Mono','monospace']}}},plugins:[] };
