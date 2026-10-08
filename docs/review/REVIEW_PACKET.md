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
- `review-metadata.json`: seed, quantidade de casos, SHA da versão, hashes SHA-256 dos casos/pacote/chave e horário de geração.

Use seeds diferentes para as duas rodadas recomendadas pelo protocolo. O seed serve apenas para embaralhamento reproduzível; não é mecanismo criptográfico.

O gerador resolve automaticamente `git rev-parse HEAD`. Se o material for gerado fora de um checkout Git, informe explicitamente `--sha=<commit>`. O comando falha se não houver um SHA válido: uma rodada sem versão congelada não é considerada rastreável.

Os hashes SHA-256 servem para conferir que os arquivos entregues e a chave técnica não mudaram depois da geração. Eles não protegem o material contra uma pessoa que possa substituir simultaneamente arquivo e metadata.

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


## Consolidação das notas

O módulo `review/scoring.js` normaliza e agrega respostas independentes sem permitir que médias escondam eventos bloqueadores.

A consolidação exige:
- pelo menos dois revisores;
- IDs de revisor pseudônimos e distintos;
- o mesmo SHA de versão em todas as respostas;
- ratings de 1 a 5 ou N/A;
- códigos de bloqueio pertencentes ao vocabulário controlado.

Qualquer código de bloqueio mantém `releaseBlocked=true`, mesmo que as médias sejam altas. Caso não avaliado por todos também impede concluir a rodada. Divergências de 2 ou mais pontos em qualquer dimensão são destacadas para discussão.

O agregador não decide se o produto é clinicamente eficaz e não transforma opinião profissional em “validação clínica”.


## Consolidar respostas

Depois que pelo menos dois revisores fecharem suas notas independentemente, salve cada resposta no formato aceito por `review/scoring.js` e rode:

```bash
node scripts/aggregate-review-responses.mjs --out=review-aggregate.json reviewer-a.json reviewer-b.json
```

O comando rejeita rodada com menos de dois revisores, versões de código diferentes, ratings inválidos ou códigos bloqueadores desconhecidos. O resultado mantém `releaseBlocked=true` sempre que houver bloqueador ou caso incompleto; notas altas não anulam esse estado.
