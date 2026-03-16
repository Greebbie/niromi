import { OpenAIProvider } from './openai'

/**
 * Qwen (通义千问) uses OpenAI-compatible API via DashScope.
 */
export class QwenProvider extends OpenAIProvider {
  constructor(
    apiKey: string,
    model: string = 'qwen-plus'
  ) {
    super(apiKey, model, 'https://dashscope.aliyuncs.com/compatible-mode/v1')
  }
}
