/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // or 'node' depending on your needs
    // Add any other Vitest configurations here
  },
});
