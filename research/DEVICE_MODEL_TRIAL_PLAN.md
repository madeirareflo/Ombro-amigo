# Preparação para benchmark de modelos locais — sem ativação

## Experimento implementado

Abra `research/device-readiness.html` em uma origem HTTPS que disponibilize os arquivos relativos, ou sirva o repositório em localhost. A tela verifica a existência de WebGPU, WebAssembly, alguns limites reportados pelo adaptador e armazenamento estimado **apenas após clicar**. Não acessa o relato, não registra o resultado e não faz chamadas externas.

O resultado `candidate-webgpu` ou `candidate-wasm` **não indica que há RAM suficiente**, nem garante latência, suporte a modelos ou qualidade em português. Não é benchmark de inferência.

## Tecnologias candidatas à investigação

- **Transformers.js + ONNX Runtime Web**: execução local com WebGPU e WASM e configuração de arquivos locais; é preciso testar modelo, empacotamento, cache e CSP em cada plataforma. Referências: https://huggingface.co/docs/transformers.js/guides/webgpu e https://huggingface.co/docs/transformers.js/api/env.
- **MLC WebLLM**: LLM no navegador com WebGPU; exige suporte da plataforma e modelo efetivamente compatível. Referência: https://webllm.mlc.ai/docs/user/get_started.html.

Não escolher previamente um modelo por contagem de parâmetros. Licença, uso comercial, disponibilidade de pesos quantizados compatíveis, comportamento em pt-BR, tamanho final de download e consumo de memória precisam ser verificados **para cada versão exata** antes de sua incorporação. Não utilizar CDN em produção nem permitir acesso a textos privados.

## Próximo gate experimental (ainda não executado)

1. Selecionar 1–2 modelos com artefatos exatos, licença e hashes registrados; baixar e integrar num *sandbox local não publicado*.
2. Rodar benchmarks com corpus sintético e deliberadamente adversarial (negação, terceiros, incerteza, tempo e causalidade). Nunca usar relatos reais não autorizados.
3. Medir em **aparelhos físicos**, separadamente: Android Chrome, iPhone Safari/PWA, processamento offline após instalação, latência, memória/abortos e consumo energético. Sem medições não divulgar números.
4. Aplicar `research/local-rewrite-gate.js`; toda proposta que passe exige revisão humana, e falsidades críticas reprovam o modelo/candidato.
5. Manter síntese extrativa como único caminho automático até conclusão e revisão profissional.

**Não inclui inferência de modelo, instalação de dependências nem mudança no aplicativo principal.**
