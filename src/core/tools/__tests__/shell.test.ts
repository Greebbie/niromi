import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockElectronAPI } from '@/test/helpers'
import { toolRegistry } from '../registry'

// Register shell tools (side-effect import)
import '../shell'

describe('run_shell tool', () => {
  let mockAPI: ReturnType<typeof createMockElectronAPI>

  beforeEach(() => {
    vi.clearAllMocks()
    mockAPI = createMockElectronAPI()
    ;(window as any).electronAPI = mockAPI
  })

  it('is registered in toolRegistry with high risk level', () => {
    const tool = toolRegistry.get('run_shell')
    expect(tool).toBeDefined()
    expect(tool!.name).toBe('run_shell')
    expect(tool!.riskLevel).toBe('high')
    expect(tool!.category).toBe('system')
  })

  it('calls electronAPI.runShell and returns stdout in summary', async () => {
    mockAPI.runShell.mockResolvedValue({
      stdout: 'line1\nline2\nline3',
      stderr: '',
    })

    const result = await toolRegistry.get('run_shell')!.execute({ command: 'ls -la' })

    expect(result.success).toBe(true)
    expect(mockAPI.runShell).toHaveBeenCalledWith('ls -la')
    expect(result.data).toEqual({ stdout: 'line1\nline2\nline3', stderr: '' })
    expect(result.summary).toContain('3 lines')
    expect(result.summary).not.toContain('warnings')
  })

  it('includes warning note in summary when stderr is present', async () => {
    mockAPI.runShell.mockResolvedValue({
      stdout: 'output',
      stderr: 'warning: something',
    })

    const result = await toolRegistry.get('run_shell')!.execute({ command: 'npm install' })

    expect(result.success).toBe(true)
    expect(result.summary).toContain('with warnings')
    expect(result.data).toEqual({ stdout: 'output', stderr: 'warning: something' })
  })

  it('returns humanized error when runShell rejects', async () => {
    mockAPI.runShell.mockRejectedValue(new Error('EACCES permission denied'))

    const result = await toolRegistry.get('run_shell')!.execute({ command: 'rm -rf /' })

    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(result.summary).toContain('permission')
  })

  it('returns error when electronAPI is undefined', async () => {
    const savedAPI = (window as any).electronAPI
    ;(window as any).electronAPI = undefined

    try {
      const result = await toolRegistry.get('run_shell')!.execute({ command: 'echo hi' })
      expect(result.success).toBe(false)
      expect(result.data).toBeNull()
      expect(result.summary).toContain('Niromi')
    } finally {
      ;(window as any).electronAPI = savedAPI
    }
  })
})
