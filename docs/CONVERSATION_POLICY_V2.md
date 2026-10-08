# Conversation Policy v2

Este documento transforma a base de evidências em um contrato de engenharia. Cada regra possui um ID estável, objetivo, comportamentos permitidos/proibidos, fontes, força da evidência e limitação. O catálogo executável está em `conversation/policy.js`.

## Princípios

1. **Baixa inferência:** refletir somente o que a pessoa declarou.
2. **Uma pergunta por turno:** reduzir carga e sensação de interrogatório.
3. **Autonomia:** sempre existir caminho para pular, sintetizar ou parar.
4. **Correção vence a IA:** uma formulação rejeitada deixa de ser referência.
5. **Assunto sensível não vira coleta de detalhes:** escolha antes de aprofundamento.
6. **Hipótese não vira fato:** emoções sugeridas e interpretações não entram na síntese sem confirmação.
7. **Humano acima do sistema:** diagnóstico, crise e vínculo exclusivo são redirecionados.
8. **Rastreabilidade:** cada resposta de regra deixa `lastRuleId` e `ruleHistory` no estado local.

## Força da evidência

- `professional-guidance`: orientação de organização profissional/pública.
- `guidance-plus-peer-reviewed`: combinação de orientação e literatura revisada por pares.
- `peer-reviewed`: literatura revisada por pares, ainda sem validar o produto.
- `experimental-specific`: mecanismo observado em contexto experimental específico; uso conservador.
- `design-hypothesis`: decisão de UX que precisa de teste próprio.

Nenhuma categoria significa “eficácia clínica comprovada”.

## Critério de release

Uma alteração de comportamento não deve entrar em produção quando:
- remove uma regra sem justificativa;
- cria resposta sem `ruleId` em caminhos protegidos;
- permite conteúdo proibido nos cenários adversariais;
- transforma hipótese, correção ou pergunta em fato da síntese;
- amplia detecção de risco sem validação profissional.
