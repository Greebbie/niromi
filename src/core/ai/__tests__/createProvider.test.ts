import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../claude', () => ({ ClaudeProvider: vi.fn() }))
vi.mock('../openai', () => ({ OpenAIProvider: vi.fn() }))
vi.mock('../deepseek', () => ({ DeepSeekProvider: vi.fn() }))
vi.mock('../ollama', () => ({ OllamaProvider: vi.fn() }))
vi.mock('../vllm', () => ({ VLLMProvider: vi.fn() }))
vi.mock('../qwen', () => ({ QwenProvider: vi.fn() }))
vi.mock('../minimax', () => ({ MinimaxProvider: vi.fn() }))

import { createProvider, isVisionCapable } from '../createProvider'
import { useConfigStore } from '@/stores/configStore'
import { ClaudeProvider } from '../claude'
import { OllamaProvider } from '../ollama'
import { VLLMProvider } from '../vllm'
import { OpenAIProvider } from '../openai'

describe('createProvider', () => {
  beforeEach(() => {
    useConfigStore.setState({
      provider: 'claude',
      apiKey: 'test-key',
      model: 'claude-sonnet-4',
      baseUrl: '',
      groupId: '',
      modelRouting: {},
      isLoading: false,
    })
    vi.clearAllMocks()
  })

  // ─── basic provider creation ──────────────────────────────────────

  it('returns instance for claude with apiKey', () => {
    const provider = createProvider()
    expect(provider).not.toBeNull()
    expect(ClaudeProvider).toHaveBeenCalledWith('test-key', 'claude-sonnet-4')
  })

  it('returns null for claude without apiKey', () => {
    useConfigStore.setState({ apiKey: '' })
    const provider = createProvider()
    expect(provider).toBeNull()
  })

  it('returns instance for ollama without apiKey', () => {
    useConfigStore.setState({ provider: 'ollama', apiKey: '', baseUrl: 'http://localhost:11434' })
    const provider = createProvider()
    expect(provider).not.toBeNull()
    expect(OllamaProvider).toHaveBeenCalledWith('http://localhost:11434', 'claude-sonnet-4')
  })

  it('returns instance for vllm without apiKey', () => {
    useConfigStore.setState({ provider: 'vllm', apiKey: '', baseUrl: 'http://localhost:8000' })
    const provider = createProvider()
    expect(provider).not.toBeNull()
    expect(VLLMProvider).toHaveBeenCalledWith('http://localhost:8000', 'claude-sonnet-4')
  })

  it('returns null for unknown provider', () => {
    useConfigStore.setState({ provider: 'nonexistent' as any })
    const provider = createProvider()
    expect(provider).toBeNull()
  })

  // ─── task routing ─────────────────────────────────────────────────

  it('with task routing uses override config', () => {
    useConfigStore.setState({
      modelRouting: {
        vision: {
          provider: 'openai',
          apiKey: 'openai-key',
          model: 'gpt-4o',
        },
      },
    })

    const provider = createProvider('vision')
    expect(provider).not.toBeNull()
    expect(OpenAIProvider).toHaveBeenCalledWith('openai-key', 'gpt-4o')
    // Claude should not have been used
    expect(ClaudeProvider).not.toHaveBeenCalled()
  })

  // ─── isVisionCapable ─────────────────────────────────────────────

  it('isVisionCapable returns false for vllm', () => {
    useConfigStore.setState({ provider: 'vllm', modelRouting: {} })
    expect(isVisionCapable()).toBe(false)
  })

  it('isVisionCapable returns true for claude', () => {
    useConfigStore.setState({ provider: 'claude', modelRouting: {} })
    expect(isVisionCapable()).toBe(true)
  })
})
