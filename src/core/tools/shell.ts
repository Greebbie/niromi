import { toolRegistry } from './registry'

toolRegistry.register({
  name: 'run_shell',
  description: 'Execute a shell command (requires confirmation)',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Shell command to execute' },
    },
    required: ['command'],
  },
  riskLevel: 'high',
  category: 'system',
  execute: async (params) => {
    try {
      const command = params.command as string
      const { stdout, stderr } = await window.electronAPI.runShell(command)
      if (stderr) {
        return {
          success: false,
          data: { stderr },
          summary: `Error: ${stderr.slice(0, 100)}`,
        }
      }
      const lines = stdout.split('\n').length
      return {
        success: true,
        data: { stdout },
        summary: `OK, ${lines} lines output`,
      }
    } catch (err) {
      return { success: false, data: null, summary: `Failed: ${(err as Error).message}` }
    }
  },
})
