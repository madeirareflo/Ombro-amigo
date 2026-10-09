import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateReviewFile} from '../../research/human-fidelity-scoring.js';

const pair=(patch={})=>({id:'CASE-1',original:'Não estou triste.',candidate:'Não estou triste.',checks:{gateStatus:'needs-human-review'},reviewer:{
 negation:'not-reviewed',thirdParty:'not-reviewed',time:'not-reviewed',unsupportedClaims:'not-reviewed',omissions:'not-reviewed',naturalnessPtBR:'not-reviewed',notes:''},...patch});
const doc=rows=>({schema:'synthetic-review-v1',reviewStatus:'pending-human-review',reviews:rows});

test('unreviewed work never becomes success',()=>{
 const r=evaluateReviewFile(doc([pair()]));
 assert.equal(r.valid,true);
 assert.equal(r.pending,1);
 assert.equal(r.allCasesReviewed,false);
 assert.equal(r.approvedForPatients,false);
});
test('a single critical alteration blocks synthetic acceptance',()=>{
 const p=pair();p.reviewer=Object.fromEntries(Object.keys(p.reviewer).map(k=>[k,k==='notes'?'':k==='naturalnessPtBR'?'natural':'pass']));
 p.reviewer.negation='fail';
 const r=evaluateReviewFile(doc([p]));
 assert.equal(r.rejected,1);
 assert.equal(r.anyCriticalError,true);
 assert.equal(r.provenSafe,false);
});
test('reviewed clean synthetic samples still never get product approval',()=>{
 const p=pair();p.reviewer={negation:'pass',thirdParty:'pass',time:'pass',unsupportedClaims:'pass',omissions:'pass',naturalnessPtBR:'natural',notes:''};
 const r=evaluateReviewFile(doc([p]));
 assert.equal(r.allCasesReviewed,true);
 assert.equal(r.rejected,0);
 assert.equal(r.approvedForPatients,false);
});
test('lexical gate failure rejects regardless of human notation',()=>{
 const p=pair({checks:{gateStatus:'reject'}});
 p.reviewer={negation:'pass',thirdParty:'pass',time:'pass',unsupportedClaims:'pass',omissions:'pass',naturalnessPtBR:'natural',notes:''};
 assert.equal(evaluateReviewFile(doc([p])).rejected,1);
});
test('tampered or duplicate records do not produce a score',()=>{
 assert.equal(evaluateReviewFile({reviews:[]}).valid,false);
 assert.equal(evaluateReviewFile(doc([pair(),pair()])).valid,false);
 assert.equal(evaluateReviewFile(doc([pair({reviewer:{}})])).valid,false);
});
