import test from 'node:test';
import assert from 'node:assert/strict';
import { createPilotMetrics } from '../../research/pilot-metrics.js';

function sample(){
  return {
    participantCode:'P-7K3M2A',
    sourceSha:'67080ca9fe3346c265926c115e1736ab1b4bbb94',
    startedAt:'2026-10-08T18:30:00.000Z',
    tasks:[
      {id:'START_SESSION',status:'completed'},
      {id:'DELETE_DATA',status:'assisted',issueCode:'DISCOVERY_DELAY'}
    ],
    roleComprehension:{
      appDiagnoses:false,
      sendsAutomatically:false,
      userControlsDraft:true,
      replacesCrisisCare:false
    },
    autonomy:{canStop:5,canDisagree:4,canSkip:5,noPressure:5},
    fidelity:{rating:'mostly',unsupportedItemCount:0,distortedItemCount:1,correctionCount:1},
    accessibility:{
      keyboardIssueCodes:[],
      screenReaderIssueCodes:['LABEL_UNCLEAR'],
      zoomIssueCodes:[]
    }
  };
}

test('registro do piloto é reduzido a métricas codificadas e SHA da versão',()=>{
  const result=createPilotMetrics(sample());
  assert.equal(result.participantCode,'P-7K3M2A');
  assert.equal(result.sourceSha,'67080ca9fe3346c265926c115e1736ab1b4bbb94');
  assert.deepEqual(result.tasks[1],{
    id:'DELETE_DATA',
    status:'assisted',
    issueCode:'DISCOVERY_DELAY'
  });
});

test('campos fora do formato são descartados do resultado estruturado',()=>{
  const input={...sample(),unexpectedField:'não entra no registro'};
  const result=createPilotMetrics(input);
  assert.equal(Object.hasOwn(result,'unexpectedField'),false);
});

test('códigos narrativos longos são rejeitados para evitar notas livres no formato',()=>{
  const input=sample();
  input.tasks=[{id:'uma descrição longa com espaços',status:'failed'}];
  assert.throws(()=>createPilotMetrics(input));
});

test('ratings e contagens fora do domínio são rejeitados',()=>{
  const badRating=sample();
  badRating.autonomy={...badRating.autonomy,canStop:6};
  assert.throws(()=>createPilotMetrics(badRating));

  const badCount=sample();
  badCount.fidelity={...badCount.fidelity,correctionCount:-1};
  assert.throws(()=>createPilotMetrics(badCount));
});

test('versão e participante precisam de códigos rastreáveis',()=>{
  assert.throws(()=>createPilotMetrics({...sample(),sourceSha:'main'}));
  assert.throws(()=>createPilotMetrics({...sample(),participantCode:'participant-1'}));
});


test('compreensão de papel exige booleanos e rating de fidelidade não aceita typo silencioso',()=>{
  const badRole=sample();
  badRole.roleComprehension={...badRole.roleComprehension,appDiagnoses:'não'};
  assert.throws(()=>createPilotMetrics(badRole),/boolean or null/);

  const badFidelity=sample();
  badFidelity.fidelity={...badFidelity.fidelity,rating:'quase tudo'};
  assert.throws(()=>createPilotMetrics(badFidelity),/invalid fidelity rating/);
});
