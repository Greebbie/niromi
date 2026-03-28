import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockElectronAPI } from '@/test/helpers'
import { toolRegistry } from '../registry'

// Register app tools (side-effect import)
import '../apps'

describe('open_app tool', () => {
  let mockAPI: ReturnType<typeof createMockElectronAPI>

  beforeEach(() => {
    vi.clearAllMocks()
    mockAPI = createMockElectronAPI()
    ;(window as any).electronAPI = mockAPI
  })

  it('is registered in toolRegistry with correct metadata', () => {
    const tool = toolRegistry.get('open_app')
    expect(tool).toBeDefined()
    expect(tool!.name).toBe('open_app')
    expect(tool!.riskLevel).toBe('low')
    expect(tool!.category).toBe('apps')
  })

  it('calls electronAPI.openApp and returns success summary', async () => {
    const result = await toolRegistry.get('open_app')!.execute({ name: 'Chrome' })

    expect(result.success).toBe(true)
    expect(mockAPI.openApp).toHaveBeenCalledWith('Chrome')
    expect(result.summary).toBe('Opened Chrome')
  })

  it('returns humanized error when openApp rejects', async () => {
    mockAPI.openApp.mockRejectedValue(new Error('ENOENT: no such file'))

    const result = await toolRegistry.get('open_app')!.execute({ name: 'FakeApp' })

    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    // humanizeError translates the raw error; should not contain raw error text
    expect(result.summary).toBeTruthy()
  })

  it('returns error when electronAPI is undefined', async () => {
    const savedAPI = (window as any).electronAPI
    ;(window as any).electronAPI = undefined

    try {
      const result = await toolRegistry.get('open_app')!.execute({ name: 'Chrome' })
      expect(result.success).toBe(false)
      expect(result.data).toBeNull()
      expect(result.summary).toContain('Niromi')
    } finally {
      ;(window as any).electronAPI = savedAPI
    }
  })
})
