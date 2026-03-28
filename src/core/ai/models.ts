import type { AIProviderType } from '@/stores/configStore'

export interface ModelOption {
  id: string
  label: string
  description?: string
}

/** Preset models per provider — shown in dropdown for easy selection */
export const MODEL_PRESETS: Record<AIProviderType, ModelOption[]> = {
  claude: [
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', description: '最佳性价比' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', description: '快速便宜' },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o', description: '最强多模态' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini', description: '便宜快速' },
    { id: 'gpt-4.1', label: 'GPT-4.1', description: '最新版本' },
  ],
  deepseek: [
    { id: 'deepseek-chat', label: 'DeepSeek Chat', description: '性价比极高' },
    { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner', description: '深度推理' },
  ],
  ollama: [
    { id: 'llama3.1', label: 'Llama 3.1', description: '通用' },
    { id: 'qwen2.5', label: 'Qwen 2.5', description: '中文优秀' },
    { id: 'mistral', label: 'Mistral', description: '轻量' },
  ],
  vllm: [
    { id: 'default', label: 'Default', description: '使用部署的模型' },
  ],
  qwen: [
    { id: 'qwen-turbo', label: 'Qwen Turbo', description: '快速' },
    { id: 'qwen-plus', label: 'Qwen Plus', description: '更强' },
  ],
  minimax: [
    { id: 'MiniMax-M2.5', label: 'MiniMax M2.5', description: '便宜好用' },
    { id: 'MiniMax-M1', label: 'MiniMax M1', description: '更强推理' },
    { id: 'MiniMax-Text-01', label: 'MiniMax Text-01', description: '长文本' },
    { id: 'abab6.5s-chat', label: 'ABAB 6.5s', description: '经典版' },
  ],
}
