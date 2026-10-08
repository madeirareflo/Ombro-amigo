# IA conversacional local — arquitetura e critérios de validação

> Plano técnico incremental do Ombro-amigo. **Não é validação clínica** nem autorização de publicação.
> Baseado na pesquisa técnica de 22 páginas fornecida pela equipe em outubro de 2026.

## Escopo do produto

O aplicativo ajuda a pessoa a preparar e revisar o que deseja levar à sessão com um profissional.
Não oferece diagnóstico, prognóstico, prescrição, tratamento, classificação de risco ou substituição do vínculo humano.

**Ordem das camadas, sem exceções:**
1. Entrada da pessoa e verificações determinísticas de segurança/autonomia.
2. Classificação contextual de intenção, estritamente local.
3. Estado estruturado com a pergunta anterior, dimensões já abordadas e declarações atribuíveis.
4. Seleção de próximo movimento e padrões de linguagem previamente revisados.
5. Opcionalmente, sugestão de linguagem por modelo local pequeno.
6. Validação determinística de saída; caso seja reprovada, fallback seguro.
7. Armazenamento cifrado local e síntese editável de conteúdo declarado.

**O modelo jamais tem permissão para** revogar uma interrupção de segurança, atribuir emoções como fatos não declarados, pressionar por detalhes sensíveis ou produzir diagnóstico. O texto do usuário não deve ser transmitido para análise em nuvem.

## Fase A — estado e antirrepetição (PR #32)

- Guardar dimensão da pergunta anterior e histórico limitado das dimensões perguntadas.
- Associar respostas elípticas ao contexto da pergunta anterior; se ambíguas, pedir esclarecimento sem criar fatos.
- Evitar repetir a mesma dimensão nos três turnos recentes.
- Reduzir pressão depois de respostas repetidas de incerteza.
- Preservar controles de parar, pular, esclarecer, continuar e pedir síntese, bem como conversas cifradas de versões anteriores.
- **Não afirmar que as regras são compreensão semântica geral**.

Aceite: suíte pré-existente aprovada, novos testes multiturmo e casos de segurança aprovados. Nunca promover versão por notas médias se houver conteúdo inventado, diagnóstico, coerção ou instrução insegura.

## Fase B — classificador semântico local

- Corpus **fictício** pt-BR de aproximadamente 300–800 exemplos: afirmações curtas, elipses, negação, citação, correções, ambivalência, comandos e erros ortográficos.
- Definir contrato com `intent`, `topic`, `uncertainty`, `confidence` e `modelVersion`.
- Benchmark de encoder quantizado usando ONNX Runtime Web / Transformers.js com WASM e, quando disponível, WebGPU. Nenhum modelo externo é utilizado na fase A.
- Confiança insuficiente nunca vira fato; retorna ao motor conservador. Safety crítico continua anterior ao classificador.
- Avaliar macro-F1 por classe, erros em comandos e principalmente continuidade em diálogos de 5–12 turnos.

## Fase C — recuperação aprovada, sem geração livre

- Manter 100–500 padrões curtos revisados por psicólogos, com rótulo de revisão e condições de uso.
- Buscar em memória com comparação exata/cosseno; não introduzir infraestrutura vetorial pesada por antecipação.
- Jamais criar 'memória' persistente de inferências do usuário sem o mesmo nível de cifragem do relato.

## Fase D — LM local opcional e experimental

- Comparar Qwen3-0.6B Q4 e Gemma 3 1B Q4 em aparelhos reais, nunca assumir desempenho com base no tamanho do modelo.
- Entradas: estado estruturado curto, últimas interações e padrões revisados. Saída: um único movimento permitido e frase curta em JSON, validada antes de exibição.
- Tempo limite, falha de memória, dispositivo incompatível ou saída inválida voltam às regras existentes.
- Não descarregar modelos enormes automaticamente no celular. Informar tamanho, pedir aceite e verificar quota.
- Não flexibilizar `connect-src 'none'` silenciosamente. Qualquer download/alteração de CSP exige mudança explícita no threat model, revisão e prova de que relatos nunca saem do aparelho.

## Evidência e publicação

- Testes de regressão: pedidos de parar/síntese, negação/citação/terceiros, correções, dados não declarados, privacidade e navegador offline.
- Testes multiturmo: repetição semântica, utilidade do próximo movimento e coerência contextual.
- Metas de partida: zero conteúdo inventado na síntese; zero diagnóstico; zero incentivo a dependência; zero violação grave de segurança.
- Rodadas independentes e cegas de revisão por psicólogos, com commit SHA, política, parâmetros e (quando houver) hashes de modelo/corpus/prompt congelados.
- Não recolher conversas reais para treinamento ou logs de depuração sem protocolo específico, consentimento e revisão ética/privacidade.
- Tratar a fase A como mudança incremental de UX, não como evidência de eficácia terapêutica.

Documento de referência: **Ombro-amigo: pesquisa técnica para uma IA conversacional 100% local, mais natural e clinicamente conservadora**, fornecido à equipe (outubro de 2026).
