import { defineConfig } from 'cypress'

export default defineConfig({
  video: true,
  screenshotOnRunFailure: true,
  defaultCommandTimeout: 10000,

  e2e: {
    baseUrl: 'http://127.0.0.1:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    testIsolation: true,
  },
})
