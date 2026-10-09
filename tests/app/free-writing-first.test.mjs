import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSummaryModel,summaryModelToText} from '../../app/summary-model.js';

const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
const js=await readFile(new URL('../../app/main.js',import.meta.url),'utf8');

test('free-writing is primary and does not require prompted chat',()=>{
  assert.match(html,/data-start="free"/);
  assert.ok(html.indexOf('data-start="free"')<html.indexOf('data-start="session"'));
  assert.match(html,/id="free-writing-text"/);
  assert.match(html,/id="organize-free-writing"/);
  assert.match(js,/if\(mode!==\x27free\x27\) addMessage/);
});

test('free writing persists verbatim without fabricated clinical categories',()=>{
  assert.match(js,/session\.entries=text\.trim\(\)\?\[\{kind:'user_statement',text,source:'declared',categories:\['fact'\]\}\]:\[\]/);
  assert.match(js,/session\.transcript=text\.trim\(\)\?\[\{role:'user',text\}\]:\[\]/);
  assert.match(js,/explicitImmediateDanger:detectExplicitImmediateDanger\(freeText\.value\)/);
  const example='Sei lá. Me sinto só, mas não sei por quê.\nTenho receio de falar.';
  const model=createSummaryModel({facts:[example],emotions:[],difficulties:[],sessionPoints:[]});
  assert.equal(model.sections[0].items[0].text,example);
  assert.doesNotMatch(summaryModelToText(model),/diagnóstico|depressão|transtorno/i);
});

test('free write must be reviewed and approved before copy',()=>{
  assert.match(js,/createOrRestoreSummary\(\);\s*show\(summaryView\)/);
  assert.match(html,/id="accept-summary"/);
  assert.match(html,/id="copy-panel" class="copy-panel hidden"/);
  assert.match(html,/id="reject-summary"/);
});

test('free writing flow introduces no outbound network calls',()=>{
  assert.match(html,/connect-src 'none'/);
  assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|sendBeacon/);
});
