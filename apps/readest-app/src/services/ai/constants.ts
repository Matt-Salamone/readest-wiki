import type { AISettings } from './types';

export const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: false,
  provider: 'ollama',

  ollamaBaseUrl: 'http://127.0.0.1:11434',
  ollamaModel: 'llama3.2',
  ollamaEmbeddingModel: 'nomic-embed-text',

  spoilerProtection: true,
  maxContextChunks: 10,
  indexingMode: 'on-demand',
};
