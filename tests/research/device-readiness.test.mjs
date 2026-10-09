import test from 'node:test';
import assert from 'node:assert/strict';
import {probeDevice,readinessAdvice} from '../../research/device-readiness.js';
import {readFile} from 'node:fs/promises';

test('low capability device remains extractive, not a false model approval',async()=>{
  const probe=await probeDevice({isSecureContext:true,WebAssembly:{},navigator:{language:'pt-BR'},performance:{now:()=>10}});
  assert.equal(probe.webgpu,'unavailable');
  assert.equal(probe.decision.tier,'candidate-wasm');
  assert.equal(probe.decision.reason,'benchmark-required');
  assert.equal(probe.estimatedStorageMB,null);
});

test('insecure context cannot qualify as a local model host',async()=>{
  const probe=await probeDevice({isSecureContext:false,WebAssembly:{},navigator:{gpu:{requestAdapter:async()=>({})}}});
  assert.equal(probe.decision.tier,'unsupported');
  assert.equal(probe.webgpu,'unavailable');
});

test('adapter denied gracefully falls back to CPU candidate',async()=>{
  const probe=await probeDevice({isSecureContext:true,WebAssembly:{},navigator:{gpu:{requestAdapter:async()=>{throw Error('GPU blocked');}},storage:{estimate:async()=>{throw Error('disabled');}}}});
  assert.equal(probe.webgpu,'unavailable');
  assert.equal(probe.decision.tier,'candidate-wasm');
});

test('WebGPU support is merely a benchmark candidate',async()=>{
  const probe=await probeDevice({isSecureContext:true,WebAssembly:{},navigator:{gpu:{requestAdapter:async()=>({limits:{maxBufferSize:999,maxStorageBufferBindingSize:123}})}}});
  assert.equal(probe.decision.tier,'candidate-webgpu');
  assert.equal(probe.gpuLimits.maxBufferSize,999);
  assert.equal(readinessAdvice(probe).reason,'benchmark-required');
});

test('no model download or data exfiltration in standalone probe',async()=>{
  const source=await readFile(new URL('../../research/device-readiness.js',import.meta.url),'utf8');
  const page=await readFile(new URL('../../research/device-readiness-page.js',import.meta.url),'utf8');
  const html=await readFile(new URL('../../research/device-readiness.html',import.meta.url),'utf8');
  assert.doesNotMatch(source+page,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|indexedDB|model\.onnx/i);
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/não lê relatos/i);
});
