# Pacote de revisão profissional

Status: **infraestrutura preparada; nenhuma revisão profissional foi realizada por este código**.

## Objetivo

Transformar o protocolo de revisão já definido em um material reproduzível e cego para psicólogos revisores, sem coletar conversas reais e sem confundir revisão de comportamento com validação clínica.

## Conteúdo

- `tests/review/cases.json`: casos fictícios e adversariais padronizados;
- `review/packet.js`: simula o comportamento da versão avaliada e separa material cego do gabarito técnico;
- `scripts/generate-review-packet.mjs`: gera um pacote Markdown para os revisores e uma chave separada para a equipe;
- `tests/review/review-packet.test.mjs`: garante cegamento básico, reprodutibilidade e fidelidade estrutural das sínteses.

## Gerar uma rodada

```bash
node scripts/generate-review-packet.mjs --seed=rodada-1 --out=review-output
```

A pasta gerada contém:

- `review-packet.md`: entregar ao revisor;
- `review-key.json`: manter fechado até as notas estarem concluídas;
- `review-metadata.json`: seed, quantidade de casos e horário de geração.

Use seeds diferentes para as duas rodadas recomendadas pelo protocolo. O seed serve apenas para embaralhamento reproduzível; não é mecanismo criptográfico.

## Regras de uso

1. congelar SHA/versão antes de gerar;
2. gerar pacote com seed registrado;
3. enviar **somente** `review-packet.md` aos revisores;
4. coletar notas de forma independente;
5. só então abrir `review-key.json`;
6. registrar divergências por caso e regra;
7. qualquer evento bloqueador deve impedir alegações de prontidão até correção e nova rodada.

## Limites

Os casos são sintéticos e não representam a diversidade completa de usuários, contextos culturais ou linguagem. Uma boa nota neste pacote não demonstra eficácia clínica, diagnóstico correto, redução de sintomas nem segurança em todos os contextos.

Conversas reais não devem ser adicionadas a este corpus sem consentimento específico, análise de privacidade e protocolo ético apropriado.
