# Checklist de acessibilidade para o piloto

Status: **checklist de verificação; não equivale a conformidade WCAG certificada**.

## Automático no repositório

Os testes estruturais verificam:
- idioma da página;
- rótulos explícitos para campos;
- `fieldset/legend` do ritmo da conversa;
- regiões `aria-live`;
- alerta de segurança com `role="alert"`;
- ausência de `tabindex` positivo;
- foco visível;
- suporte a `prefers-reduced-motion`;
- alvo mínimo de botão >= 44 px.

## Sessão manual de teclado

Sem mouse:
1. percorrer onboarding em ordem lógica;
2. marcar 18+ e continuar;
3. iniciar conversa;
4. escrever resposta;
5. pular pergunta;
6. montar síntese;
7. editar e remover item;
8. confirmar e copiar síntese;
9. abrir privacidade;
10. apagar dados;
11. localizar ajuda urgente.

Registrar qualquer foco perdido, invisível, preso ou ordem inesperada.

## Leitor de tela

Testar pelo menos uma combinação real disponível à equipe. Verificar:
- título e propósito inicial compreensíveis;
- botões com nomes úteis;
- mudanças de vista não deixam contexto ambíguo;
- novas mensagens são anunciadas sem repetição excessiva;
- origem dos itens da síntese é compreensível;
- alerta de segurança é anunciado;
- confirmação de cópia e estado de dados locais são perceptíveis.

## Zoom e reflow

Verificar 200% e viewport estreito:
- nenhum controle essencial fica inacessível;
- texto não é cortado;
- botões não se sobrepõem;
- síntese continua editável;
- ajuda urgente continua encontrável.

## Movimento e cor

- com “reduzir movimento” ativo, não depender de animação;
- significado não pode depender apenas de cor;
- revisar contraste das combinações reais em ferramenta apropriada.

## Limite

Os testes automatizados desta etapa são contratos de regressão. Eles não validam experiência de leitor de tela, contraste computado em todos os estados ou usabilidade real de pessoas com deficiência.
