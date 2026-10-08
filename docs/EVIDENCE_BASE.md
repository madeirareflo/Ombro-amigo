# Base de evidências do comportamento conversacional

> Este documento descreve **por que** certas regras do Ombro-amigo existem. As referências abaixo informam o design, mas **não validam clinicamente o produto**.

## Critério de seleção

Priorizamos organizações profissionais/públicas e literatura revisada por pares. A aplicação ao Ombro-amigo é deliberadamente conservadora: usamos princípios de comunicação, autonomia, privacidade e segurança, sem transformar essas fontes em alegação de tratamento.

## 1. IA como apoio, não como substituto clínico

### American Psychological Association — Health advisory (2025)

- Fonte: https://www.apa.org/topics/artificial-intelligence-machine-learning/health-advisory-chatbots-wellness-apps
- Aplicação:
  - não apresentar o sistema como psicoterapeuta;
  - não diagnosticar;
  - não tratar a resposta da IA como julgamento clínico;
  - evitar linguagem que incentive dependência;
  - manter caminho explícito para ajuda humana;
  - usar tarefas estreitas, como organizar pensamentos/perguntas para uma consulta.

### APA — Ethical guidance for AI in health service psychology (2025)

- Fonte: https://www.apa.org/topics/artificial-intelligence-machine-learning/ethical-guidance-ai-professional-practice.html
- Aplicação:
  - supervisão humana e responsabilidade;
  - rastreabilidade das fontes;
  - testes contínuos;
  - transparência sobre limites e privacidade.

### APA — Discussing AI use in therapy (2026)

- Fonte: https://www.apa.org/topics/artificial-intelligence-machine-learning/discussing-ai-use-therapy.html
- Aplicação:
  - priorizar usos estreitos, como registrar pensamentos/emoções e preparar temas para terapia;
  - não posicionar chatbot de uso geral como tratamento psicológico.

### SAMHSA — Artificial Intelligence in Mental Health Services (2026)

- Fonte: https://library.samhsa.gov/product/artificial-intelligence-mental-health-services/pep26-01-003
- Aplicação:
  - manter o uso do produto delimitado e auditável;
  - separar possibilidades tecnológicas de afirmações clínicas.

### NIMH — Technology and the Future of Mental Health Treatment

- Fonte: https://www.nimh.nih.gov/health/topics/technology-and-the-future-of-mental-health-treatment
- Aplicação:
  - privacidade como requisito;
  - evitar promessas acima da evidência;
  - tratar tecnologia como possível complemento, não substituto.

## 2. Escuta, reflexão e autonomia

### WHO — Psychological first aid: Guide for field workers (2011)

- Fonte: https://www.who.int/publications/i/item/9789241548205
- Aplicação:
  - não pressionar a pessoa a contar sua história;
  - linguagem simples e respeitosa;
  - não julgar;
  - não inventar informação ou oferecer falsa garantia;
  - permitir que a pessoa escolha quanto quer dizer.

O Ombro-amigo **não oferece psychological first aid**. Usamos apenas princípios gerais de comunicação não coercitiva compatíveis com o objetivo de preparação para psicoterapia.

### SAMHSA TIP 35 — Motivational Interviewing / OARS (2019)

- Fonte: https://library.samhsa.gov/sites/default/files/tip-35-pep19-02-01-003.pdf
- Aplicação das mecânicas gerais:
  - perguntas abertas;
  - escuta reflexiva;
  - resumo;
  - menor risco de transformar a conversa em interrogatório.

Ombro-amigo não aplica um protocolo de tratamento para transtorno por uso de substâncias.

### Resnicow & McMaster (2012) — Motivational Interviewing: moving from why to how with autonomy support

- Fonte: https://pmc.ncbi.nlm.nih.gov/articles/PMC3330017/
- Licença: CC BY 2.0.
- Aplicação:
  - reflexão como hipótese que o usuário pode corrigir;
  - agenda compartilhada;
  - menu de escolhas;
  - ausência de coerção/persuasão;
  - reflexões de dois lados quando a pessoa relata posições conflitantes.

## 3. Assuntos sensíveis e abordagem informada por trauma

### SAMHSA — Trauma-Informed Approaches and Programs

