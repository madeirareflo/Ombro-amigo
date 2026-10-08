import { createHash } from 'node:crypto';

export function sha256Text(value){
  return createHash('sha256').update(String(value),'utf8').digest('hex');
}

export function normalizeSourceSha(value){
  const sha=String(value || '').trim().toLowerCase();
  if(!/^[0-9a-f]{7,40}$/.test(sha)){
    throw new Error('source SHA must contain 7 to 40 hexadecimal characters');
  }
  return sha;
}

export function buildResearchMetadata({
  sourceSha,
  corpusRaw,
  generatedAt=new Date().toISOString()
}){
  return {
    sourceSha:normalizeSourceSha(sourceSha),
    corpusSha256:sha256Text(corpusRaw),
    generatedAt
  };
}
