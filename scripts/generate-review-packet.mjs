import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { createReviewMaterials, reviewPacketMarkdown } from '../review/packet.js';
import { buildReviewMetadata, normalizeSourceSha } from '../review/reproducibility.js';

const args=process.argv.slice(2);
const outArg=args.find(arg=>arg.startsWith('--out='));
const seedArg=args.find(arg=>arg.startsWith('--seed='));
const shaArg=args.find(arg=>arg.startsWith('--sha='));
const outDir=resolve(outArg?.slice('--out='.length) || 'review-output');
const seed=seedArg?.slice('--seed='.length) || 'ponte-serena-review-v1';

function resolveSourceSha(){
  if(shaArg) return normalizeSourceSha(shaArg.slice('--sha='.length));
  try{
    return normalizeSourceSha(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}));
  }catch{
    throw new Error('Não foi possível resolver o SHA da versão. Rode dentro do repositório Git ou informe --sha=<commit>.');
  }
}

const casesUrl=new URL('../tests/review/cases.json',import.meta.url);
const casesRaw=await readFile(casesUrl,'utf8');
const definitions=JSON.parse(casesRaw);
const materials=createReviewMaterials(definitions,{seed});
const packetMarkdown=reviewPacketMarkdown(materials.packet);
const keyJson=JSON.stringify(materials.key,null,2);
const metadata=buildReviewMetadata({
  version:materials.packet.version,
  seed,
  cases:materials.packet.cases.length,
  sourceSha:resolveSourceSha(),
  casesRaw,
  packetMarkdown,
  keyJson
});

await mkdir(outDir,{recursive:true});
await Promise.all([
  writeFile(join(outDir,'review-packet.md'),packetMarkdown,'utf8'),
  writeFile(join(outDir,'review-key.json'),keyJson,'utf8'),
  writeFile(join(outDir,'review-metadata.json'),JSON.stringify(metadata,null,2),'utf8')
]);

console.log(`Pacote de revisão gerado em ${outDir} com ${materials.packet.cases.length} casos para ${metadata.sourceSha}.`);
