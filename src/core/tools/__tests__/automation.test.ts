import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockElectronAPI } from '@/test/helpers'
import { toolRegistry } from '../registry'

// Register automation tools (side-effect import)
import '../automation'

describe('automation tools', () => {
  let mockAPI: ReturnType<typeof createMockElectronAPI>

  beforeEach(() => {
    vi.clearAllMocks()
    mockAPI = createMockElectronAPI()
    ;(window as any).electronAPI = mockAPI
  })

  // ─── send_message_to_app ──────────────────────────────────────────

  describe('send_message_to_app', () => {
    it('is registered in toolRegistry', () => {
      const tool = toolRegistry.get('send_message_to_app')
      expect(tool).toBeDefined()
      expect(tool!.riskLevel).toBe('high')
      expect(tool!.category).toBe('automation')
    })

    it('executes with app and message params', async () => {
      const result = await toolRegistry.get('send_message_to_app')!.execute({
        app: 'WeChat',
        message: 'Hello',
      })
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ app: 'WeChat', message: 'Hello' })
    })

    it('calls focusWindow, clipboardWrite, sendKeys (^v then ENTER)', async () => {
      await toolRegistry.get('send_message_to_app')!.execute({
        app: 'WeChat',
        message: 'Test msg',
      })

      expect(mockAPI.focusWindow).toHaveBeenCalledWith('WeChat')
      expect(mockAPI.clipboardWrite).toHaveBeenCalledWith('Test msg')
      // First call should be paste (^v), second should be ENTER
      expect(mockAPI.sendKeys).toHaveBeenCalledWith('^v')
      expect(mockAPI.sendKeys).toHaveBeenCalledWith('{ENTER}')
      expect(mockAPI.sendKeys).toHaveBeenCalledTimes(2)
    })

    it('returns success with summary containing app name', async () => {
      const result = await toolRegistry.get('send_message_to_app')!.execute({
        app: 'Discord',
        message: 'hi there',
      })
      expect(result.success).toBe(true)
      expect(result.summary).toContain('Discord')
    })

    it('handles errors when focusWindow rejects', async () => {
      mockAPI.focusWindow.mockRejectedValue(new Error('Window not found'))
      const result = await toolRegistry.get('send_message_to_app')!.execute({
        app: 'FakeApp',
        message: 'test',
      })
      expect(result.success).toBe(false)
      // Should be humanized, not raw error
      expect(result.summary).not.toBe('')
    })
  })

  // ─── type_in_app ──────────────────────────────────────────────────

  describe('type_in_app', () => {
    it('is registered in toolRegistry', () => {
      const tool = toolRegistry.get('type_in_app')
      expect(tool).toBeDefined()
      expect(tool!.riskLevel).toBe('medium')
      expect(tool!.category).toBe('automation')
    })

    it('calls focusWindow, clipboardWrite, sendKeys (^v only, no ENTER)', async () => {
      await toolRegistry.get('type_in_app')!.execute({
        app: 'Notepad',
        text: 'Some text',
      })

      expect(mockAPI.focusWindow).toHaveBeenCalledWith('Notepad')
      expect(mockAPI.clipboardWrite).toHaveBeenCalledWith('Some text')
      expect(mockAPI.sendKeys).toHaveBeenCalledWith('^v')
      // Should NOT send ENTER
      expect(mockAPI.sendKeys).toHaveBeenCalledTimes(1)
    })

    it('handles no electronAPI', async () => {
      const savedAPI = (window as any).electronAPI
      ;(window as any).electronAPI = undefined

      try {
        const result = await toolRegistry.get('type_in_app')!.execute({
          app: 'Code',
          text: 'test',
        })
        expect(result.success).toBe(false)
        expect(result.summary).toContain('Niromi')
      } finally {
        ;(window as any).electronAPI = savedAPI
      }
    })
  })
})
