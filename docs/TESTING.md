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

A suíte de navegador real do PR de armazenamento seguro valida em Chromium:

- migração real de `localStorage` para IndexedDB;
- persistência e structured clone de uma `CryptoKey` não extraível;
- ausência de relato em texto claro no registro cifrado;
- restauração após reload;
- recuperação da versão cifrada anterior após adulteração do registro atual;
- remoção do registro atual, backup e chave;
- reload offline da PWA depois da primeira carga.

O job de navegador instala uma versão fixada do Playwright somente no ambiente efêmero de CI; o aplicativo publicado continua sem dependência de runtime externa.

## Limite do teste

Passar neste roteiro não significa validação clínica. Também não prova segurança contra código malicioso na mesma origem, navegador ou sistema operacional comprometido. O comportamento conversacional ainda precisa ser avaliado por profissionais de Psicologia e por testes de usabilidade com consentimento adequado.
