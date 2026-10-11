import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('android pwa: manifest.webmanifest satisfaz critérios de instalação do Android Chrome', async () => {
  const manifestPath = new URL('../../manifest.webmanifest', import.meta.url);
  const manifestContent = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);

  // Verificações essenciais de instalabilidade PWA
  assert.equal(manifest.display, 'standalone', 'display deve ser standalone para janela nativa no Android');
  assert.equal(manifest.start_url, './', 'start_url deve ser relativo e apontar para a raiz');
  assert.equal(manifest.scope, './', 'scope deve cobrir a aplicação');
  assert.ok(manifest.name, 'manifest deve ter nome completo');
  assert.ok(manifest.short_name, 'manifest deve ter short_name para a tela inicial do Android');
  assert.ok(manifest.theme_color, 'theme_color deve estar definido');
  assert.ok(manifest.background_color, 'background_color deve estar definido');

  // Ícones para Android WebAPK/HomeScreen
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'deve ter pelo menos um ícone');
  const primaryIcon = manifest.icons[0];
  assert.ok(primaryIcon.src, 'ícone deve ter src');
  assert.match(primaryIcon.purpose || '', /maskable|any/, 'ícone deve suportar maskable ou any no Android');
});

test('android pwa: CSP em index.html permite manifest e ícone sem conexões externas', async () => {
  const htmlPath = new URL('../../index.html', import.meta.url);
  const html = await readFile(htmlPath, 'utf8');

  // Metatags de PWA no index.html
  assert.match(html, /<link\s+[^>]*rel="manifest"[^>]*href="\.?\/manifest\.webmanifest"/i, 'link manifest deve estar presente');
  assert.match(html, /<meta\s+[^>]*name="theme-color"/i, 'meta theme-color deve estar presente');
  assert.match(html, /<meta\s+[^>]*name="viewport"[^>]*content="[^"]*viewport-fit=cover/i, 'viewport-fit=cover para entalhes/telas móveis');

  // Política estrita de CSP sem conexões externas (connect-src 'none')
  assert.match(html, /connect-src 'none'/, 'connect-src deve ser strictly none');
});

test('android pwa: service-worker contém ativos fundamentais para modo avião / offline completo', async () => {
  const swPath = new URL('../../service-worker.js', import.meta.url);
  const swContent = await readFile(swPath, 'utf8');

  const match = swContent.match(/const\s+ASSETS\s*=\s*\[([^\]]+)\]/);
  assert.ok(match, 'ASSETS deve estar declarado');
  const assetList = match[1];

  const requiredCoreAssets = [
    "'./'",
    "'./index.html'",
    "'./styles.css'",
    "'./manifest.webmanifest'",
    "'./icon.svg'",
    "'./app/main.js'",
    "'./storage/secure-store.js'",
    "'./storage/crypto.js'"
  ];

  for (const asset of requiredCoreAssets) {
    assert.ok(assetList.includes(asset), `ativo essencial ausente no cache: ${asset}`);
  }
});
