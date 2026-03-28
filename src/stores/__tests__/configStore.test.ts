import { vi } from 'vitest'
import { useConfigStore } from '../configStore'

describe('configStore', () => {
  beforeEach(() => {
    useConfigStore.setState({
      provider: 'claude',
      apiKey: '',
      model: 'claude-sonnet-4-20250514',
      baseUrl: '',
      groupId: '',
      verbosity: 0.3,
      formality: 0.7,
      proactivity: 0.3,
      language: 'zh',
      soundEnabled: false,
      visionTarget: 'off',
      ttsEnabled: false,
      isOnboarded: false,
      userName: '',
      thirdPerson: false,
      screenTimeReminder: 0,
      tokenBudget: 'balanced',
      sttModel: 'Xenova/whisper-tiny',
      sttLanguage: 'auto',
      modelRouting: {},
      isLoading: false,
    })
  })

  it('setProvider updates provider and auto-sets default model', () => {
    useConfigStore.getState().setProvider('openai')
    expect(useConfigStore.getState().provider).toBe('openai')
    expect(useConfigStore.getState().model).toBe('gpt-4o')

    useConfigStore.getState().setProvider('minimax')
    expect(useConfigStore.getState().provider).toBe('minimax')
    expect(useConfigStore.getState().model).toBe('MiniMax-M2.5')
  })

  it('setApiKey updates apiKey', () => {
    useConfigStore.getState().setApiKey('sk-test-key-123')
    expect(useConfigStore.getState().apiKey).toBe('sk-test-key-123')
  })

  it('setPersonality clamps value to 0-1', () => {
    useConfigStore.getState().setPersonality('verbosity', 1.5)
    expect(useConfigStore.getState().verbosity).toBe(1)

    useConfigStore.getState().setPersonality('verbosity', -0.5)
    expect(useConfigStore.getState().verbosity).toBe(0)

    useConfigStore.getState().setPersonality('formality', 0.5)
    expect(useConfigStore.getState().formality).toBe(0.5)
  })

  it('setVisionTarget updates visionTarget', () => {
    useConfigStore.getState().setVisionTarget('fullscreen')
    expect(useConfigStore.getState().visionTarget).toBe('fullscreen')

    useConfigStore.getState().setVisionTarget('Code - test.ts')
    expect(useConfigStore.getState().visionTarget).toBe('Code - test.ts')
  })

  it('setVisionEnabled(true) sets visionTarget to fullscreen (deprecated migration)', () => {
    useConfigStore.getState().setVisionEnabled(true)
    expect(useConfigStore.getState().visionTarget).toBe('fullscreen')
  })

  it('setVisionEnabled(false) sets visionTarget to off', () => {
    useConfigStore.setState({ visionTarget: 'fullscreen' })
    useConfigStore.getState().setVisionEnabled(false)
    expect(useConfigStore.getState().visionTarget).toBe('off')
  })

  it('setTaskRoute adds task route', () => {
    useConfigStore.getState().setTaskRoute('vision', {
      provider: 'openai',
      model: 'gpt-4o',
    })
    const routing = useConfigStore.getState().modelRouting
    expect(routing.vision).toEqual({ provider: 'openai', model: 'gpt-4o' })
  })

  it('setTaskRoute with undefined removes task route', () => {
    useConfigStore.getState().setTaskRoute('vision', { provider: 'openai', model: 'gpt-4o' })
    expect(useConfigStore.getState().modelRouting.vision).toBeTruthy()

    useConfigStore.getState().setTaskRoute('vision', undefined)
    expect(useConfigStore.getState().modelRouting.vision).toBeUndefined()
  })

  it('setModelRouting replaces entire routing', () => {
    useConfigStore.getState().setTaskRoute('chat', { provider: 'deepseek' })
    useConfigStore.getState().setModelRouting({
      vision: { provider: 'openai', model: 'gpt-4o' },
    })
    const routing = useConfigStore.getState().modelRouting
    expect(routing.chat).toBeUndefined()
    expect(routing.vision).toEqual({ provider: 'openai', model: 'gpt-4o' })
  })

  it('default values are correct', () => {
    useConfigStore.setState({
      provider: 'claude',
      apiKey: '',
      model: 'claude-sonnet-4-20250514',
      baseUrl: '',
      groupId: '',
      verbosity: 0.3,
      formality: 0.7,
      proactivity: 0.3,
      language: 'zh',
      soundEnabled: false,
      visionTarget: 'off',
      ttsEnabled: false,
      isOnboarded: false,
      userName: '',
      thirdPerson: false,
      screenTimeReminder: 0,
      tokenBudget: 'balanced',
      sttModel: 'Xenova/whisper-tiny',
      sttLanguage: 'auto',
      modelRouting: {},
      isLoading: true,
    })

    const state = useConfigStore.getState()
    expect(state.provider).toBe('claude')
    expect(state.model).toBe('claude-sonnet-4-20250514')
    expect(state.language).toBe('zh')
    expect(state.verbosity).toBe(0.3)
    expect(state.formality).toBe(0.7)
    expect(state.proactivity).toBe(0.3)
    expect(state.visionTarget).toBe('off')
    expect(state.isLoading).toBe(true)
    expect(state.tokenBudget).toBe('balanced')
    expect(state.modelRouting).toEqual({})
  })
})
