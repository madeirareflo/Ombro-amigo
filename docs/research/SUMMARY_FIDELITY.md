# Auditoria de fidelidade da síntese

Status: **auditoria automatizada de grounding textual; não é validação clínica nem substitui julgamento humano**.

## Pergunta que o teste responde

“Cada frase colocada pela síntese estruturada pode ser rastreada até uma declaração textual da própria pessoa?”

O teste **não** responde se:
- a categoria escolhida representa bem a intenção da pessoa;
- a seleção do que entrou ou ficou de fora foi útil;
- uma frase pode ser interpretada de maneira diferente em contexto;
- a síntese melhora uma sessão de psicoterapia.

Esses pontos exigem revisão humana e piloto.

## Métricas

### Unsupported claim rate

Número de claims da síntese que não correspondem a nenhuma declaração elegível do usuário dividido pelo número total de claims.

Para o corpus sintético de regressão, qualquer valor acima de zero é bloqueador de engenharia.

### Source coverage

Proporção de declarações elegíveis únicas que aparecem ao menos uma vez na síntese.

Cobertura **não é maximizada por princípio**. O produto pode excluir perguntas, comandos de controle e incerteza. Uma cobertura alta também não demonstra qualidade.

### Excluded leak count

Quantidade de mensagens classificadas como controle, pergunta ou incerteza que reaparecem como claim de síntese. O esperado no corpus de regressão é zero.

## Corpus

O arquivo `tests/research/summary-fidelity-corpus.json` contém somente histórias sintéticas. Ele cobre fatos, emoções, dificuldades, incerteza, pedido de diagnóstico, correção, parada, temas sensíveis, modo de registro e perguntas sobre reação do psicólogo.

## Gerar relatório

```bash
node scripts/generate-summary-fidelity-report.mjs --out=summary-fidelity-report.json
```

O relatório inclui o SHA da versão avaliada e um SHA-256 do corpus sintético. Por padrão o script usa `git rev-parse HEAD`; fora de um checkout Git, use `--sha=<commit>`. O comando falha se não conseguir vincular a execução a uma versão rastreável.

O hash do corpus ajuda a confirmar que dois relatórios usaram o mesmo material de entrada. Ele não substitui assinatura digital nem protege contra substituição simultânea do relatório e do arquivo de origem.

O relatório deve ser tratado como evidência de rastreabilidade textual, não como uma nota de “qualidade clínica”.

## Evolução

Depois da revisão profissional, o corpus pode receber novos casos sintéticos derivados de falhas observadas. Conversas reais não devem ser copiadas para testes sem consentimento específico e revisão de privacidade/ética.
