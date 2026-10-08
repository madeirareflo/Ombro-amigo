import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { sha256Text } from '../../review/reproducibility.js';

const execFileAsync=promisify(execFile);

test('CLI gera pacote, chave e metadata vinculados ao SHA informado',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'ponte-serena-review-'));
  try{
    const sourceSha='de70187036104edd0c49c3ec62e8419c29789b6c';
    await execFileAsync(process.execPath,[
      'scripts/generate-review-packet.mjs',
      '--seed=cli-test',
      '--sha='+sourceSha,
      '--out='+dir
    ],{cwd:process.cwd()});

    const [packet,key,metadataRaw]=await Promise.all([
      readFile(join(dir,'review-packet.md'),'utf8'),
      readFile(join(dir,'review-key.json'),'utf8'),
      readFile(join(dir,'review-metadata.json'),'utf8')
    ]);
    const metadata=JSON.parse(metadataRaw);

    assert.equal(metadata.sourceSha,sourceSha);
    assert.equal(metadata.packetSha256,sha256Text(packet));
    assert.equal(metadata.keySha256,sha256Text(key));
    assert.equal(metadata.seed,'cli-test');
    assert.ok(metadata.cases>0);
    assert.match(packet,/pacote cego de revisão profissional/i);
  }finally{
    await rm(dir,{recursive:true,force:true});
  }
});
