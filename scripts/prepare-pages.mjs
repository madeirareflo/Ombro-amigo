import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const output='dist-pages';
const files=[
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'icon.svg',
  'service-worker.js',
  'app/main.js',
  'app/clipboard.js',
  'conversation/engine.js',
  'storage/local-store.js',
  'safety/policy.js'
];

await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});

for(const file of files){
  const target=join(output,file);
  await mkdir(dirname(target),{recursive:true});
  await copyFile(file,target);
}

await writeFile(join(output,'.nojekyll'),'','utf8');
console.log(`GitHub Pages bundle pronto: ${files.length} arquivos + .nojekyll`);
