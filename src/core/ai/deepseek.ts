import { OpenAIProvider } from './openai'

/**
 * DeepSeek uses OpenAI-compatible API, just different base URL and model.
 */
export class DeepSeekProvider extends OpenAIProvider {
  constructor(apiKey: string, model: string = 'deepseek-chat') {
    super(apiKey, model, 'https://api.deepseek.com/v1')
  }
}
