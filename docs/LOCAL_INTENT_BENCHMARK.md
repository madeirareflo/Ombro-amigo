# Classificador local de intenções — experimento v1

**Status:** somente protótipo de laboratório. Não está ligado à interface, à tomada
de decisão do motor ou ao safety gate. Não constitui validação clínica.

## Motivação

A pesquisa técnica do Ombro-amigo recomenda:
1. estado explícito e continuidade entre turnos;
2. classificador local de intenção;
3. recuperação de respostas revisadas;
4. somente depois, modelo generativo pequeno, opcional e validado.

Este PR introduz o **baseline mensurável da segunda fase**. Ele NÃO é um
Transformer, ONNX ou rede neural: utiliza vizinhança por cosseno sobre vetores
TF-IDF aproximados de palavras, pares de palavras e caracteres em pt-BR.
Chamamos de classificador local de baseline, nunca de "IA que entende emoções".

## Isolamento e privacidade

- O corpus de exemplos é ficcional e está no bundle do repositório.
- A inferência ocorre exclusivamente no navegador, em JS, sem \`fetch\`, APIs externas,
  conta, permissões adicionais ou telemetria.
- O índice guarda apenas vetores do corpus estático; nenhuma mensagem submetida
  pelo usuário é persistida, registrada ou transmitida pelo classificador.
- A CSP \`connect-src 'none'\`, a cifra AES-GCM e o comportamento offline
  permanecem inalterados.
- Ainda não existe integração em \`app/main.js\` nem \`conversation/engine.js\`:
  o resultado experimental jamais pode substituir comandos ou safety.

## Contrato de saída

\`classifyLocalIntent(texto, { lastQuestionDimension })\` devolve somente:

- \`modelVersion\`: identificação da implementação;
- \`candidateIntent\`: hipótese lexical (não é diagnóstico);
- \`intent\`: hipótese permitida ou \`null\` quando houve abstenção;
- \`similarity\` e \`margin\`: escores relativos, **não probabilidades calibradas**;
- \`abstained\` e \`reason\`: explicação mecânica da recusa.

Classes candidatas: \`clarify\`, \`summary\`, \`continue\`, \`uncertainty\`,
\`scope_all\`, \`stop\`, \`skip\` e \`other\`.

Regras conservadoras desta versão:
- \`stop\`, \`skip\` e \`other\` nunca geram ações por ML.
- \`scope_all\` exige pergunta imediatamente anterior de escopo.
- Frases longas, multilinha, citações, termos desconhecidos, baixa similaridade
  ou empate de classes fazem o classificador se abster.
- Controles explícitos e detecção de perigo ficam integralmente no motor
  determinístico já existente.

## Avaliação disponível e suas limitações

- Os testes em \`tests/scenarios/local-intent-baseline.test.mjs\` usam frases fictícias,
  exemplos claros, paráfrases de teste e controles negativos.
- A avaliação de paráfrases tem apenas 20 frases fora da lista de exemplos.
  As exigências iniciais de cobertura e precisão **são smoke tests de engenharia**,
  não estimativa representativa de desempenho em produção.
- O conjunto ainda não cobre a diversidade cultural, variações ortográficas,
  contexto multiturmo realista, português regional ou adversariais suficientes.
- A origem sintética pode resultar em validação artificialmente otimista;
  não transformar os resultados do CI em alegação de qualidade clínica.

## Gates para uma próxima implementação neural ONNX

1. Criar pelo menos 300–800 cenários **fictícios e independentes**, com split
   por família de paráfrases, nunca amostras do mesmo template nos dois conjuntos.
2. Congelar corpus de avaliação *antes* de treinar. Relatar macro-F1, recall
   por comando, matriz de confusão, taxa de abstenção, falsos positivos em
   negação/citação/terceiros e desempenho de 5–12 turnos.
3. Testar um encoder compacto multilíngue de licença verificada com ONNX Runtime
   Web/Transformers.js, quantização e fallback WASM; não usar CDN nem telemetria.
4. Distribuir pesos versionados e com hash de integridade por fluxo local
   compatível com a CSP. **Não mudar \`connect-src 'none'\` sem revisão do threat
   model e testes de ausência de saída de relato.**
5. Medir tempo de resposta, RAM, quota, consumo offline, falha de cache e
   comportamento no Android e no iPhone reais.
6. Manter modelo auxiliar, safety pré-modelo, validador pós-modelo e fallback
   determinístico. Nenhuma liberação com conteúdo inventado, diagnóstico,
   pressão indevida, vínculo exclusivo ou falha grave nos cenários de segurança.
7. Revisão profissional cega e comparativa com a baseline de regras.

## Critério de continuidade

Somente após satisfazer esses gates o classificador pode ser experimentado
como *sugestão* de próximo movimento. As ações protegidas continuarão
determinísticas, e qualquer modelo maior deverá ser opcional nos telefones que
não suportarem seus custos.

Referência interna: \`docs/LOCAL_AI_ARCHITECTURE.md\` (PR #32) e pesquisa
técnica de 22 páginas fornecida à equipe em outubro de 2026.
