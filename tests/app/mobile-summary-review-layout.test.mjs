import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const css=await readFile(new URL('../../styles.css',import.meta.url),'utf8');
const main=await readFile(new URL('../../app/main.js',import.meta.url),'utf8');

test('mobile summary has explicit layouts for fold and movement controls',()=>{
 assert.match(css,/\.summary-section-fold\{[^}]*min-height:44px/);
 assert.match(css,/\.summary-move-controls\{[^}]*display:flex/);
 assert.match(css,/\.summary-item textarea\{[^}]*min-width:0/);
 assert.match(css,/@media\(max-width:560px\)\{\s*\.summary-section/);
});
test('buttons are reachable by keyboard and disabled at list boundaries',()=>{
 assert.match(css,/\.summary-section-fold:focus-visible/);
 assert.match(css,/\.summary-move-controls button:focus-visible/);
 assert.match(main,/move\.disabled=direction===-1\?position===0/);
 assert.match(main,/fold\.setAttribute\('aria-expanded',String\(!sectionBody\.hidden\)\)/);
});
test('collapsed section is only visually hidden, with full content preserved',()=>{
 assert.match(css,/\.summary-section-body\[hidden\]\{display:none!important\}/);
 assert.match(main,/sectionBody\.appendChild\(row\)/);
 assert.match(main,/revealSummaryControl\(target\)/);
});
