import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { REVIEW_DIMENSIONS } from '../../review/scoring.js';

const execFileAsync=promisify(execFile);
const ratings=Object.fromEntries(REVIEW_DIMENSIONS.map(name=>[name,4]));

function response(reviewerId,blockers=[]){
  return {
    reviewerId,
    roundId:'round-1',
    sourceSha:'e9aa363da46cd7b866e767d8457804f2a8e58225',
    packetSha256:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    cases:[
      {blindId:'PS-01',ratings,blockers},
      {blindId:'PS-02',ratings,blockers:[]}
    ]
  };
}

test('CLI consolida arquivos independentes e preserva bloqueadores',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'ponte-serena-review-score-'));
  try{
    const first=join(dir,'reviewer-a.json');
    const second=join(dir,'reviewer-b.json');
    const output=join(dir,'aggregate.json');
    await Promise.all([
      writeFile(first,JSON.stringify(response('R-A')),'utf8'),
      writeFile(second,JSON.stringify(response('R-B',['INVENTED_SUMMARY_CONTENT'])),'utf8')
    ]);

    await execFileAsync(process.execPath,[
      'scripts/aggregate-review-responses.mjs',
      '--out='+output,
      first,
      second
    ],{cwd:process.cwd()});

    const aggregate=JSON.parse(await readFile(output,'utf8'));
    assert.equal(aggregate.reviewerCount,2);
    assert.equal(aggregate.releaseBlocked,true);
    assert.deepEqual(aggregate.blockerCodes,['INVENTED_SUMMARY_CONTENT']);
    assert.equal(aggregate.sourceSha,'e9aa363da46cd7b866e767d8457804f2a8e58225');
    assert.equal(aggregate.roundId,'round-1');
    assert.equal(aggregate.packetSha256,'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  }finally{
    await rm(dir,{recursive:true,force:true});
  }
});

test('CLI recusa consolidar apenas um revisor',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'ponte-serena-review-score-'));
  try{
    const first=join(dir,'reviewer-a.json');
    await writeFile(first,JSON.stringify(response('R-A')),'utf8');
    await assert.rejects(()=>execFileAsync(process.execPath,[
      'scripts/aggregate-review-responses.mjs',
      first
    ],{cwd:process.cwd()}));
  }finally{
    await rm(dir,{recursive:true,force:true});
  }
});
