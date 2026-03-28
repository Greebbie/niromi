import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toolRegistry } from '../registry'
import { useAdminStore } from '@/stores/adminStore'
import { useFeedbackStore } from '@/stores/feedbackStore'

const testTool = {
  name: 'test_tool',
  description: 'A test tool',
  parameters: { type: 'object', properties: {} },
  riskLevel: 'low' as const,
  category: 'system' as const,
  execute: vi.fn().mockResolvedValue({ success: true, data: 'ok', summary: 'done' }),
}

describe('ToolRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(toolRegistry as any).tools.clear()
    // Reset admin store to clean state
    useAdminStore.setState({
      permissions: [],
      auditLog: [],
    })
    // Reset feedback store
    useFeedbackStore.setState({ toasts: [] })
  })

  // ─── register / get ──────────────────────────────────────────────────

  it('register adds tool, get returns it', () => {
    toolRegistry.register(testTool)
    const retrieved = toolRegistry.get('test_tool')
    expect(retrieved).toBeDefined()
    expect(retrieved!.name).toBe('test_tool')
    expect(retrieved!.description).toBe('A test tool')
  })

  it('get returns undefined for unknown tool', () => {
    const result = toolRegistry.get('nonexistent')
    expect(result).toBeUndefined()
  })

  // ─── getAll ──────────────────────────────────────────────────────────

  it('getAll returns all registered tools', () => {
    toolRegistry.register(testTool)
    toolRegistry.register({ ...testTool, name: 'another_tool', category: 'files' as const })
    const all = toolRegistry.getAll()
    expect(all).toHaveLength(2)
    expect(all.map((t) => t.name)).toEqual(['test_tool', 'another_tool'])
  })

  // ─── getByCategory ───────────────────────────────────────────────────

  it('getByCategory filters correctly', () => {
    toolRegistry.register(testTool)
    toolRegistry.register({ ...testTool, name: 'file_tool', category: 'files' as const })
    toolRegistry.register({ ...testTool, name: 'sys_tool2', category: 'system' as const })

    const systemTools = toolRegistry.getByCategory('system')
    expect(systemTools).toHaveLength(2)
    expect(systemTools.map((t) => t.name)).toEqual(['test_tool', 'sys_tool2'])

    const fileTools = toolRegistry.getByCategory('files')
    expect(fileTools).toHaveLength(1)
    expect(fileTools[0].name).toBe('file_tool')
  })

  // ─── getToolDefs ─────────────────────────────────────────────────────

  it('getToolDefs returns name/description/parameters only', () => {
    toolRegistry.register(testTool)
    const defs = toolRegistry.getToolDefs()
    expect(defs).toHaveLength(1)
    expect(defs[0]).toEqual({
      name: 'test_tool',
      description: 'A test tool',
      parameters: { type: 'object', properties: {} },
    })
    // Should not contain execute or riskLevel
    expect(defs[0]).not.toHaveProperty('execute')
    expect(defs[0]).not.toHaveProperty('riskLevel')
  })

  // ─── execute ─────────────────────────────────────────────────────────

  it('execute calls tool.execute with params', async () => {
    toolRegistry.register(testTool)
    const params = { foo: 'bar' }
    const result = await toolRegistry.execute('test_tool', params)
    expect(result.success).toBe(true)
    expect(result.summary).toBe('done')
    expect(testTool.execute).toHaveBeenCalledWith(params)
  })

  it('execute returns "not found" for unknown tool', async () => {
    const result = await toolRegistry.execute('nonexistent', {})
    expect(result.success).toBe(false)
    expect(result.summary).toContain('not found')
  })

  // ─── permission checks ──────────────────────────────────────────────

  it('execute checks permission via adminStore', async () => {
    toolRegistry.register(testTool)
    // Tool with no permission entry defaults to allowed
    const result = await toolRegistry.execute('test_tool', {})
    expect(result.success).toBe(true)
  })

  it('execute returns permission denied when tool is disabled', async () => {
    toolRegistry.register(testTool)
    useAdminStore.getState().updatePermission('test_tool', { enabled: false })

    const result = await toolRegistry.execute('test_tool', {})
    expect(result.success).toBe(false)
    expect(result.summary).toContain('disabled')
    // execute should not have been called
    expect(testTool.execute).not.toHaveBeenCalled()
  })

  // ─── call count tracking ────────────────────────────────────────────

  it('execute increments callCount after execution', async () => {
    toolRegistry.register(testTool)
    // Create a permission entry so callCount is tracked
    useAdminStore.getState().updatePermission('test_tool', { enabled: true })

    await toolRegistry.execute('test_tool', {})
    const perm = useAdminStore.getState().getPermission('test_tool')
    expect(perm?.callCount).toBe(1)

    await toolRegistry.execute('test_tool', {})
    const perm2 = useAdminStore.getState().getPermission('test_tool')
    expect(perm2?.callCount).toBe(2)
  })

  // ─── audit log ──────────────────────────────────────────────────────

  it('execute adds audit log entry', async () => {
    toolRegistry.register(testTool)
    await toolRegistry.execute('test_tool', { key: 'val' })

    const log = useAdminStore.getState().auditLog
    expect(log).toHaveLength(1)
    expect(log[0].toolName).toBe('test_tool')
    expect(log[0].resultSuccess).toBe(true)
    expect(log[0].resultSummary).toBe('done')
    expect(log[0].params).toContain('key')
  })

  // ─── feedback toast ─────────────────────────────────────────────────

  it('execute adds feedback toast', async () => {
    toolRegistry.register(testTool)
    await toolRegistry.execute('test_tool', {})

    const toasts = useFeedbackStore.getState().toasts
    expect(toasts.length).toBeGreaterThanOrEqual(1)
    const last = toasts[toasts.length - 1]
    expect(last.type).toBe('success')
    expect(last.message).toBe('done')
  })
})
