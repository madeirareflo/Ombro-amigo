import test from 'node:test';
import assert from 'node:assert/strict';
import {createSummaryModel,moveSummaryItem,freeWritingSummaryToText} from '../../app/summary-model.js';
import {readFile} from 'node:fs/promises';

test('manual movement changes order but keeps original wording',()=>{
 const model=createSummaryModel({facts:['Não sei...','Ontem chorei.','Hoje estou melhor?']});
 const moved=moveSummaryItem(model,'facts','facts-2',-1);
 assert.deepEqual(moved.sections[0].items.map(x=>x.text),['Não sei...','Hoje estou melhor?','Ontem chorei.']);
 assert.ok(freeWritingSummaryToText(moved).indexOf('Hoje estou melhor?')<freeWritingSummaryToText(moved).indexOf('Ontem chorei.'));
});
test('invalid moves do not mutate source or other sections',()=>{
 const model=createSummaryModel({facts:['Primeiro','Segundo'],emotions:['Ansiedade']});
 assert.deepEqual(moveSummaryItem(model,'facts','facts-0',-1).sections[0].items.map(x=>x.text),['Primeiro','Segundo']);
 assert.deepEqual(moveSummaryItem(model,'facts','facts-1',1).sections[0].items.map(x=>x.text),['Primeiro','Segundo']);
 assert.deepEqual(moveSummaryItem(model,'emotions','emotions-0',-1).sections[1].items.map(x=>x.text),['Ansiedade']);
 assert.deepEqual(moveSummaryItem(model,'facts','facts-0',4).sections[0].items.map(x=>x.text),['Primeiro','Segundo']);
});
test('editor controls restore focus and invalidate previous review approval',async()=>{
 const source=await readFile(new URL('../../app/main.js',import.meta.url),'utf8');
 assert.match(source,/moveSummaryItem\(summaryModel,section\.id,item\.id,direction\)/);
 assert.match(source,/invalidateSummaryApproval\(\);\s*syncSummaryText\(\);\s*renderSummaryEditor\(\);\s*focusSummaryItem\(item\.id\)/);
 assert.match(source,/move\.disabled=direction===-1/);
});
