import { OllamaProvider } from './OllamaProvider';
import type { AIProvider, AISettings } from '../types';

export { OllamaProvider };

export function getAIProvider(settings: AISettings): AIProvider {
  if (settings.provider !== 'ollama') {
    throw new Error(`Unknown provider: ${settings.provider}`);
  }
  return new OllamaProvider(settings);
}
