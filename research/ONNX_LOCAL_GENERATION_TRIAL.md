# Experimento ONNX local para reescrita de relatos — **não integrado ao app**

## Candidato inicial (não aprovado)

Modelo: `onnx-community/Qwen3-0.6B-ONNX` (https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX).

Racional: o repositório oferece artefatos ONNX indicados para Transformers.js e o candidato tem dimensões menores que muitos LLMs. Isso **não demonstra** que será compatível com Safari/iOS, que o português será bom ou que caberá na memória de celulares. Conferir o commit, a licença dos pesos/modelo base, nomes das variantes ONNX e limites de RAM antes do download.

Biblioteca: `@huggingface/transformers` com `env.allowRemoteModels=false`, `env.allowLocalModels=true` e caminhos locais tanto para pesos quanto para o runtime WASM (https://huggingface.co/docs/transformers.js/api/env). Não há dependência instalada no app e nenhuma versão foi fixada ainda. O MiniLM já reprovado no PR #35 não foi reutilizado.

## Execução isolada e opt-in

1. Em uma máquina de desenvolvimento, fora de dados de usuário e sem publicar, instalar uma versão **fixada** de `@huggingface/transformers` após revisão de licença e supply chain. O módulo do app não importa essa biblioteca.
2. Provisionar antecipadamente arquivos exatos do modelo em `<LOCAL_MODEL_ROOT>/onnx-community/Qwen3-0.6B-ONNX/`. `config.json`, tokenizadores e arquivos ONNX necessários para a variante escolhida devem estar presentes. Anotar commit/hash e quantização.
3. Provisionar localmente todos os arquivos WASM do ONNX Runtime em `<LOCAL_WASM_ROOT>/`, na versão correspondente à biblioteca.
4. Desligar o acesso de rede da máquina e executar:

```bash
LOCAL_MODEL_ROOT=/caminho/para/modelos \
LOCAL_WASM_ROOT=/caminho/para/wasm \
node scripts/run-local-onnx-trial.mjs
```

O runner recusa pesos não provisionados e a ausência de runtime WASM local. Ele não baixa arquivos. Usa apenas seis relatos **sintéticos**, gera textos, registra duração por caso e passa a saída por um filtro estrutural de segurança. Não imprime conteúdo gerado nem textos da pessoa; não há coleta de telemetria.

**Atenção:** testes de código usam um *mock*. Passar no CI não significa que o modelo real executou. Caso o backend ainda exija artefatos ausentes ou uma variante não suportada, o teste real deverá falhar e o candidato será reavaliado. O runner ainda não mede pico real de RAM, energia, tamanho dos pesos nem latência em celular. Não há garantia de que o caminho do runtime configurado cubra todos os arquivos de execução em determinada versão.

## Critérios para aceitar experimento, não publicação

- Registrar hash dos artefatos, licença, tamanho exato e comando reproduzível.
- Medir tempo por saída, sucesso e falhas de inicialização. Coletar memória/energia em ambiente controlado, sem identificadores e somente com consentimento.
- Exigir avaliações de falhas críticas em negação, terceiro, tempo, diagnóstico, causalidade e omissões. Um *gate* lexical pode apenas reprovar erros óbvios; **não prova** fidelidade.
- Testar aparelhos físicos Android e iOS e funcionamento offline. Sem desempenho medido não inserir o modelo no site.
- Revisão psicológica dos textos e UX antes de qualquer alegação de benefício clínico.

Estado atual: **somente runner, casos sintéticos, testes unitários e protocolo**. Pesos do modelo não estão no repositório, nenhum download de modelo é feito por CI e nenhum benchmark de inferência real foi executado neste PR.
