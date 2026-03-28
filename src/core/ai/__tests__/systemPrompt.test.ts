import { buildSystemPrompt } from '../systemPrompt'
import { useConfigStore } from '@/stores/configStore'

describe('buildSystemPrompt', () => {
  beforeEach(() => {
    // Reset to defaults relevant for testing
    useConfigStore.setState({
      verbosity: 0.5,
      formality: 0.5,
      proactivity: 0.3,
      language: 'zh',
      userName: '',
      thirdPerson: false,
      visionTarget: 'off',
    })
  })

  it('contains "Niromi" in default prompt', () => {
    expect(buildSystemPrompt()).toContain('Niromi')
  })

  it('adds ultra-brief instruction when verbosity < 0.3', () => {
    useConfigStore.setState({ verbosity: 0.2 })
    expect(buildSystemPrompt()).toContain('Ultra-brief')
  })

  it('adds detail instruction when verbosity > 0.7', () => {
    useConfigStore.setState({ verbosity: 0.8 })
    expect(buildSystemPrompt()).toContain('detail')
  })

  it('adds emoji instruction when formality < 0.3', () => {
    useConfigStore.setState({ formality: 0.1 })
    expect(buildSystemPrompt()).toContain('emoji')
  })

  it('adds Professional instruction when formality > 0.7', () => {
    useConfigStore.setState({ formality: 0.9 })
    expect(buildSystemPrompt()).toContain('Professional')
  })

  it('adds playful instruction for mid formality', () => {
    useConfigStore.setState({ formality: 0.5 })
    expect(buildSystemPrompt()).toContain('playful')
  })

  it('adds next steps when proactivity > 0.6', () => {
    useConfigStore.setState({ proactivity: 0.7 })
    expect(buildSystemPrompt()).toContain('next steps')
  })

  it('includes userName when set', () => {
    useConfigStore.setState({ userName: 'Alice' })
    expect(buildSystemPrompt()).toContain('Alice')
  })

  it('includes third person instruction when enabled', () => {
    useConfigStore.setState({ thirdPerson: true })
    expect(buildSystemPrompt()).toContain('third person')
  })

  it('includes vision-off message when visionTarget is off', () => {
    useConfigStore.setState({ visionTarget: 'off', language: 'zh' })
    expect(buildSystemPrompt()).toContain('视觉功能已关闭')
  })

  it('includes describe_screen when vision is on', () => {
    useConfigStore.setState({ visionTarget: 'fullscreen' })
    expect(buildSystemPrompt()).toContain('describe_screen')
  })
})
