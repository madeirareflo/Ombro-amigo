# Próximo movimento conversacional local — catálogo neutro experimental

**Status: RASCUNHO DE ENGENHARIA NÃO REVISTO POR PSICÓLOGOS.** Não é aconselhamento clínico nem autorização de publicação.

## Motivação e decisão de segurança

No holdout sintético de 256 mensagens, o encoder MiniLM do PR #35 aceitou 130 classificações, com 16 falsos acionamentos em mensagens protegidas (`stop`, `skip`, `other`). Por isso não deve controlar a conversa, mesmo que seus embeddings reconheçam melhor algumas paráfrases. O experimento neural permanece independente e reprovado para ativação.

Este PR volta à branch segura de contexto #32. Implementa uma camada **determinística e transparente**, não um novo modelo neural, para escolher próximos movimentos com menor repetição. Ele não depende dos PRs #33–#35 nem altera o site publicado.

## Arquitetura de seleção

1. `app/main.js` continua executando o bloqueio determinístico de perigo imediato antes de chamar o motor de conversa.
2. `conversation/engine.js` reconhece controles explícitos (`clarify`, `continue`, `summary`, `skip`), limites clínicos, correção, assunto sensível e sinais declarados antes de qualquer texto do catálogo.
3. **Somente nos caminhos não protegidos** de continuação comum e fallback neutro o motor pede um candidato a `neutral-response-catalog.js`.
4. O seletor escolhe por `mode`, canal (`fallback` ou `continue`), ID já usado e dimensões perguntadas recentemente. Não analisa nem rotula emoções, intenções ou sintomas.
5. Cada opção traz texto estático, `catalogId`, regra do motor `CONV-REFLECT-01`, dimensão e `reviewStatus=engineering-draft-not-clinically-reviewed`.
6. O motor guarda somente os IDs escolhidos em `state.context.catalogHistory`; como parte da sessão, o histórico usa a persistência cifrada local existente. Não há telemetria, API, modelo neural nem nova permissão de rede.
7. Se não houver candidato elegível, o fallback determinístico anterior permanece disponível.

## Regras de segurança

- Uma pergunta por turno, linguagem opcional e sem diagnósticos ou fatos inventados.
- Não guardar a hipótese de modelo como fato ou como emoção do usuário.
- `stop` e `skip` continuam comandos determinísticos: a variante digitada de `skip` utiliza a mesma resposta de pular pergunta acionada pelo botão.
- Não permitir que falas de terceiros, relatos históricos ou citações acionem pedidos de `skip`.
- O modo `record` não ativa o catálogo; anotações curtas continuam literais.
- Em assunto sensível, o motor oferece opção de registrar, não de revelar detalhes.
- No pedido de síntese, apenas as declarações do usuário podem integrar o rascunho.

## Escopo dos testes

- Integridade de metadados, IDs únicos e formulações com no máximo uma pergunta.
- Validação estática contra algumas expressões clínicas evidentemente proibidas (sem alegar revisão profissional).
- Continuidade de até dez turnos sem repetir prompts do catálogo e sem alterar entradas declaradas.
- Priorização de `stop`, pedido de diagnóstico, correção, vínculo exclusivo, temas sensíveis, `summary`, `clarify` e `skip`.
- Sessões antigas sem `state.context`, armazenamento offline e ausência de APIs de rede.
- Testes existentes de segurança, privacidade, IndexedDB cifrado e compatibilidade de navegadores via CI.

## Critérios antes de qualquer merge/publicação

1. Revisão cega por psicólogos da adequação das formulações, com feedback rastreável por ID e versão.
2. Análise de diálogos fictícios longos, alternando dúvidas, mudanças de assunto, consentimento, pedido de parada e resumo.
3. Zero diagnósticos, zero fatos inventados, zero falsas garantias, zero coerção de detalhes íntimos e nenhuma violação das rotas de segurança.
4. Testes com Android/iPhone reais e disponibilidade offline.
5. Somente depois, se aprovado, PR específico de promoção e novo congelamento de versão de revisão.

**Este catálogo contém cerca de vinte formulações, não os 100–500 padrões profissionais sugeridos na pesquisa; é uma primeira validação de arquitetura e não um catálogo clínico final.**
