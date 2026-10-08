import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ROOTS=['app','conversation','storage','safety'];
const FORBIDDEN=[
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bEventSource\b/,
  /\bsendBeacon\b/,
  /https?:\/\//
];

async function jsFiles(dir) {
  const entries=await readdir(dir,{withFileTypes:true});
  const nested=await Promise.all(entries.map(async entry=>{
    const full=join(dir,entry.name);
    if(entry.isDirectory()) return jsFiles(full);
    return entry.isFile() && full.endsWith('.js') ? [full] : [];
  }));
  return nested.flat();
}

test('código de runtime não contém primitivas de envio de rede', async () => {
  const files=(await Promise.all(ROOTS.map(jsFiles))).flat();
  assert.ok(files.length>0);

  for(const file of files) {
    const content=await readFile(file,'utf8');
    for(const pattern of FORBIDDEN) {
      assert.doesNotMatch(content,pattern,`${file} não deve iniciar comunicação de rede`);
    }
  }
});
