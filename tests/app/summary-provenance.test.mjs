import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSummaryModel, normalizeSummaryModel, summaryModelToText,
  markItemEdited, addEditedItem, removeSummaryItem
} from '../../app/summary-model.js';

test('proveniência começa como conteúdo do usuário',()=>{
  const model=createSummaryModel({facts:['Briguei ontem.'],emotions:['Senti medo.']});
  assert.equal(model.sections[0].items[0].origin,'user');
  assert.equal(model.sections[1].items[0].origin,'user');
});

test('edição muda proveniência sem alterar outras frases',()=>{
  const model=createSummaryModel({facts:['Briguei ontem.','Falei com ela.']});
  const id=model.sections[0].items[0].id;
  const edited=markItemEdited(model,'facts',id,'Briguei ontem de manhã.');
  assert.equal(edited.sections[0].items[0].origin,'edited');
  assert.equal(edited.sections[0].items[1].origin,'user');
});

test('item adicionado pelo usuário é marcado como editado',()=>{
  const model=addEditedItem(createSummaryModel({}),'sessionPoints','Quero falar disso.');
  assert.equal(model.sections[3].items[0].origin,'edited');
});

test('remoção tira apenas item escolhido',()=>{
  const model=createSummaryModel({facts:['A','B']});
  const id=model.sections[0].items[0].id;
  const result=removeSummaryItem(model,'facts',id);
  assert.deepEqual(result.sections[0].items.map(x=>x.text),['B']);
});

test('texto exportado preserva quatro seções e não inventa emoção',()=>{
  const text=summaryModelToText(createSummaryModel({facts:['Aconteceu algo.']}));
  assert.match(text,/O que aconteceu/);
  assert.match(text,/O que eu disse que senti/);
  assert.match(text,/Ainda não ficou claro para mim/);
  assert.doesNotMatch(text,/ansiedade|depressão|trauma/i);
});

test('modelo persistido é normalizado para origens conhecidas',()=>{
  const normalized=normalizeSummaryModel({sections:[{id:'facts',items:[{text:'x',origin:'app'}]}]});
  assert.equal(normalized.sections[0].items[0].origin,'user');
});
