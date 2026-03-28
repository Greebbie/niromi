export const KNOWN_APPS = new Set([
  // Browsers
  'chrome', 'firefox', 'edge', 'safari', 'brave', 'opera', 'arc',
  // Dev tools
  'vs code', 'vscode', 'cursor', 'notepad', 'notepad++', 'sublime', 'terminal',
  'cmd', 'powershell', 'git bash', 'warp', 'iterm',
  // Office
  'word', 'excel', 'powerpoint', 'ppt', 'onenote', 'outlook', 'teams',
  'wps', '记事本',
  // Communication
  'wechat', '微信', 'qq', 'discord', 'slack', 'telegram', 'zoom', 'dingtalk', '钉钉',
  'feishu', '飞书',
  // Media
  'spotify', '网易云', '网易云音乐', 'vlc', 'potplayer',
  // Utilities
  'calculator', '计算器', 'explorer', '文件管理器', 'finder',
  'settings', '设置', 'control panel', '控制面板',
  'task manager', '任务管理器', 'snipping tool', '截图工具',
  // Productivity
  'notion', 'obsidian', 'typora', 'postman', 'docker', 'vmware',
  // Chinese apps
  '剪映', 'capcut', '腾讯会议', 'tencent meeting',
  // Games & others
  'steam', 'epic', 'obs', 'photoshop', 'figma', 'blender',
])

export function isKnownApp(name: string): boolean {
  const lower = name.toLowerCase().trim()
  if (KNOWN_APPS.has(lower)) return true
  if (/[/\\]|\.exe$/i.test(lower)) return true
  return false
}
