import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const main=await readFile(new URL('../../app/main.js',import.meta.url),'utf8');
const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');

test('writing is persisted after a brief pause without requiring a click',()=>{
 assert.match(main,/freeText\.addEventListener\('input'/);
 assert.match(main,/freeSaveTimer=setTimeout/);
 assert.match(main,/650\)/);
 assert.match(main,/void saveFreeWriting\(\)/);
 assert.match(html,/salvas automaticamente/);
});
test('whitespace stays in the exact source instead of being trimmed',()=>{
 assert.match(main,/const text=freeText\.value;/);
 assert.match(main,/session\.entries=text\.trim\(\)\?/);
 assert.doesNotMatch(main,/const text=freeText\.value\.trim\(\)/);
});
test('storage warning distinguishes persisted versus in-memory writing',()=>{
 assert.match(main,/status\.persistenceConfirmed/);
 assert.match(main,/armazenamento permanente não foi confirmado/);
 assert.match(main,/não foi confirmado\. Não feche esta aba/);
});
test('navigation flushes pending editor changes before returning home',()=>{
 assert.match(main,/\$\('#back-home'\)\.addEventListener\('click',async/);
 assert.match(main,/if\(session\?\.mode==='free'\)await saveFreeWriting\(\)/);
 assert.match(main,/function cancelFreeSave\(\)/);
});