- Fonte: https://www.samhsa.gov/mental-health/trauma-violence/trauma-informed-approaches-programs
- Aplicação:
  - segurança;
  - confiança e transparência;
  - colaboração;
  - empowerment, voz e escolha;
  - evitar retraumatização.

### SAMHSA — Concept of Trauma and Guidance for a Trauma-Informed Approach (2014)

- Fonte: https://library.samhsa.gov/sites/default/files/sma14-4884.pdf

### SAMHSA — Practical Guide for Implementing a Trauma-Informed Approach (2023)

- Fonte: https://library.samhsa.gov/sites/default/files/pep23-06-05-005.pdf

**Regra derivada:** quando o próprio usuário nomeia explicitamente abuso, violência, estupro, agressão, assédio, luto, morte ou trauma, o motor não pede detalhes por padrão. Ele oferece três rotas: continuar com cuidado, apenas registrar ou transformar o conteúdo em algo para levar à sessão.

Não inferimos trauma quando o usuário não o nomeou.

## 4. Nomeação de emoções como hipótese opcional

### Kircanski, Lieberman & Craske (2012) — Feelings Into Words

- Fonte: https://pmc.ncbi.nlm.nih.gov/articles/PMC4721564/
- Aplicação conservadora:
  - oferecer palavras emocionais como opções, não como diagnóstico;
  - “alguma destas palavras chega perto — ou nenhuma?”;
  - somente considerar uma emoção “declarada” quando o usuário a escreve/confirma.

**Limite:** o estudo investigou affect labeling num contexto específico de exposição a medo de aranhas. Ele não valida o Ombro-amigo e não autoriza generalizações clínicas sobre qualquer emoção.

## 5. Correção e reparo quando o sistema erra

### Zilcha-Mano et al. (2018) — Clinical Consensus Strategies to Repair Ruptures in the Therapeutic Alliance

- Fonte: https://pmc.ncbi.nlm.nih.gov/articles/PMC5966286/
- Aplicação:
  - se o usuário disser “não foi isso”, “você entendeu errado” ou “não me representa”, a formulação anterior é descartada;
  - reconhecer a correção;
  - perguntar o que precisa ser corrigido;
  - não defender interpretação nem avançar para “insight”.

### Babl et al. (2026) — Alliance Ruptures and Psychotherapy Outcomes: A Multilevel Meta-Analysis

- Fonte: https://pmc.ncbi.nlm.nih.gov/articles/PMC13544451/
- Aplicação: reforça a importância de detectar e reparar desalinhamentos, sem fingir que a interação com o app é uma aliança terapêutica.

## Regras implementadas a partir desta base

| Regra no motor | Principais fontes |
| --- | --- |
| IA é ponte, não terapeuta | APA 2025; APA 2026; NIMH; SAMHSA AI 2026 |
| Uma pergunta por turno | WHO PFA; OARS/MI |
| Reflexão de baixa inferência antes de aprofundar | OARS/MI; Resnicow & McMaster |
| Checkpoint “continuar / sintetizar / parar” | Resnicow & McMaster; SAMHSA trauma-informed |
| “Prefiro não responder” sem penalidade | WHO PFA; SAMHSA trauma-informed |
| Assunto sensível não dispara pedido de detalhes | WHO PFA; SAMHSA trauma-informed |
| Emoção sugerida é hipótese até confirmação | Kircanski et al. + regra de não inferência |
| Correção do usuário invalida formulação anterior | Zilcha-Mano et al.; Babl et al. |
| Não prever reação do psicólogo | WHO PFA; limites de IA da APA |
| Não diagnosticar / não substituir cuidado humano | APA; NIMH; SAMHSA |
| Privacidade e controle do usuário | APA Ethical Guidance; NIMH; SAMHSA trauma-informed |

## O que esta base não permite afirmar

Não podemos afirmar, com essas fontes, que o Ombro-amigo:

- melhora resultados de psicoterapia;
- aumenta adesão ao tratamento;
- reduz sintomas;
- detecta risco com confiabilidade;
- funciona igualmente para diferentes populações;
- é uma intervenção psicológica validada.

Essas perguntas exigem desenho de pesquisa próprio, revisão ética/profissional e validação com usuários e psicólogos.
