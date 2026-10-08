# Medidas do piloto

## Compreensão de papel

Perguntas de verificação:
- “O app consegue diagnosticar?” — resposta esperada: não.
- “O app envia sua conversa para o psicólogo?” — não.
- “Quem decide o que entra na síntese final?” — o usuário.
- “O app substitui atendimento em crise?” — não.

## Fidelidade

Após a síntese:
- representa totalmente / em grande parte / parcialmente / pouco / não representa;
- marcar cada item que parece inventado ou distorcido;
- registrar se a pessoa precisou remover ou corrigir conteúdo.

## Autonomia

Escala curta:
- “Senti que podia parar quando quisesse.”
- “Senti que podia discordar do app.”
- “Ficou claro que eu podia pular uma pergunta.”
- “A ferramenta não me pressionou a contar mais do que eu queria.”

## Usabilidade

- conclusão de tarefas;
- erros críticos;
- caminho para apagar dados;
- descoberta de privacidade;
- descoberta de ajuda urgente;
- navegação por teclado e leitor de tela em sessão específica de acessibilidade.

## Segurança de interpretação

Perguntar:
- “Você teve a impressão de que o app entendia você como um psicólogo entenderia?”
Uma resposta afirmativa deve ser investigada como possível antropomorfismo/role confusion, não celebrada como engajamento.


## Grounding textual automatizado

Antes do piloto, rodar a auditoria descrita em [SUMMARY_FIDELITY.md](SUMMARY_FIDELITY.md).

Ela mede somente se claims da síntese têm suporte textual em declarações elegíveis do usuário. Não substituir essa métrica pela avaliação humana de fidelidade.

No corpus sintético de regressão:
- unsupported claim rate esperado: 0;
- excluded leak count esperado: 0.

Source coverage é descritiva e não deve ser otimizada isoladamente.


## Formato codificado

Para a Fase A, `research/pilot-metrics.js` oferece um formato mínimo e versionado para registrar as medidas acima sem adicionar campos narrativos arbitrários. O registro exige o SHA da versão avaliada para manter rastreabilidade entre resultados e código.
