import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir:'./tests/browser',
  timeout:30000,
  expect:{timeout:5000},
  use:{
    baseURL:'http://127.0.0.1:4173',
    headless:true
  },
  webServer:{
    command:'node scripts/dev-server.mjs',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:false,
    timeout:10000
  }
});
