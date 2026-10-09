# Manual research-only model provisioning. NEVER called by site, npm test or CI.
# Download is performed ONLY after explicit invocation with -Download.
param(
  [Parameter(Mandatory=$true)][string]$Destination,
  [ValidateSet('q4','q4f16')][string]$Quantization='q4',
  [switch]$Download
)
$ErrorActionPreference='Stop'
$revision='b1ece21c06dfce3839272e86b7fa12a985d97a7a'
$repository='onnx-community/Qwen3-0.6B-ONNX'
$artifacts=@{
  q4=@{name='model_q4.onnx'; hash='d43d836fc5e240df9013733ccd214972c5d21bd9ec47e574e4f1e359cf90aed0'}
  q4f16=@{name='model_q4f16.onnx'; hash='9e33a5911974174761d0dfdcc0bec975d9c45af0eae5e9eb647b8ba9442a8f91'}
}
$selection=$artifacts[$Quantization]
$root=[System.IO.Path]::GetFullPath($Destination)
$folder=Join-Path $root 'onnx-community/Qwen3-0.6B-ONNX'
$weight=Join-Path (Join-Path $folder 'onnx') $selection.name
$metadata=@('config.json','generation_config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','added_tokens.json')
Write-Host 'Ombro-amigo: isolated ONNX model provisioning'
Write-Host ('Pinned revision: '+$revision)
Write-Host ('Selected weight: '+$selection.name)
Write-Host ('Target: '+$folder)
if($Download){
  if(-not (Get-Command hf -ErrorAction SilentlyContinue)){throw "Hugging Face CLI 'hf' is not installed. Install it manually before provisioning."}
  New-Item -Path $folder -ItemType Directory -Force | Out-Null
  $files=@($metadata | ForEach-Object {$_})+@('onnx/'+$selection.name)
  & hf download $repository --revision $revision --local-dir $folder --include $files
  if($LASTEXITCODE -ne 0){throw 'Hugging Face download failed. Do not run inference.'}
}else{
  Write-Host 'Dry run only. No download will occur. Use -Download only after reviewing licenses and storage.'
}
if(-not (Test-Path $weight -PathType Leaf)){
  Write-Host 'Weights not present; hash verification pending.'
  if($Download){throw 'Expected ONNX weight was not downloaded.'}
  exit 0
}
$actual=(Get-FileHash -LiteralPath $weight -Algorithm SHA256).Hash.ToLowerInvariant()
if($actual -ne $selection.hash){throw ('SHA-256 mismatch for '+$selection.name+'. Refuse inference.')}
foreach($file in $metadata){
  if(-not (Test-Path (Join-Path $folder $file) -PathType Leaf)){throw ('Missing metadata file: '+$file)}
}
Write-Host 'Weight SHA-256 matches the pinned artifact and required metadata files are present.'
Write-Host 'IMPORTANT: Runtime WASM and tokenizer compatibility are NOT verified here.'
Write-Host 'Next: run the offline preflight and inference only in an isolated, network-disabled test environment.'
