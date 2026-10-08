import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { sha256Text } from '../../research/report-metadata.js';

const execFileAsync=promisify(execFile);

test('CLI de grounding gera relatório rastreável para o SHA informado',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'ponte-serena-fidelity-'));
  const output=join(dir,'report.json');
  try{
    const sourceSha='c3e00a0515097749770862a94464c77ea081ca8c';
    await execFileAsync(process.execPath,[
      'scripts/generate-summary-fidelity-report.mjs',
      '--sha='+sourceSha,
      '--out='+output
    ],{cwd:process.cwd()});

    const [reportRaw,corpusRaw]=await Promise.all([
      readFile(output,'utf8'),
      readFile('tests/research/summary-fidelity-corpus.json','utf8')
    ]);
    const report=JSON.parse(reportRaw);

    assert.equal(report.metadata.sourceSha,sourceSha);
    assert.equal(report.metadata.corpusSha256,sha256Text(corpusRaw));
    assert.equal(report.aggregate.unsupportedClaimRate,0);
    assert.equal(report.aggregate.excludedLeakCount,0);
    assert.ok(report.cases.length>0);
  }finally{
    await rm(dir,{recursive:true,force:true});
  }
});
