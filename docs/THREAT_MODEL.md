# Modelo de ameaças do armazenamento local

## Objetivo

Reduzir a exposição acidental de relatos pessoais armazenados no aparelho sem criar uma promessa falsa de “segurança absoluta”.

## Arquitetura

- conteúdo de conversa e síntese: IndexedDB;
- cifra: AES-GCM via Web Crypto;
- chave: CryptoKey não extraível, guardada em um object store separado no mesmo IndexedDB;
- confirmação 18+/aviso inicial: localStorage, pois não contém o relato pessoal;
- formato antigo em localStorage: migrado e removido após uma gravação cifrada bem-sucedida;
- navegador sem IndexedDB/Web Crypto: conversa funciona apenas em memória; nenhuma nova conversa sensível é persistida em texto claro.

## O que esta camada ajuda a proteger

- inspeção casual do valor bruto de localStorage;
- cópias simples do registro cifrado sem acesso à chave;
- permanência do formato legado em texto claro após migração bem-sucedida;
- escrita acidental futura de rascunhos na chave antiga.

## O que esta camada NÃO protege

- JavaScript malicioso executado na mesma origem;
- um deploy futuro comprometido ou malicioso;
- XSS que consiga usar a chave enquanto a origem está aberta;
- navegador, sistema operacional ou dispositivo comprometido;
- pessoa com acesso ao aparelho desbloqueado;
- conteúdo copiado para clipboard, screenshots ou exportado pelo próprio usuário;
- backups/sincronização feitos pelo navegador ou sistema fora do controle do app.

Por isso a interface não deve chamar essa arquitetura de “ponta a ponta” nem dizer que nem o dono do site poderia acessar o conteúdo sob qualquer cenário. O código atual não transmite o relato e a CSP bloqueia conexões do runtime; isso é diferente de garantir confiança em todo código futuro servido pela origem.

## Chave no mesmo navegador

Guardar uma CryptoKey não extraível reduz a facilidade de copiar a chave como bytes, mas scripts autorizados pela mesma origem ainda podem pedir ao Web Crypto que usem essa chave. Essa separação é defesa em profundidade, não isolamento contra o próprio aplicativo.

## Fallback

Se IndexedDB ou Web Crypto falhar, a aplicação usa memória volátil. Dados antigos em texto claro não são apagados automaticamente até que a migração cifrada tenha sucesso, evitando destruição silenciosa de uma conversa existente. A tela de privacidade informa quando existe estado legado.

## Critérios de segurança

- nenhum novo relato deve ser salvo em localStorage;
- AES-GCM deve usar IV aleatório de 96 bits;
- a chave deve ser não extraível;
- qualquer adulteração do ciphertext deve falhar na autenticação;
- apagar todos os dados deve remover ciphertext, chave e chaves legadas;
- migração só apaga o legado depois de persistência cifrada bem-sucedida.
