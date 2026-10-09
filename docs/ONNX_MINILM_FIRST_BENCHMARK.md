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

## Calibração pré-registrada — 64 frases fictícias de validação

[GitHub Actions — validação 37866246943](https://github.com/madeirareflo/Ombro-amigo/actions/runs/37866246943)

- O pipeline neural carregou em 920,8 ms no runner Linux e encerrou com 633,5 MiB RSS.
- Sob os limites originais 0,80/0,08, aceitou 0 de 64 frases.
- A varredura considerou 25 combinações previamente definidas de similaridade e margem.
- Seleção sobre validação APENAS: similaridade mínima **0,50**, margem mínima **0,04**.
- Com esses limites, **25/64 aceitas; 25/25 corretas** e **0 falsos acionamentos nas 24 frases de classes protegidas**.
- Isso corresponde a 62,5% de cobertura das 40 frases de classes acionáveis na validação, mas o limite foi selecionado nesse próprio conjunto, portanto o resultado pode ser otimista.
- Esses parâmetros ficam congelados para uma única avaliação no holdout (256 frases) e NÃO serão recalibrados com base no holdout.

### Protocolo do holdout

- Modelo e revisão: **2c4055b12046f11709e9df2c122e59ffbdc2f900**, q8.
- Frases de treino por classe: **8** (inalteradas).
- Split: **holdout** fixo de 256 frases, sem repetição das 64 famílias de validação.
- Limiares: **similaridade 0,50** e **margem 0,04**.
- Avaliar macro-F1 candidato, precisão de decisões aceitas, cobertura, abstenções e **falsos acionamentos em stop/skip/other**.
- Um único falso acionamento de classe protegida bloqueia qualquer aproximação de uso real; zero falsos sintéticos não garante segurança clínica.
- Após observar o resultado, NÃO usar o mesmo holdout para novas escolhas de limiar; criar nova amostra independente para qualquer iteração.
## Próximos passos e travas

1. Varredura de limiares SOMENTE com as 64 frases sintéticas de validação, sem escolher limiares a partir do holdout.
2. Rejeitar qualquer candidato com falso acionamento de stop/skip/other; revisão humana antes de permitir ações.
3. Congelar limiares e revisão do modelo; só então comparar no holdout sintético de 256 frases, sem reajustar após ver o resultado.
4. Testar em telefones reais com WASM/WebGPU e falha de cache, acompanhado de avaliação cega por psicólogos.
5. A camada determinística de safety, consentimento, interrupção e síntese continuará soberana, independentemente do escore de IA.

Os 262 testes do repo passaram na execução inicial; são testes de engenharia, não evidência de eficácia terapêutica.

## Resultado final do holdout pré-registrado — NÃO APROVADO

[Workflow do holdout 37866397607](https://github.com/madeirareflo/Ombro-amigo/actions/runs/37866397607)
Revisão executada: 2c4801ececcc60e31573672f1847ed2661a0c800.

Modelo, revisão, oito exemplos de treino por classe e limiares (similaridade 0,50; margem 0,04) foram congelados ANTES desta execução. Foram usadas 256 frases sintéticas de 32 famílias reservadas, com oito classes equilibradas.

| Indicador | Lexical | MiniLM neural |
|---|---:|---:|
| Acurácia da classe candidata | 67,58% | 73,05% |
| Macro-F1 da classe candidata | 0,6758 | 0,7200 |
| Decisões aceitas | 25/256 | 130/256 |
| Decisões aceitas corretas | 24 | 102 |
| Precisão entre aceitas | 96% | **78,46%** |
| Cobertura das classes permitidas | 15% | 71,25% |
| Falsos acionamentos sobre classes protegidas | 1/96 | **16/96** |
| Abstenções | 231 | 126 |

### Decisão

**NÃO ATIVAR.** O encoder reconhece melhor a classe candidata, mas 16 de 96 frases que deveriam ser protegidas receberam uma intenção acionável incorreta no laboratório. Isso NÃO ocorreu com usuários reais: são apenas decisões simuladas no teste. O resultado não satisfaz o gate de segurança, não permite usar o modelo para orientar escolhas de usuários e torna indefensável uma publicação automática.

Limiares NÃO serão reajustados usando esse holdout. A partir de agora, este conjunto passa a ser evidência histórica de falha, não um conjunto independente para novas otimizações. Futuras tentativas exigem novas famílias de frases, revisão independente, controles determinísticos invioláveis e avaliação cega.

Desempenho Linux no holdout: carregamento 1.062,1 ms, p50 4,1 ms, p95 5,3 ms e RSS final de 658 MiB. Smartphones e navegadores móveis continuam não testados. O job GitHub Actions terminou com sucesso no sentido de execução do experimento; **isso não significa aprovação do modelo para o produto**.

### Melhor caminho arquitetural após o experimento

1. Manter comandos de parar, pular, consentimento, síntese e segurança exclusivamente no motor determinístico.
2. Para linguagem ambígua, modelos locais podem sugerir uma pergunta de esclarecimento, mas não atribuir fatos ou ativar transições sem confirmação explícita.
3. Avaliar seleção de frases revisadas por profissionais com regras de elegibilidade, explicação e fallback. Não chamar um catálogo não revisado de resposta clinicamente validada.
4. Construir uma nova avaliação adversarial independente em pt-BR (negação, citação, terceiros, histórico, ironia, abreviações) antes de qualquer novo ajuste de modelo.
5. Só depois medir um encoder menor em Android/iOS, sem download automático no aparelho, e validar consumo de memória e privacidade.
