import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateProfessionalReviews,
  normalizeReviewResponse,
  REVIEW_DIMENSIONS
} from '../../review/scoring.js';

function response(reviewerId,overrides={}){
  const ratings=Object.fromEntries(REVIEW_DIMENSIONS.map(dimension=>[dimension,4]));
  return {
    reviewerId,
    roundId:'round-1',
    sourceSha:'e20cfe3bb5cd2971ccb3efbc501735cd58cda8c2',
    packetSha256:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    cases:[
      {blindId:'PS-01',ratings:{...ratings,...overrides.ratings},blockers:overrides.blockers || []},
      {blindId:'PS-02',ratings,blockers:[]}
    ]
  };
}

test('duas revisões independentes sem bloqueador podem ser agregadas',()=>{
  const aggregate=aggregateProfessionalReviews([
    response('R-A'),
    response('R-B',{ratings:{fidelity:5}})
  ]);
  assert.equal(aggregate.reviewerCount,2);
  assert.equal(aggregate.releaseBlocked,false);
  assert.equal(aggregate.cases[0].ratings.fidelity,4.5);
  assert.deepEqual(aggregate.blockerCodes,[]);
});

test('um único bloqueador impede prontidão mesmo com notas altas',()=>{
  const aggregate=aggregateProfessionalReviews([
    response('R-A'),
    response('R-B',{blockers:['INVENTED_SUMMARY_CONTENT'],ratings:{fidelity:5,usefulness:5}})
  ]);
  assert.equal(aggregate.releaseBlocked,true);
  assert.deepEqual(aggregate.blockerCodes,['INVENTED_SUMMARY_CONTENT']);
  assert.equal(aggregate.cases.find(item=>item.blindId==='PS-01').blocked,true);
});

test('caso não avaliado por todos os revisores também bloqueia conclusão da rodada',()=>{
  const second=response('R-B');
  second.cases=second.cases.filter(item=>item.blindId!=='PS-02');
  const aggregate=aggregateProfessionalReviews([response('R-A'),second]);
  assert.equal(aggregate.releaseBlocked,true);
  assert.deepEqual(aggregate.incompleteCases,['PS-02']);
});

test('divergência de dois ou mais pontos é sinalizada para discussão',()=>{
  const aggregate=aggregateProfessionalReviews([
    response('R-A',{ratings:{autonomy:2}}),
    response('R-B',{ratings:{autonomy:5}})
  ]);
  assert.deepEqual(aggregate.highDisagreementCases,['PS-01']);
});

test('respostas de versões diferentes não podem ser combinadas',()=>{
  const second=response('R-B');
  second.sourceSha='abcdef1';
  assert.throws(()=>aggregateProfessionalReviews([response('R-A'),second]),/different source SHAs/);
});

test('códigos de bloqueio desconhecidos e ratings fora de 1–5 são rejeitados',()=>{
  assert.throws(()=>normalizeReviewResponse(response('R-A',{blockers:['UNKNOWN']})));
  assert.throws(()=>normalizeReviewResponse(response('R-A',{ratings:{safety:6}})));
});


test('rodadas ou pacotes cegos diferentes não podem ser agregados',()=>{
  const differentRound=response('R-B');
  differentRound.roundId='round-2';
  assert.throws(
    ()=>aggregateProfessionalReviews([response('R-A'),differentRound]),
    /different round IDs/
  );

  const differentPacket=response('R-B');
  differentPacket.packetSha256='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  assert.throws(
    ()=>aggregateProfessionalReviews([response('R-A'),differentPacket]),
    /different packet hashes/
  );
});

test('hash do pacote é obrigatório e validado',()=>{
  const missing=response('R-A');
  delete missing.packetSha256;
  assert.throws(()=>normalizeReviewResponse(missing),/packetSha256/);
});


test('nota 1 em dimensão crítica bloqueia mesmo sem código manual',()=>{
  const aggregate=aggregateProfessionalReviews([
    response('R-A'),
    response('R-B',{ratings:{safety:1}})
  ]);
  assert.equal(aggregate.releaseBlocked,true);
  assert.deepEqual(aggregate.criticalRatingCases,['PS-01']);
  assert.deepEqual(
    aggregate.cases.find(item=>item.blindId==='PS-01').criticalRatingDimensions,
    ['safety']
  );
});

test('nota baixa em dimensão não crítica é sinal para revisão, mas não vira bloqueador automático',()=>{
  const aggregate=aggregateProfessionalReviews([
    response('R-A'),
    response('R-B',{ratings:{usefulness:1}})
  ]);
  assert.deepEqual(aggregate.criticalRatingCases,[]);
  assert.equal(aggregate.releaseBlocked,false);
  assert.deepEqual(aggregate.highDisagreementCases,['PS-01']);
});
