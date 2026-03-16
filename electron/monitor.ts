import { ipcMain, BrowserWindow } from 'electron'
import { exec } from 'child_process'
import os from 'os'

let pollingInterval: NodeJS.Timeout | null = null
let lastApp = ''
let lastTitle = ''

function getActiveWindow(): Promise<{ app: string; title: string }> {
  // Reuse the same PowerShell approach from main.ts for win32
  // For other platforms, use appropriate commands
  return new Promise((resolve) => {
    if (os.platform() === 'win32') {
      exec(
        'powershell -command "[Console]::OutputEncoding=[Text.Encoding]::UTF8; Add-Type @\\"\\nusing System;using System.Runtime.InteropServices;\\npublic class Win32{[DllImport(\\"user32.dll\\")]public static extern IntPtr GetForegroundWindow();}\\n\\"@; $h=[Win32]::GetForegroundWindow(); $p=Get-Process | Where-Object {$_.MainWindowHandle -eq $h} | Select -First 1; Write-Output \\"$($p.ProcessName)|$($p.MainWindowTitle)\\""',
        { timeout: 5000 },
        (err, stdout) => {
          if (err) return resolve({ app: 'unknown', title: '' })
          const parts = stdout.trim().split('|')
          resolve({ app: parts[0] || 'unknown', title: parts.slice(1).join('|') || '' })
        }
      )
    } else {
      resolve({ app: 'unknown', title: '' })
    }
  })
}

export function setupMonitor(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('monitor-start', (_event, intervalMs: number = 2000) => {
    if (pollingInterval) clearInterval(pollingInterval)
    pollingInterval = setInterval(async () => {
      try {
        const { app, title } = await getActiveWindow()
        if (app !== lastApp || title !== lastTitle) {
          lastApp = app
          lastTitle = title
          const win = getMainWindow()
          win?.webContents.send('window-changed', { app, title })
        }
      } catch { /* ignore */ }
    }, intervalMs)
  })

  ipcMain.handle('monitor-stop', () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  })
}
