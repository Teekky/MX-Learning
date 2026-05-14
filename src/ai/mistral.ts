/**
 * Mistral AI client — single source of truth for all LLM calls.
 *
 * The API key is read from `.env.local` (VITE_MISTRAL_API_KEY).
 * Never hardcode the key in source. Never commit `.env.local`.
 */

import { Mistral } from '@mistralai/mistralai'

const API_KEY = import.meta.env.VITE_MISTRAL_API_KEY as string | undefined
const MODEL =
  (import.meta.env.VITE_MISTRAL_MODEL as string | undefined) ??
  'mistral-large-latest'

export function hasMistralKey(): boolean {
  return Boolean(API_KEY) && API_KEY !== 'your_mistral_api_key_here'
}

let _client: Mistral | null = null

export function getMistralClient(): Mistral {
  if (!hasMistralKey()) {
    throw new Error(
      'Mistral API key missing. Add VITE_MISTRAL_API_KEY to .env.local.',
    )
  }
  if (!_client) {
    // In dev, route through Vite proxy at /api/mistral to dodge CORS.
    // In a packaged build, fall back to the official endpoint.
    const serverURL = import.meta.env.DEV
      ? `${window.location.origin}/api/mistral`
      : 'https://api.mistral.ai'
    _client = new Mistral({ apiKey: API_KEY!, serverURL })
  }
  return _client
}

export function getModelName(): string {
  return MODEL
}
