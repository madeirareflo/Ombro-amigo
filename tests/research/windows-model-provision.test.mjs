import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../../scripts/provision-qwen-onnx.ps1',import.meta.url),'utf8');

test('manual provisioning is opt-in and pinned to exact model revision',()=>{
  assert.match(source,/\[switch\]\$Download/);
  assert.match(source,/if\(\$Download\)\{/);
  assert.match(source,/--revision \$revision/);
  assert.match(source,/\$revision='[0-9a-f]{40}'/);
  assert.match(source,/--local-dir \$folder/);
});

test('both candidate artifacts have verified upstream sha256 digests',()=>{
  assert.match(source,/model_q4\.onnx/);
  assert.match(source,/model_q4f16\.onnx/);
  assert.match(source,/d43d836fc5e240df9013733ccd214972c5d21bd9ec47e574e4f1e359cf90aed0/);
  assert.match(source,/9e33a5911974174761d0dfdcc0bec975d9c45af0eae5e9eb647b8ba9442a8f91/);
  assert.match(source,/Get-FileHash -LiteralPath \$weight -Algorithm SHA256/);
});

test('no service starts, no deployment, and no personal writing is accessed',()=>{
  assert.doesNotMatch(source,/Start-Process|git push|git checkout|npm publish|Invoke-WebRequest|Invoke-RestMethod|fetch\(/i);
  assert.match(source,/Dry run only. No download will occur/);
  assert.match(source,/Runtime WASM and tokenizer compatibility are NOT verified/);
});
