import { defineConfig } from '@playwright/test';

const browserName=process.env.PW_BROWSER || 'chromium';

export default defineConfig({
  testDir:'./tests/browser',
  timeout:30000,
  expect:{timeout:5000},
  use:{
    baseURL:'http://127.0.0.1:4173',
    headless:true,
    browserName
  },
  webServer:{
    command:'node scripts/dev-server.mjs',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:false,
    timeout:10000
  }
});
