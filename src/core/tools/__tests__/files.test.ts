import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockElectronAPI } from '@/test/helpers'
import { toolRegistry } from '../registry'

// Register file tools (side-effect import)
import '../files'

describe('file tools', () => {
  let mockAPI: ReturnType<typeof createMockElectronAPI>

  beforeEach(() => {
    vi.clearAllMocks()
    mockAPI = createMockElectronAPI()
    ;(window as any).electronAPI = mockAPI
  })

  // ─── list_files ───────────────────────────────────────────────────

  it('list_files calls electronAPI.listFiles and returns count summary', async () => {
    mockAPI.listFiles.mockResolvedValue([
      { name: 'test.txt', isDir: false },
      { name: 'folder', isDir: true },
    ])

    const result = await toolRegistry.get('list_files')!.execute({ path: '/tmp' })

    expect(result.success).toBe(true)
    expect(mockAPI.listFiles).toHaveBeenCalledWith('/tmp')
    expect(result.summary).toContain('2 items')
    expect(result.summary).toContain('1 folders')
    expect(result.summary).toContain('1 files')
  })

  // ─── read_file ────────────────────────────────────────────────────

  it('read_file calls electronAPI.readFile and returns line count', async () => {
    mockAPI.readFile.mockResolvedValue('line1\nline2\nline3')

    const result = await toolRegistry.get('read_file')!.execute({ path: '/tmp/test.txt' })

    expect(result.success).toBe(true)
    expect(mockAPI.readFile).toHaveBeenCalledWith('/tmp/test.txt')
    expect(result.summary).toContain('3 lines')
    expect(result.summary).toContain('17 chars')
  })

  // ─── create_directory ─────────────────────────────────────────────

  it('create_directory calls electronAPI.createDirectory', async () => {
    const result = await toolRegistry.get('create_directory')!.execute({ path: '/tmp/newdir' })

    expect(result.success).toBe(true)
    expect(mockAPI.createDirectory).toHaveBeenCalledWith('/tmp/newdir')
    expect(result.summary).toBe('Directory created')
  })

  // ─── write_file ───────────────────────────────────────────────────

  it('write_file calls electronAPI.writeFile', async () => {
    const result = await toolRegistry.get('write_file')!.execute({
      path: '/tmp/out.txt',
      content: 'hello world',
    })

    expect(result.success).toBe(true)
    expect(mockAPI.writeFile).toHaveBeenCalledWith('/tmp/out.txt', 'hello world')
    expect(result.summary).toContain('/tmp/out.txt')
  })

  // ─── delete_files ─────────────────────────────────────────────────

  it('delete_files calls electronAPI.deleteFiles', async () => {
    const result = await toolRegistry.get('delete_files')!.execute({ path: '/tmp/old.txt' })

    expect(result.success).toBe(true)
    expect(mockAPI.deleteFiles).toHaveBeenCalledWith('/tmp/old.txt')
    expect(result.summary).toBe('Deleted')
  })

  // ─── search_files ─────────────────────────────────────────────────

  it('search_files calls electronAPI.searchFiles and returns match count', async () => {
    mockAPI.searchFiles.mockResolvedValue(['a.txt', 'b.txt'])

    const result = await toolRegistry.get('search_files')!.execute({
      path: '/home',
      pattern: '*.txt',
    })

    expect(result.success).toBe(true)
    expect(mockAPI.searchFiles).toHaveBeenCalledWith('/home', '*.txt')
    expect(result.summary).toContain('2 matches')
    expect(result.data).toEqual(['a.txt', 'b.txt'])
  })
})
