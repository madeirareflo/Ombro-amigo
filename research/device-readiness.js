/**
 * Non-clinical local-model device readiness report.
 * No model is loaded; no user text; no network; no telemetry.
 * Fingerprint-like capabilities are reported only on screen, not stored.
 */
export const DEVICE_PROBE_VERSION='offline-device-readiness-v1';

export function readinessAdvice(probe){
  if(!probe || probe.secureContext!==true) return {tier:'unsupported',reason:'secure-context-required'};
  if(probe.webgpu==='available')return {tier:'candidate-webgpu',reason:'benchmark-required'};
  if(probe.wasm===true)return {tier:'candidate-wasm',reason:'benchmark-required'};
  return {tier:'extractive-only',reason:'no-tested-local-inference-runtime'};
}
export function emptyProbe(){
  return {
    version:DEVICE_PROBE_VERSION,secureContext:false,wasm:false,
    webgpu:'unknown',gpuLimits:null,deviceMemoryGB:null,
    hardwareConcurrency:null,estimatedStorageMB:null,
    browserLanguage:null,probeDurationMs:null
  };
}
export async function probeDevice(env=globalThis){
  const start=env.performance?.now?.()??0;
  const probe=emptyProbe();
  probe.secureContext=env.isSecureContext===true;
  probe.wasm=typeof env.WebAssembly==='object';
  probe.deviceMemoryGB=Number.isFinite(env.navigator?.deviceMemory)?env.navigator.deviceMemory:null;
  probe.hardwareConcurrency=Number.isFinite(env.navigator?.hardwareConcurrency)?env.navigator.hardwareConcurrency:null;
  probe.browserLanguage=typeof env.navigator?.language==='string'?env.navigator.language:null;
  if(probe.secureContext && env.navigator?.gpu?.requestAdapter){
    try{
      const adapter=await env.navigator.gpu.requestAdapter({powerPreference:'low-power'});
      probe.webgpu=adapter?'available':'unavailable';
      if(adapter?.limits){
        probe.gpuLimits={
          maxBufferSize:Number(adapter.limits.maxBufferSize)||null,
          maxStorageBufferBindingSize:Number(adapter.limits.maxStorageBufferBindingSize)||null
        };
      }
    }catch{probe.webgpu='unavailable';}
  }else probe.webgpu='unavailable';
  if(env.navigator?.storage?.estimate){
    try{
      const storage=await env.navigator.storage.estimate();
      probe.estimatedStorageMB=Number.isFinite(storage?.quota)
        ?Math.floor(storage.quota/(1024*1024)):null;
    }catch{ /* Storage estimates can be denied on private browsers. */ }
  }
  probe.probeDurationMs=Math.max(0,Math.round((env.performance?.now?.()??start)-start));
  return {...probe,decision:readinessAdvice(probe)};
}
