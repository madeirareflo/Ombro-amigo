# Jornada de um dia com Anti: ampliar repertório conversacional do Ombro-amigo

**Estado:** plano para uma sessão acompanhada, ainda não executada. Nenhum agente fica treinando em segundo plano e nenhuma publicação automática está autorizada.

## Objetivo do dia

Tornar as respostas em português brasileiro mais naturais e variadas **sem aumentar a quantidade de perguntas nem atribuir ao usuário emoções, causas, intenções ou diagnósticos que ele não declarou**. O fluxo preferido é: a pessoa escreve livremente, a ferramenta escuta, só ajuda a organizar quando solicitada, e toda síntese fica editável e sujeita a confirmação.

Neste projeto, “treinar repertório” significa **avaliar e melhorar padrões locais de resposta, regras de seleção, exemplos sintéticos e testes adversariais**. Não significa fine-tuning de uma rede neural. Um LLM totalmente local ainda precisa de benchmark real de pesos, RAM, velocidade, qualidade e licença; não confundir mocks com inferência.

## Organização sugerida (aproximadamente oito horas, com pausas)

| Horário relativo | Trabalho com Anti | Saída verificável |
| --- | --- | --- |
| 00:00–00:45 | Auditoria das conversas artificiais e leitura dos PRs empilhados #32–#60 | Baseline com falhas e métricas, sem dados reais |
| 00:45–02:00 | Construir **60 diálogos sintéticos** variados: hesitação, silêncio, vergonha, ambivalência, luto, conflito familiar, ansiedade cotidiana, pedido para só escutar, desejo de parar e terceira pessoa | Corpus de avaliação versionado com intenção e limites claros |
| 02:00–03:15 | Criar **alternativas de resposta** para cada intenção, em linguagem coloquial pt-BR, evitando frases repetidas, perguntas seguidas e validações vazias | Catálogo local de candidatos, sem respostas clínicas e sem sugestão de diagnóstico |
| 03:15–04:00 | Pausa e revisão independente dos casos de atribuição, negação e risco | Lista das hipóteses rejeitadas |
| 04:00–05:15 | Anti executa testes A/B determinísticos com seed fixa, checa diversidade e taxas de falha por situação; comparar com baseline | Relatório objetivo por classe, incluindo regressões |
| 05:15–06:30 | Avaliação humana cega de pares (naturalidade, acolhimento não invasivo, fidelidade, autonomia, segurança). Idealmente revisão adicional por psicóloga, sem alegações clínicas | Planilha de julgamento com exemplos *somente fictícios* e desacordos |
| 06:30–07:30 | Revisar casos reprovados e corrigir regras de roteamento/repertório; evitar repetição e “interrogatório” | Mudanças pequenas e testáveis, com rollback fácil |
| 07:30–08:00 | Validar testes de unidade, Playwright Chromium/Firefox/WebKit e checagens offline; revisar PR | Relatório final e recomendação de manter ou descartar cada mudança |

## Regras obrigatórias para Anti

1. Operar em **branches experimentais e PRs em rascunho**. Nunca fazer merge ou mudar `main`, `pages-site`, GitHub Pages ou arquivos do usuário sem aprovação expressa.
2. Dados sintéticos apenas. Sem relatos de pacientes, telemetria, APIs externas, modelos de CDN, requisições de rede para texto de conversa; preservar CSP `connect-src 'none'`.
3. Não reutilizar o classificador MiniLM reprovado no PR #35. Não dizer que um modelo generativo está em execução enquanto só existirem testes simulados.
4. Respostas breves que acompanhem a pessoa, com opção de silêncio, recusa e escrita longa. Uma pergunta aberta **apenas quando ajuda**, sem formulário disfarçado.
5. Se o usuário disser “só queria falar”, a ferramenta não força perguntas. Se mencionar terceiros, não atribuir emoções de terceiros à pessoa.
6. Não fazer diagnóstico, aconselhamento médico, interpretação causal especulativa ou prometer sigilo absoluto. Fluxo de segurança existente não deve ser relaxado.
7. Toda variante deve ser vinculada a um cenário, resultado de teste e motivo; regressões bloqueiam inclusão na branch candidata.

## Critérios de aceitação

- **Zero** inversões de negação, atribuições indevidas a terceiros e fatos inventados nos cenários protegidos.
- **Zero** regressões nos testes existentes de segurança, privacidade, armazenamento cifrado e aprovações.
- Pontuação comparativa de naturalidade e acolhimento **medida por avaliadores**, não declarada pelo agente.
- Taxa de repetição e de perguntas desnecessárias não pode aumentar em relação ao baseline.
- Se os ganhos forem ambíguos ou houver riscos, manter a versão anterior e registrar o motivo.

## Primeiro pedido concreto para enviar ao Anti

> Audite a branch experimental mais recente do Ombro-amigo sem modificações de produção. Gere inicialmente 60 diálogos sintéticos em pt-BR separados por cenário, com casos adversariais de negação, terceiros, silêncio, ambivalência e recusa. Compare a resposta atual do motor com duas alternativas mais naturais **sem inventar emoções ou causas**. Registre os exemplos e métricas em `research/` e `tests/`. Não faça merge, deploy ou integração de rede. Ao final de cada bloco, mostre resultados, falhas e um PR draft pequeno para revisão.

## Preparação indispensável para iniciar de verdade

O Anti precisa estar disponível no ambiente do desenvolvedor ou por uma integração de acesso **segura e autorizada**. Este documento é um plano, não uma sessão ativa. Evitar o Bridge mutável enquanto seus problemas de integridade/isolamento não estiverem corrigidos.
