# Avaliação humana das primeiras sínteses ONNX locais

Este experimento só grava conteúdo de texto quando a pessoa responsável pelo teste define explicitamente `SYNTHETIC_REVIEW_OUTPUT`. A fonte é o conjunto de seis casos artificiais internos (`SYNTHETIC_CASES`); **nunca use relatos privados, pacientes reais ou produção**.

## Como gerar o relatório de revisão

Depois de provisionar o modelo e os arquivos do runtime local, seguindo `research/WINDOWS_LOCAL_MODEL_PROVISION.md`, execute em ambiente de desenvolvimento isolado **sem internet**:

```powershell
$env:LOCAL_MODEL_ROOT = 'C:\OmbroExperimento\modelos'
$env:LOCAL_WASM_ROOT = 'C:\OmbroExperimento\wasm'
$env:SYNTHETIC_REVIEW_OUTPUT = 'C:\OmbroExperimento\revisao-sintetica.json'
node scripts/run-local-onnx-trial.mjs
```

O programa tenta executar **inferência real** apenas se os arquivos locais e a biblioteca correspondente estiverem instalados. Se não estiverem, falha de maneira explícita. Ele não faz download por conta própria.

A saída no terminal contém somente métricas. Quando solicitado, o JSON local mostra para cada caso: texto fictício de entrada, texto gerado pelo modelo, sinalizações lexicais e formulário de revisão marcado inicialmente `not-reviewed`. Não sobrescreve arquivos existentes.

## Critérios de revisão

Para cada caso, um avaliador marca manualmente se houve:
- Inversão de negação;
- Atribuição ao usuário de sentimentos ou acontecimentos de terceiros;
- Alteração indevida da sequência temporal;
- Causalidade, diagnóstico ou outra alegação não sustentada;
- Omissão de informação importante;
- Problemas de naturalidade em português brasileiro.

**Nenhum resultado poderá ser considerado aprovado automaticamente.** A verificação lexical é incompleta, e fontes exatas não comprovam que uma reescrita está semanticamente correta. O uso comercial, clínico ou com relatos reais está fora deste experimento.

## Estado verificado

Esta entrega implementa o mecanismo de *revisão*, não prova que o modelo foi executado ou que sua qualidade seja adequada. A execução em hardware físico ainda é necessária; a biblioteca Transformers.js e os pesos não são empacotados no aplicativo publicado.
