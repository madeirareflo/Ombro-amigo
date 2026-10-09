# Experimento manual no Windows — primeira inferência local

Este material prepara pesos do candidato ONNX para um **teste isolado**. Não modifica o aplicativo, não publica, não muda `main` e não envia relatos.

## Limites já confirmados

- Pesos `model_q4.onnx` (919 MB no Hugging Face), SHA-256 `d43d836fc5e240df9013733ccd214972c5d21bd9ec47e574e4f1e359cf90aed0`.
- Pesos `model_q4f16.onnx` (570 MB), SHA-256 `9e33a5911974174761d0dfdcc0bec975d9c45af0eae5e9eb647b8ba9442a8f91`.
- Página oficial: https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX/tree/main/onnx. A documentação upstream indica integração com Transformers.js, não compatibilidade garantida com telefones.
- A revisão de teste pinada é `b1ece21c06dfce3839272e86b7fa12a985d97a7a`. Se a revisão não existir ou não contiver os artefatos, o download deve falhar **sem trocar silenciosamente por main**.

## 1. Conferir o que será baixado

Em um checkout experimental (não no site publicado), abra PowerShell e execute:

```powershell
.\scripts\provision-qwen-onnx.ps1 -Destination 'C:\OmbroExperimento\modelos' -Quantization q4
```

O comando é **dry run** e não faz download.

## 2. Provisionar pesos, apenas quando decidir fazer o teste

Instale manualmente a CLI oficial `hf` (Hugging Face Hub), confira licenças do modelo e bibliotecas e reserve espaço adicional para arquivos temporários:

```powershell
.\scripts\provision-qwen-onnx.ps1 -Destination 'C:\OmbroExperimento\modelos' -Quantization q4 -Download
```

Os pesos serão gravados fora do repositório em `C:\OmbroExperimento\modelos\onnx-community\Qwen3-0.6B-ONNX`. Ao final, o PowerShell compara o SHA-256. Um hash inválido **interrompe** o processo. O script não baixa runtimes WASM nem instala dependências silenciosamente.

## 3. Iniciar uma sessão de inferência em ambiente isolado

A execução real requer uma versão conferida e fixada do Transformers.js, ONNX Runtime WASM correspondente e seus artefatos locais. Depois de provisioná-los, desligue a rede e execute o runner Node.js com `LOCAL_MODEL_ROOT` e `LOCAL_WASM_ROOT` apontando para os diretórios corretos (veja `research/ONNX_LOCAL_GENERATION_TRIAL.md`).

**Não execute ainda como se fosse uma funcionalidade pronta:** a integração entre runtime e quantização precisa ser validada, e a CLI de benchmark ainda não comprova qualidade.

A saída do runner inclui apenas métricas por caso sintético. Nenhuma conversa pessoal deve ser usada.

## 4. Critérios de avaliação

O teste precisa demonstrar que carrega o modelo, gera respostas em português usando textos sintéticos, funciona sem internet, respeita negação/atribuição a terceiros/tempo e não inventa causas. Registrar tempos e falhas reais de CPU e navegador; não deduzir compatibilidade iOS a partir do Windows.

**Situação atual:** os pesos não foram baixados neste ambiente; apenas o procedimento e seus testes foram preparados. Nenhuma inferência real foi realizada.
