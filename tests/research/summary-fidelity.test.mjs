import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  simulateSummaryGroundingCase,
  aggregateGroundingAudits
} from '../../research/summary-fidelity.js';
import {
  buildResearchMetadata,
  normalizeSourceSha,
  sha256Text
} from '../../research/report-metadata.js';

const corpus=JSON.parse(await readFile(new URL('./summary-fidelity-corpus.json',import.meta.url),'utf8'));

test('corpus sintético não contém claim de síntese sem suporte textual declarado',()=>{
  const results=corpus.map(simulateSummaryGroundingCase);
  for(const result of results){
    assert.deepEqual(
      result.audit.unsupportedClaims,
      [],
      result.id+' contém claim sem suporte textual'
    );
  }
  const aggregate=aggregateGroundingAudits(results);
  assert.equal(aggregate.unsupportedClaimRate,0);
});

test('mensagens de controle, pergunta e incerteza não vazam para a síntese',()=>{
  const results=corpus.map(simulateSummaryGroundingCase);
  for(const result of results){
    assert.deepEqual(
      result.audit.excludedLeaks,
      [],
      result.id+' contém vazamento de conteúdo excluído'
    );
  }
  assert.equal(aggregateGroundingAudits(results).excludedLeakCount,0);
});

test('auditoria distingue grounding textual de cobertura',()=>{
  const result=simulateSummaryGroundingCase({
    id:'coverage-example',
    mode:'event',
    depth:'medium',
    turns:[
      'Briguei com meu namorado ontem.',
      'Fiquei com medo depois da conversa.',
      'Também anotei uma frase neutra sem marcador específico.'
    ]
  });

  assert.equal(result.audit.rates.unsupportedClaimRate,0);
  assert.ok(result.audit.rates.sourceCoverage>=0 && result.audit.rates.sourceCoverage<=1);
  assert.ok(result.audit.totals.eligibleSources>=1);
});

test('pedido de diagnóstico e previsão sobre psicólogo permanecem fora dos claims',()=>{
  for(const id of ['FID-004','FID-011']){
    const result=simulateSummaryGroundingCase(corpus.find(item=>item.id===id));
    assert.equal(result.audit.totals.summaryClaims,0);
    assert.ok(result.audit.totals.excludedSources>=1);
  }
});

test('repetição de uma mesma declaração não é contada como duas fontes únicas',()=>{
  const result=simulateSummaryGroundingCase(corpus.find(item=>item.id==='FID-010'));
  assert.equal(result.audit.totals.eligibleSources,1);
});


test('agregação conta ocorrências, não apenas textos únicos sem suporte',()=>{
  const aggregate=aggregateGroundingAudits([
    {
      totals:{summaryClaims:3,eligibleSources:1},
      unsupportedClaimCount:2,
      unsupportedClaims:['claim sem suporte'],
      excludedLeakCount:0,
      excludedLeaks:[],
      coveredSources:['fonte']
    }
  ]);
  assert.equal(aggregate.totalUnsupported,2);
  assert.equal(aggregate.unsupportedClaimRate,2/3);
});


test('metadata do relatório fixa SHA da versão e hash do corpus',()=>{
  const raw=JSON.stringify(corpus);
  const metadata=buildResearchMetadata({
    sourceSha:'9d9af3533a9d64f1277c0b27f39d6df286c83599',
    corpusRaw:raw,
    generatedAt:'2026-10-08T18:30:00.000Z'
  });
  assert.equal(metadata.sourceSha,'9d9af3533a9d64f1277c0b27f39d6df286c83599');
  assert.equal(metadata.corpusSha256,sha256Text(raw));
  assert.equal(metadata.generatedAt,'2026-10-08T18:30:00.000Z');
});

test('relatório rejeita referência de versão que não seja SHA',()=>{
  assert.equal(normalizeSourceSha('ABCDEF1'),'abcdef1');
  assert.throws(()=>normalizeSourceSha('main'));
  assert.throws(()=>normalizeSourceSha(''));
});
