import test from 'node:test';
import assert from 'node:assert/strict';
import {freeWritingSummaryToText,createSummaryModel} from '../../app/summary-model.js';
import {extractTraceableSummary} from '../../app/extractive-summary.js';
import {readFile} from 'node:fs/promises';

test('free-writing export does not change punctuation or inject missing sections',()=>{
  const original='não sei... talvez.\nEu falei: "tá tudo bem?"';
  const model=extractTraceableSummary(original);
  const text=freeWritingSummaryToText(model);
  for(const item of model.sections.flatMap(x=>x.items)) assert.ok(text.includes(item.text));
  assert.ok(text.includes('não sei...'));
  assert.ok(text.includes('"tá tudo bem?"'));
  assert.ok(!text.includes('Ainda não ficou claro para mim.'));
});
test('edited free-writing items preserve user formatting too',()=>{
 const model=createSummaryModel({facts:['eu não sei...']});
 model.sections[0].items[0].text='  prefiro assim?!  ';
 const result=freeWritingSummaryToText(model);
 assert.ok(result.includes('prefiro assim?!'));
 assert.ok(!result.includes('prefiro assim?!.'));
});
test('free-writing empty summary does not invent claims',()=>{
 assert.equal(freeWritingSummaryToText(createSummaryModel({})), '');
});
test('editing removes a stale evidence line in UI',async()=>{
 const main=await readFile(new URL('../../app/main.js',import.meta.url),'utf8');
 assert.match(main,/row\.querySelector\('\.source-evidence'\)\?\.remove\(\)/);
 assert.match(main,/freeWritingSummaryToText\(summaryModel\)/);
});
