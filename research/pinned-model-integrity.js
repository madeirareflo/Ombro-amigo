/**
 * Strict integrity gate for the exact research candidate.
 * No automatic download, cache, telemetry or model execution.
 * Hashes are from the pinned upstream Hugging Face Xet SHA-256 metadata.
 */
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {join} from 'node:path';

export const PINNED_MODEL_REVISION='b1ece21c06dfce3839272e86b7fa12a985d97a7a';
export const MODEL_ARTIFACTS=Object.freeze({
  q4: Object.freeze({
    filename:'model_q4.onnx',
    bytes:919000000, // Informational only: verified against SHA-256 below, not approximate display size.
    sha256:'d43d836fc5e240df9013733ccd214972c5d21bd9ec47e574e4f1e359cf90aed0'
  }),
  q4f16: Object.freeze({
    filename:'model_q4f16.onnx',
    bytes:570000000, // Informational only; upstream UI rounds to MB.
    sha256:'9e33a5911974174761d0dfdcc0bec975d9c45af0eae5e9eb647b8ba9442a8f91'
  })
});

export async function hashFile(path){
  const digest=createHash('sha256');
  for await(const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
}
export async function verifyPinnedWeight(modelPath,dtype,{hash=hashFile}={}){
  const artifact=MODEL_ARTIFACTS[dtype];
  if(!artifact)return {ok:false,reason:'unreviewed-quantization'};
  const path=join(modelPath,'onnx',artifact.filename);
  try{
    const info=await stat(path);
    if(!info.isFile()||info.size===0)return {ok:false,reason:'weight-empty'};
    const actual=await hash(path);
    if(actual!==artifact.sha256)return {ok:false,reason:'weight-sha256-mismatch'};
    return {ok:true,reason:'verified',path,sha256:actual,actualBytes:info.size};
  }catch{return {ok:false,reason:'weight-missing-or-unreadable'};}
}
