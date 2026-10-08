# Claims policy

## Claims permitidos nesta fase

- “Ajuda a organizar o que você quer levar para a sessão.”
- “Cria um rascunho editável a partir do que você escreveu.”
- “O conteúdo da conversa não é enviado automaticamente.”
- “Você pode pular perguntas, editar e apagar seus dados locais.”

## Claims proibidos sem evidência própria e revisão adequada

- “Trata ansiedade/depressão.”
- “Reduz sintomas.”
- “Previne crises.”
- “Detecta risco de suicídio.”
- “Melhora a eficácia da psicoterapia.”
- “Substitui ou complementa clinicamente seu psicólogo.”
- “Entende suas emoções.”
- “Identifica trauma, transtornos ou dependência.”

## Regra para interface, README e materiais

Todo texto promocional ou de onboarding deve ser verificável pelo comportamento real do produto. Se uma frase puder ser interpretada como promessa clínica, ela deve ser removida ou submetida à revisão antes de publicação.


## Gate automatizado

O repositório mantém um gate de regressão em `tests/claims/claims-policy.test.mjs`.

Ele verifica superfícies públicas e respostas estáticas de runtime contra formulações positivas que implicariam diagnóstico, prescrição, tratamento, prevenção de crise, detecção de risco, substituição do psicólogo, entendimento humano ou eficácia clínica.

O gate é propositalmente conservador e **não substitui revisão humana de comunicação**. Uma frase pode ser enganosa mesmo sem corresponder literalmente a um padrão proibido. Mudanças de posicionamento, marketing, onboarding ou mensagens de segurança continuam exigindo revisão pelo escopo declarado do produto.
