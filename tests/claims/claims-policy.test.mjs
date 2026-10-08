import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { findProhibitedClaims, assertNoProhibitedClaims, CLAIM_RULE_IDS } from '../../claims/policy.js';

const SURFACES=[
  'index.html',
  'README.md',
  'manifest.webmanifest',
  'app/main.js',
  'conversation/engine.js',
  'safety/policy.js'
];

test('gate cobre as categorias proibidas centrais da claims policy',()=>{
  for(const id of [
    'clinical-validation',
    'diagnosis-claim',
    'prescription-claim',
    'treatment-claim',
    'symptom-reduction',
    'crisis-prevention',
    'risk-detection',
    'therapist-substitution',
    'human-understanding-claim',
    'psychotherapy-efficacy',
    'artificial-therapist-positioning'
  ]){
    assert.ok(CLAIM_RULE_IDS.includes(id),id);
  }
});

test('detector bloqueia exemplos positivos indevidos',()=>{
  const examples=[
    'Este app trata ansiedade.',
    'O sistema diagnostica depressão.',
    'A ferramenta detecta risco de suicídio.',
    'Ela melhora a eficácia da psicoterapia.',
    'É um psicólogo artificial disponível no celular.',
    'O aplicativo entende suas emoções.',
    'A solução substitui seu psicólogo.'
  ];

  for(const example of examples){
    assert.ok(findProhibitedClaims(example).length>0,example);
  }
});

test('limites explícitos e negações permitidas não são tratados como claims positivos',()=>{
  const allowed=[
    'O app não diagnostica.',
    'A ferramenta não substitui seu psicólogo.',
    'O sistema não detecta risco de suicídio.',
    'O aplicativo não entende suas emoções como uma pessoa.',
    'Não trata ansiedade nem depressão.',
    'Ajuda a organizar, sem diagnosticar nem tentar substituir seu psicólogo.',
    'Não diagnostica, prescreve nem substitui cuidado profissional.'
  ];

  for(const example of allowed){
    assert.deepEqual(findProhibitedClaims(example),[],example);
  }
});

test('superfícies públicas e respostas de runtime não contêm claims clínicos proibidos',async()=>{
  for(const path of SURFACES){
    const content=await readFile(path,'utf8');
    assert.doesNotThrow(
      ()=>assertNoProhibitedClaims(content,{source:path}),
      path
    );
  }
});

test('README e onboarding mantêm limites básicos do produto',async()=>{
  const [readme,html]=await Promise.all([
    readFile('README.md','utf8'),
    readFile('index.html','utf8')
  ]);

  assert.match(readme,/não (é|oferece|faz|substitui)|não diagnostica|não.*psicólogo/i);
  assert.match(html,/sem diagnosticar|não diagnostica/i);
  assert.match(html,/não.*substitui|sem.*substituir/i);
});


test('negação não atravessa contraste adversativo para esconder claim positivo',()=>{
  const findings=findProhibitedClaims('O app não diagnostica, mas trata ansiedade.');
  assert.ok(findings.some(item=>item.ruleId==='treatment-claim'));
});
