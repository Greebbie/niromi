import { OpenAIProvider } from './openai'

/**
 * Ollama uses OpenAI-compatible API, no key needed.
 */
export class OllamaProvider extends OpenAIProvider {
  constructor(
    baseUrl: string = 'http://localhost:11434/v1',
    model: string = 'llama3.1'
  ) {
    super('', model, baseUrl)
  }

  /**
   * Discover available models from Ollama.
   */
  static async discover(baseUrl = 'http://localhost:11434'): Promise<string[]> {
    const res = await fetch(`${baseUrl}/api/tags`)
    if (!res.ok) throw new Error(`Ollama discovery failed: ${res.status}`)
    const data = await res.json()
    return (data.models || []).map((m: { name: string }) => m.name)
  }
}
