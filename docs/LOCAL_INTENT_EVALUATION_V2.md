# Avaliação independente de intenção pt-BR e laboratório ONNX local

**Estado:** ferramenta de pesquisa e engenharia; ainda não conectada ao app, não validada clinicamente.
Dependências: PR #32 (contexto) → PR #33 (baseline lexical) → PR #34 (avaliação/ONNX lab).

## 1. Corpus de avaliação congelado

\`tests/fixtures/local-intent-eval-v2.mjs\` contém **320 frases totalmente fictícias**, distribuídas em:

- oito classes balanceadas, com 40 frases por classe;
- cinco famílias de paráfrases por classe, oito frases por família;
- classes \`clarify\`, \`summary\`, \`continue\`, \`uncertainty\`, \`scope_all\`, \`stop\`, \`skip\`, \`other\`;
- negativos difíceis: citação literal, fala de terceiro, negação, narrativa de eventos antigos e relato comum.

NÃO há relatos pessoais, prontuários, dados de pacientes nem qualquer recolhimento pela PWA.

A função \`validateEvaluationFixtures()\` falha se alguma frase tiver repetição normalizada,
igualdade literal com o corpus experimental de treino ou origem diferente de
\`synthetic-eval\`. Isso **não prova independência semântica**: parte do vocabulário,
das intenções e das estruturas linguísticas continua relacionada ao corpus de treino.

\`partitionByFamily()\` mantém cada família inteira em apenas um dos dois subconjuntos:

| Subconjunto | Famílias | Frases | Uso |
|---|---:|---:|---|
| Validação | 8 | 64 | Inspecionar comportamento e desenvolver arquitetura |
| Holdout | 32 | 256 | Comparação final, sem ajustar limiares repetidamente |

**Importante:** mesmo o holdout tem limitações de diversidade e foi redigido pela
mesma equipe. Para uma avaliação mais realista, envolver revisores independentes
e criar cenários inéditos antes de desenvolver o próximo modelo.

## 2. Reproduzir o baseline atual sem internet

Dentro do repositório, com Node.js 20+:

\`\`\`powershell
node scripts/evaluate-local-intent-v2.mjs
\`\`\`

O relatório JSON contém apenas estatísticas agregadas — nenhum texto de relato:

- acurácia e macro-F1 da **hipótese candidata**, mesmo que tenha sido rejeitada;
- precisão entre as ações aceitas e **cobertura das classes permitidas**;
- matriz de confusão separada para hipóteses e ações permitidas;
- falsos acionamentos nas classes \`stop\`, \`skip\` e \`other\`;
- taxa e motivos de abstenção e recall por intenção;
- bloqueios de publicação independentes do escore.

Um teste de CI passando significa apenas que as medições são reproduzíveis e
que as regras de segurança **não foram modificadas**; não significa aprovação
clínica, desempenho suficiente nem capacidade de conversa natural.

## 2.1 Resultados reais do baseline no holdout sintético

Na execução de CI do commit \`b19dbd5\`, a suíte reportou **261 testes
aprovados**. O conjunto de **256 frases sintéticas do holdout** teve:

| Métrica | Resultado | Interpretação |
|---|---:|---|
| Macro-F1 da intenção candidata (oito classes) | **0,6758** | Classificação de hipótese, incluindo as hipóteses posteriormente rejeitadas |
| Acurácia da intenção candidata | **67,58%** | Proporção de hipóteses corretas em frases sintéticas |
| Precisão das ações aceitas | **96%** | 24 acertos entre 25 decisões aceitas; amostra pequena |
| Cobertura das cinco classes acionáveis | **15%** | Reconhece poucas das intenções que poderia sugerir |
| Falsos acionamentos em \`stop\`, \`skip\` ou \`other\` | **1** | Bloqueador de ativação: uma frase protegida recebeu sugestão indevida |
| Abstenções | **231/256** | Política conservadora reduz cobertura e risco, mas não zera falsos positivos |

**Decisão:** não conectar o classificador à UI, não alterar thresholds
usando o holdout e não declarar segurança ou compreensão semântica. Uma
classificação incorreta em classe protegida já impede habilitação automática.
O conjunto sintético não representa a distribuição de relatos reais.

## 3. Laboratório experimental ONNX (opcional)

O código em \`experiments/onnx-lab/\` pode comparar o baseline lexical com um
encoder de embeddings ONNX quantizado, utilizando **exclusivamente arquivos
locais previamente obtidos, aprovados e conferidos por hash**.

A PWA **não** incorpora \`@huggingface/transformers\`, ONNX, modelo neural,
download de pesos, CDN ou inferência remota nesta etapa. O laboratório possui
seu próprio \`package.json\`, fora do app publicado, e não é carregado pela UI.

### Pré-requisitos de pesquisa (ainda NÃO atendidos no repositório)

1. Selecionar encoder de português/multilíngue com licença e model card revisados.
2. Converter/quantizar o encoder para ONNX compatível com Transformers.js.
3. Guardar o pack *fora do repositório Git*, por exemplo:
   \`C:\LaboratorioLocal\modelos\encoder-ptbr-q8\`.
4. Criar um \`manifest.json\` no diretório do pack, contendo:
   - \`modelName\` (nome da pasta, sem separadores);
   - \`modelRevision\` (SHA/revisão exata);
   - \`license\` (licença verificada);
   - \`approvedForExperiment: true\` **somente após avaliação da licença**;
   - \`files\` com **TODOS** os arquivos obrigatórios e seus SHA-256.
5. Instalar a versão fixada de Transformers.js no ambiente isolado do
   laboratório, não na raiz da PWA. Essa instalação de dependências é uma
   ação de desenvolvimento separada; **não implica baixar relatos nem
   habilitar modelos no site**.

Formato ilustrativo, hashes deliberadamente inválidos:

\`\`\`json
{
  "modelName": "encoder-ptbr-q8",
  "modelRevision": "SHA_DA_REVISAO_DA_ORIGEM",
  "license": "LICENCA_VERIFICADA_MANUALMENTE",
  "approvedForExperiment": true,
  "files": [
    {"path": "config.json", "sha256": "SUBSTITUIR_SHA256_REAL"},
    {"path": "tokenizer.json", "sha256": "SUBSTITUIR_SHA256_REAL"},
    {"path": "onnx/model_quantized.onnx", "sha256": "SUBSTITUIR_SHA256_REAL"}
  ]
}
\`\`\`

Com um pack aprovado e todas as dependências do laboratório presentes:

\`\`\`powershell
node experiments/onnx-lab/bench-local-onnx.mjs --model-root "C:\LaboratorioLocal\modelos" --model-name "encoder-ptbr-q8" --split validation --max-samples 64
\`\`\`

O script confere licença sinalizada, nome/revisão declarados, existência e hash
dos arquivos listados, configura \`env.allowRemoteModels = false\`,
\`env.allowLocalModels = true\`, caminho de arquivos locais e bloqueia
\`fetch\` neste processo. Se o modelo, tokenizer ou runtime WASM não puder ser
carregado localmente, **deve falhar**, nunca recorrer silenciosamente a CDN.
Os valores de similaridade e margem são **heurísticas não calibradas**.

O laboratório só utiliza o corpus sintético, compara ambos os classificadores
no MESMO subconjunto e informa latência (p50/p95), memória RSS,
precisão/recall/abstenção e falsos acionamentos. Ele não integra nenhum modelo
ao app. Não imprimir textos de avaliação, embeddings ou entradas particulares.

**Limitação atual:** nenhum pack ONNX validado foi incorporado ou benchmarkado
neste PR. O código habilita o procedimento, não comprova desempenho neural.
A compatibilidade de runtime e os caminhos WASM dependem do pack/versionamento
específico. Validação real em Android/iPhone permanece pendente.

## 4. Segurança e gates

- As regras determinísticas de crise, autonomia, parar, pular, resumo e
  diagnóstico permanecem soberanas.
- Classificadores são **auxiliares**. Repetição de perguntas e ambiguidades
  devem ser reduzidas primeiro com o estado conversacional do PR #32.
- O score é similaridade, **não probabilidade clínica** e não serve para
  classificar risco psicológico.
- Atributos derivados de conversa real são dados sensíveis: não salvar
  embeddings, prompts ou outputs de pessoas em logs.
- Sem bypass da CSP \`connect-src 'none'\`, armazenamento cifrado e
  suporte offline.
- Antes de ativar um encoder no produto, exigir testes adversariais,
  avaliação humana cega, hardware real, model card/licença, integridade,
  limite de RAM e garantia de fallback.
- **Nenhuma variante** com diagnóstico, conteúdo inventado na síntese,
  pressão para revelar detalhes, incentivo a dependência ou instrução de
  urgência perigosa pode ser publicada.

Fonte de desenho: pesquisa técnica de 22 páginas enviada pela equipe e
\`docs/LOCAL_AI_ARCHITECTURE.md\`. Documento experimental, não substitui
supervisão/revisão de profissionais da Psicologia.
