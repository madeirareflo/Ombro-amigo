# MiniLM ONNX real — primeiro teste isolado de CPU

**Estado:** experimento sintético, não integrado ao produto e sem validação clínica.
PRs dependentes: #32 (contexto) → #33 (baseline) → #34 (avaliação/ONNX) → #35 (execução com pesos).

## O que significa local

- Uma etapa de preparação baixa arquivos públicos do Hugging Face em um pacote temporário; ela NÃO transmite relatos de usuários.
- O benchmark faz inferência a partir de arquivos locais e desabilita o carregamento remoto de modelos.
- O aplicativo web atual não incorpora pesos, biblioteca neural ou downloads automáticos. Sua CSP e seu armazenamento cifrado não mudaram.
- Linux x86-64 do GitHub Actions NÃO representa Android, iOS, WebAssembly nem WebGPU no navegador.

## Proveniência

- Modelo: Xenova/paraphrase-multilingual-MiniLM-L12-v2 (encoder, não gerador de mensagens).
- Revisão: 2c4055b12046f11709e9df2c122e59ffbdc2f900.
- Variante: q8, onnx/model_quantized.onnx.
- SHA-256 ONNX: 66fc00f5f29afcaff34092e1bdd20008ca3918265a82fb9695a551e510cc4ebc.
- SHA-256 tokenizer: b60b6b43406a48bf3638526314f3d232d97058bc93472ff2de930d43686fa441.
- Licença do modelo de origem sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2: Apache-2.0; revisar atribuições e licença da versão exata antes de distribuir no site.
- Arquivos não entram no Git nem nos artefatos da PWA.

## Primeira execução real: 32 exemplos fictícios de validação

[GitHub Actions — benchmark 37866012118](https://github.com/madeirareflo/Ombro-amigo/actions/runs/37866012118)

| Medida | Baseline lexical | MiniLM ONNX q8 |
|---|---:|---:|
| Acurácia da intenção candidata | 65,63% | 71,88% |
| Macro-F1 candidata | 0,6657 | 0,7131 |
| Decisões aceitas | 3/32 | 0/32 |
| Precisão entre aceitas | 3/3 | Não mensurável |
| Cobertura de classes permitidas | 15% | 0% |
| Falsos acionamentos de classes protegidas | 0 | 0 |
| Abstenções | 29/32 | 32/32 |

Com similaridade mínima 0,80 e margem mínima 0,08, o MiniLM rejeitou todas as frases. Portanto NÃO está pronto para conduzir nenhuma conversa. As vantagens nas intenções candidatas são exploratórias, a amostra é pequena e sintética.

## Desempenho na máquina Linux do CI

- Tamanho total do pacote obtido: 129,1 MiB.
- Carregamento do modelo: 1.028 ms.
- Latência p50 de chamadas de embeddings: 3,6 ms.
- Latência p95 de chamadas de embeddings: 5,6 ms.
- RSS final do processo Node: 639,5 MiB; inclui biblioteca, runtime, buffers e processo, não apenas pesos.

Estes valores NÃO estimam tempo ou RAM de Android/iPhone. Ainda faltam medições de navegador, bateria, armazenamento, frio/quente e rede realmente desligada.

## Próximos passos e travas

1. Varredura de limiares SOMENTE com as 64 frases sintéticas de validação, sem escolher limiares a partir do holdout.
2. Rejeitar qualquer candidato com falso acionamento de stop/skip/other; revisão humana antes de permitir ações.
3. Congelar limiares e revisão do modelo; só então comparar no holdout sintético de 256 frases, sem reajustar após ver o resultado.
4. Testar em telefones reais com WASM/WebGPU e falha de cache, acompanhado de avaliação cega por psicólogos.
5. A camada determinística de safety, consentimento, interrupção e síntese continuará soberana, independentemente do escore de IA.

Os 262 testes do repo passaram na execução inicial; são testes de engenharia, não evidência de eficácia terapêutica.
