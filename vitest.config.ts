import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Unit tests only — the pure business logic (SM-2 scheduler, streak maths,
 * XP curve, answer matching). No DOM, no jsdom: everything under test is a
 * plain function of its inputs.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
