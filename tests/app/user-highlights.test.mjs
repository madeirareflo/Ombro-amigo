import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedHighlight,highlightedExtractiveSummary} from '../../app/user-highlights.js';
import {hasExactProvenance} from '../../app/extractive-summary.js';
import {normalizeSummaryModel} from '../../app/summary-model.js';
import {readFile} from 'node:fs/promises';

test('only text intentionally selected by the person is highlighted',()=>{
 const text='Me sinto sozinho. Não sei explicar.';
 const selection=selectedHighlight(text,0,17);
 assert.equal(selection.text,'Me sinto sozinho.');
 const model=highlightedExtractiveSummary(text,selection);
 const highlight=model.sections.find(x=>x.id==='sessionPoints').items[0];
 assert.equal(highlight.text,'Me sinto sozinho.');
 assert.equal(highlight.explicitHighlight,true);
 assert.equal(hasExactProvenance(text,highlight),true);
 assert.equal(normalizeSummaryModel(model).sections.find(x=>x.id==='sessionPoints').items[0].explicitHighlight,true);
});
test('stale, whitespace or invalid selections cannot become claims',()=>{
 const text='Não sei o que dizer.';
 assert.equal(selectedHighlight(text,0,0),null);
 assert.equal(selectedHighlight(text,-1,3),null);
 assert.equal(selectedHighlight('  ',0,2),null);
 const model=highlightedExtractiveSummary(text,{start:0,end:3,text:'Fui'});
 assert.equal(model.sections.find(x=>x.id==='sessionPoints').items.length,0);
});
test('the UI restores and invalidates highlighted excerpts after changes',async()=>{
 const main=await readFile(new URL('../../app/main.js',import.meta.url),'utf8');
 assert.match(main,/id==='free'/);
 assert.match(main,/session\.userHighlight=null/);
 assert.match(main,/text\.slice\(session\.userHighlight\.start,session\.userHighlight\.end\)!==session\.userHighlight\.text/);
 assert.match(main,/highlightedExtractiveSummary/);
});
