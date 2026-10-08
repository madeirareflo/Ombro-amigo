# Regras do motor de conversa

## Regra central

**Perguntar mais; concluir menos.**

A próxima pergunta deve responder ao que a pessoa acabou de dizer. O motor não deve seguir um questionário fixo quando já existe informação suficiente para escolher um caminho mais proporcional.

## Como a adaptação funciona

A versão inicial é deliberadamente determinística. Ela observa apenas sinais superficiais presentes no texto declarado pela própria pessoa, por exemplo:

- "não sei" ou dificuldade de explicar;
- referência explícita ao corpo;
- referência explícita a pensamentos;
- emoção nomeada pela própria pessoa;
- relação ou interação com alguém;
- autojulgamento;
- dificuldade de começar ou continuar um assunto.

Esses sinais **não são diagnósticos nem inferências clínicas**. Eles servem somente para selecionar a próxima pergunta de esclarecimento.

### Exemplo

Se a pessoa diz:

> "Sinto um aperto no peito."

O motor pode perguntar:

> "Você percebe quando isso aparece no corpo com mais força?"

Ele não deve concluir:

> "Isso é ansiedade."

## Profundidade escolhida pelo usuário

A profundidade controla o quanto a conversa insiste antes de oferecer uma síntese.

- **Só quero começar:** poucas perguntas e baixa exigência.
- **Posso falar um pouco:** pede exemplos e contexto quando útil.
- **Quero organizar isso a fundo:** permite ordenar acontecimentos e explorar o que está difícil de dizer.

Mesmo no modo mais profundo, o usuário pode encerrar a exploração e pedir uma síntese a qualquer momento.

## O sistema pode

- pedir esclarecimentos;
- pedir exemplos concretos;
- ajudar a separar acontecimentos, emoções declaradas, pensamentos e dúvidas;
- oferecer categorias amplas quando a pessoa não sabe por onde começar;
- reformular o que a própria pessoa disse;
- montar uma síntese em primeira pessoa;
- pedir confirmação antes de tratar a síntese como representativa.

## O sistema não pode

- diagnosticar;
- rotular;
- prescrever;
- afirmar interpretação clínica como verdade;
- apresentar inferência como emoção declarada;
- dizer que conhece o usuário melhor que o profissional;
- incentivar dependência emocional;
- enviar conteúdo automaticamente;
- esconder conteúdo do paciente em um painel profissional.

## Contradições

Contradição não é evidência de traço psicológico.

Preferir perguntas que reconheçam a coexistência de experiências sem concluir por um diagnóstico.

## Síntese

A síntese deve:

- usar primeira pessoa;
- ficar próxima às palavras do usuário;
- evitar linguagem técnica;
- ser totalmente editável;
- poder ser rejeitada;
- nunca ser enviada sem autorização explícita.


## Síntese estruturada

A síntese do MVP passa a separar quatro blocos:

1. **O que aconteceu** — fatos ou situações descritas pela própria pessoa.
2. **O que eu disse que senti** — somente emoções nomeadas explicitamente.
3. **O que está difícil de dizer** — apenas trechos em que a própria pessoa relata trava, evitação, vergonha de falar ou medo de contar.
4. **O que eu gostaria de levar para a sessão** — recorte curto do que a pessoa acabou de registrar, preservando suas palavras.

Se uma categoria não estiver sustentada pelo relato, o sistema deve mostrar que ela ainda não ficou clara, em vez de completar a lacuna por inferência.

A síntese continua sendo um rascunho editável. Ela não é interpretação clínica e não deve ser tratada como prontuário ou avaliação profissional.


## Limites comportamentais explícitos

Algumas respostas exigem um limite do produto antes de qualquer aprofundamento:

- **pedido de diagnóstico:** o sistema declara que não pode confirmar nem descartar diagnóstico e oferece ajuda para organizar o que será levado ao profissional;
- **vínculo exclusivo com a ferramenta:** o sistema não reforça exclusividade e redireciona o objetivo para comunicação humana;
- **pedido para parar:** o aprofundamento termina sem insistência;
- **experiências aparentemente contraditórias:** o sistema pode apontar as duas declarações lado a lado e perguntar se coexistem, sem nomear um traço ou mecanismo psicológico;
- **relato muito longo:** o sistema oferece organização por ordem ou prioridade, sem resumir por conta própria antes da confirmação.

Pedidos de diagnóstico e comandos de controle não entram como fatos na síntese estruturada.
