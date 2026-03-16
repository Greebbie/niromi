import { OpenAIProvider } from './openai'

/**
 * vLLM uses OpenAI-compatible API, no key needed.
 */
export class VLLMProvider extends OpenAIProvider {
  constructor(
    baseUrl: string = 'http://localhost:8000/v1',
    model: string = 'default'
  ) {
    super('', model, baseUrl)
  }

  /**
   * Discover available models from vLLM.
   */
  static async discover(baseUrl = 'http://localhost:8000/v1'): Promise<string[]> {
    const res = await fetch(`${baseUrl}/models`)
    if (!res.ok) throw new Error(`vLLM discovery failed: ${res.status}`)
    const data = await res.json()
    return (data.data || []).map((m: { id: string }) => m.id)
  }
}
