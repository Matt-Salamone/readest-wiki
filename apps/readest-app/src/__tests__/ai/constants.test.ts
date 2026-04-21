import { describe, test, expect, vi } from 'vitest';

// mock stores and dependencies before imports
vi.mock('@/store/settingsStore', () => {
  const mockState = {
    settings: {
      aiSettings: {
        enabled: true,
        provider: 'ollama',
        ollamaBaseUrl: 'http://127.0.0.1:11434',
        ollamaModel: 'llama3.2',
        ollamaEmbeddingModel: 'nomic-embed-text',
        spoilerProtection: true,
        maxContextChunks: 5,
        indexingMode: 'on-demand',
      },
    },
    setSettings: vi.fn(),
    saveSettings: vi.fn(),
  };

  const fn = vi.fn(() => mockState) as unknown as {
    (): typeof mockState;
    getState: () => typeof mockState;
    setState: (partial: Partial<typeof mockState>) => void;
    subscribe: (listener: () => void) => () => void;
    destroy: () => void;
  };
  fn.getState = () => mockState;
  fn.setState = vi.fn();
  fn.subscribe = vi.fn();
  fn.destroy = vi.fn();

  return { useSettingsStore: fn };
});

import type { AISettings } from '@/services/ai/types';
import { DEFAULT_AI_SETTINGS } from '@/services/ai/constants';

describe('DEFAULT_AI_SETTINGS', () => {
  test('should have enabled set to false by default', () => {
    expect(DEFAULT_AI_SETTINGS.enabled).toBe(false);
  });

  test('should have ollama as default provider', () => {
    expect(DEFAULT_AI_SETTINGS.provider).toBe('ollama');
  });

  test('should have valid ollama defaults', () => {
    expect(DEFAULT_AI_SETTINGS.ollamaBaseUrl).toBe('http://127.0.0.1:11434');
    expect(DEFAULT_AI_SETTINGS.ollamaModel).toBe('llama3.2');
    expect(DEFAULT_AI_SETTINGS.ollamaEmbeddingModel).toBe('nomic-embed-text');
  });

  test('should have spoiler protection enabled by default', () => {
    expect(DEFAULT_AI_SETTINGS.spoilerProtection).toBe(true);
  });
});

describe('AISettings Type', () => {
  test('should allow creating valid settings object', () => {
    const settings: AISettings = {
      enabled: true,
      provider: 'ollama',
      ollamaBaseUrl: 'http://localhost:11434',
      ollamaModel: 'mistral',
      ollamaEmbeddingModel: 'nomic-embed-text',
      spoilerProtection: false,
      maxContextChunks: 10,
      indexingMode: 'background',
    };

    expect(settings.enabled).toBe(true);
    expect(settings.provider).toBe('ollama');
    expect(settings.indexingMode).toBe('background');
  });
});
