# Experimento: qualidade de reescrita 100% local

Este experimento **não inclui nem ativa um modelo**. Ele prepara o contrato de avaliação e uma saída conservadora: se a proposta falha, voltamos para trechos literalmente presentes no relato.

## Contrato de uma proposta

Cada frase reescrita deverá ser acompanhada de referências exatas ao relato de origem (intervalos UTF-16, `start` inclusivo, `end` exclusivo, e a cópia de cada trecho original). Não basta apresentar referências: mesmo referências exatas podem acompanhar uma paráfrase falsa. **Nenhuma reescrita pode ser considerada verificada semanticamente pelo validador lexical.**

Saídas possíveis: `reject` (erro estrutural ou sinal de conteúdo proibido) e `needs-human-review` (somente verificações estruturais básicas passaram). Nunca há `approved` automático.

## Plano de avaliação antes de testar um LLM no navegador

1. Construir um corpus **sintético e sem relatos reais** com negações, terceiros, citações, temporalidade, incerteza, contradições, temas sensíveis e objetivos explicitamente declarados.
2. Testar variantes de geração local somente em ambiente isolado. Medir por aparelho e navegador: instalação offline posterior ao download inicial, pico de memória, latência, tamanho do modelo, falhas de inicialização e consumo de bateria aproximado. Não estimar valores sem medir.
3. Comparar saídas cegamente a rascunhos extrativos, com revisão humana e posteriormente profissional autorizada. Medir separadamente omissões importantes, alegações sem suporte, erro de quem sentiu o quê, negação, causalidade inventada e naturalidade em pt-BR.
4. Não integrar um modelo se houver qualquer invenção crítica no conjunto protegido. A avaliação sintética **não comprova eficácia clínica** nem ausência de erros em produção.
5. A UI deve deixar cada texto gerado claramente identificado como rascunho não validado e exigir revisão, edição e consentimento antes de copiar ou compartilhar.

## Limites e segurança

- Não executar modelos remotos, enviar dados ou acrescentar dependências por CDN.
- Não reutilizar o MiniLM ONNX experimental anteriormente rejeitado (#35).
- Não ativar reescrita automática nem modificar `main`/`pages-site`/GitHub Pages.
- Revisão psicológica e testes consentidos antes de qualquer alegação terapêutica.
