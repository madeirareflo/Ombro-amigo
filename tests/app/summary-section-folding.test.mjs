import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSummaryModel,freeWritingSummaryToText} from '../../app/summary-model.js';

const source=await readFile(new URL('../../app/main.js',import.meta.url),'utf8');

test('fold controls expose expanded state and preserve textareas in DOM',()=>{
 assert.match(source,/fold\.setAttribute\('aria-controls',sectionBody\.id\)/);
 assert.match(source,/fold\.setAttribute\('aria-expanded',String\(!sectionBody\.hidden\)\)/);
 assert.match(source,/sectionBody\.hidden=!sectionBody\.hidden/);
 assert.match(source,/sectionBody\.appendChild\(row\)/);
 assert.doesNotMatch(source,/sectionBody\.replaceChildren\(\)/);
});
test('folding is presentation-only and never changes text export',()=>{
 const model=createSummaryModel({facts:['Não sei...','Hoje estou melhor?']});
 assert.equal(freeWritingSummaryToText(model).includes('Não sei...'),true);
 assert.match(source,/const collapsedSummarySections=new Set\(\)/);
 assert.match(source,/collapsedSummarySections\.clear\(\)/);
});
test('focus reveals collapsed controls after reordering or removal',()=>{
 assert.match(source,/function revealSummaryControl\(target\)/);
 assert.match(source,/revealSummaryControl\(target\);\s*target\.focus\(\)/);
 assert.match(source,/fold\.setAttribute\('aria-expanded','true'\)/);
});
