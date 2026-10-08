# Roteiro de teste do MVP

## Objetivo

Validar experiência, autonomia, privacidade local e comportamento do motor antes de qualquer uso como produto de saúde.

## Preparação

1. Rode `npm run check`.
2. Inicie com `npm run dev`.
3. Abra `http://localhost:4173` em um navegador compatível.
4. Para testar como PWA instalada, use HTTPS ou localhost.

## Fluxos mínimos

- primeira abertura mostra o aviso inicial;
- conversa pode ser iniciada pelos diferentes modos;
- “Prefiro não responder” não cria conteúdo clínico;
- “Me ajuda a dizer isso” produz síntese editável;
- síntese só libera cópia após confirmação;
- recarregar preserva conversa local;
- apagar conversa remove o estado local;
- “Apagar todos os dados locais” volta ao aviso inicial;
- botão de ajuda urgente continua acessível;
- após primeira carga, os arquivos essenciais permanecem disponíveis offline.

## Privacidade

Durante os testes, DevTools > Network não deve mostrar requisições contendo texto digitado pelo usuário. O runtime do app não contém primitivas de envio de rede e a CSP usa `connect-src 'none'`.

## Limite do teste

Passar neste roteiro não significa validação clínica. O comportamento conversacional ainda precisa ser avaliado por profissionais de Psicologia e por testes de usabilidade com consentimento adequado.
