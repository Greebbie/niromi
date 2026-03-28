import { skillRegistry } from './registry'
import { parseSkillMd } from './skillmd-parser'
import type { InstalledSkillRecord, MarketplaceIndex, MarketplaceIndexEntry } from './marketplace'
import { useChatStore } from '@/stores/chatStore'
import { humanizeError } from '@/core/errors/humanize'

const MARKETPLACE_INDEX_URL = '/skill-index.json'

/**
 * Load installed marketplace skills at startup.
 */
export async function initMarketplaceSkills(): Promise<void> {
  try {
    // Get installed list from persistent store
    const installed = (await window.electronAPI.storeGet('marketplace-installed')) as InstalledSkillRecord[] | null

    // Scan local skill folders
    const localSkills = await window.electronAPI.skillScanLocal()

    // Process local skills
    for (const local of localSkills) {
      // Skip if already registered (e.g. builtin)
      if (skillRegistry.get(local.id)) continue

      const { meta } = parseSkillMd(local.skillMdContent, local.files)
      if (!meta.name) continue

      // Validate requirements before registering
      if (meta.requires?.length) {
        const missing = await checkRequirements(meta.requires)
        if (missing.length > 0) {
          console.warn(`[Niromi] Skill "${local.id}" skipped — missing: ${missing.join(', ')}`)
          continue
        }
      }

      const skillDir = await window.electronAPI.skillGetDir()

      skillRegistry.register({
        id: local.id,
        name: meta.name || local.id,
        nameEn: meta.nameEn || local.id,
        icon: meta.icon || '\u2699\uFE0F',
        category: meta.category || 'custom',
        description: meta.description || '',
        keywords: meta.keywords || [],
        aiInvocable: meta.aiInvocable,
        execute: meta.executionMode === 'shell' && meta.scriptInterpreter
          ? createShellExecutor(`${skillDir}/${local.id}`, meta.scriptInterpreter)
          : undefined,
      })
    }

    // Re-register installed skills that weren't found locally
    if (installed) {
      for (const record of installed) {
        if (skillRegistry.get(record.id)) continue
        // Skill directory might have been deleted — skip
      }
    }
  } catch (err) {
    console.warn('[Niromi] Failed to init marketplace skills:', err)
  }
}

/** Validate a skill ID — only allows safe characters, no path traversal */
function isValidSkillId(id: string): boolean {
  return /^[a-z0-9][a-z0-9_-]*$/.test(id) && !id.includes('..')
}

/** Check if required binaries exist on PATH. Returns names of missing ones. */
async function checkRequirements(bins: string[]): Promise<string[]> {
  const missing: string[] = []
  for (const bin of bins) {
    // Validate binary name to prevent shell injection
    if (!/^[\w.-]+$/.test(bin)) { missing.push(bin); continue }
    try {
      const cmd = process.platform === 'win32' ? `where ${bin}` : `which ${bin}`
      await window.electronAPI.runShell(cmd)
    } catch {
      missing.push(bin)
    }
  }
  return missing
}

function createShellExecutor(skillDir: string, interpreter: string) {
  return async (input: string) => {
    const result = await window.electronAPI.skillExecScript({
      skillDir,
      interpreter,
      params: { INPUT: input },
    })

    const output = result.stdout || result.stderr || '(no output)'
    useChatStore.getState().addMessage({
      role: 'assistant',
      content: result.exitCode === 0 ? output : humanizeError(output, 'auto'),
    })
  }
}

/** Map interpreter to script filename */
const INTERPRETER_FILE: Record<string, string> = {
  node: 'run.js',
  python: 'run.py',
  bash: 'run.sh',
  powershell: 'run.ps1',
}

export interface CreateLocalSkillConfig {
  id: string
  name: string
  nameEn: string
  icon: string
  description: string
  category?: string
  aiInvocable?: boolean
  script: string
  interpreter: 'node' | 'python' | 'bash' | 'powershell'
}

/**
 * Create a local skill programmatically — writes SKILL.md + script to disk and hot-registers.
 * This is the backend for both the UI wizard and natural language skill creation.
 */
export async function createLocalSkill(config: CreateLocalSkillConfig): Promise<boolean> {
  // Validate skill ID to prevent path traversal
  if (!isValidSkillId(config.id)) {
    console.error(`[Niromi] Invalid skill ID: "${config.id}"`)
    return false
  }
  try {
    const skillDir = await window.electronAPI.skillGetDir()
    const skillPath = `${skillDir}/${config.id}`

    // 1. Create folder
    await window.electronAPI.createDirectory(skillPath)

    // 2. Generate SKILL.md
    const category = config.category || 'custom'
    const aiInvocable = config.aiInvocable !== false
    const skillMdContent = [
      '---',
      `name: ${config.name}`,
      `nameEn: ${config.nameEn}`,
      `icon: ${config.icon}`,
      `description: ${config.description}`,
      `category: ${category}`,
      `executionMode: shell`,
      `aiInvocable: ${aiInvocable}`,
      '---',
      '',
      `# ${config.name}`,
      '',
      config.description,
    ].join('\n')

    // 3. Write SKILL.md
    await window.electronAPI.writeFile(`${skillPath}/SKILL.md`, skillMdContent)

    // 4. Write script file
    const scriptFile = INTERPRETER_FILE[config.interpreter] || 'run.js'
    await window.electronAPI.writeFile(`${skillPath}/${scriptFile}`, config.script)

    // 5. Parse and hot-register (no restart needed)
    const files = ['SKILL.md', scriptFile]
    const { meta } = parseSkillMd(skillMdContent, files)

    // Unregister if already exists (overwrite scenario)
    if (skillRegistry.get(config.id)) {
      skillRegistry.unregister(config.id)
    }

    skillRegistry.register({
      id: config.id,
      name: meta.name || config.name,
      nameEn: meta.nameEn || config.nameEn,
      icon: meta.icon || config.icon,
      category: (meta.category as any) || 'custom',
      description: meta.description || config.description,
      keywords: meta.keywords || [],
      aiInvocable: aiInvocable,
      execute: createShellExecutor(skillPath, config.interpreter),
    })

    return true
  } catch (err) {
    console.error('[Niromi] createLocalSkill failed:', err)
    return false
  }
}

/**
 * Re-scan and register any new local skills without restart.
 * Skips already-registered skills (same logic as initMarketplaceSkills).
 */
export async function reloadLocalSkills(): Promise<void> {
  await initMarketplaceSkills()
}

/**
 * Install a skill from the marketplace.
 */
export async function installSkill(entry: MarketplaceIndexEntry): Promise<boolean> {
  try {
    const filesToDownload = ['SKILL.md']
    // Try to download common script files
    for (const f of ['run.js', 'run.py', 'run.sh', 'run.ps1']) {
      filesToDownload.push(f)
    }

    const result = await window.electronAPI.skillInstall({
      repoUrl: entry.repoUrl,
      skillId: entry.id,
      files: filesToDownload,
    })

    if (!result.success) return false

    // Read the installed SKILL.md and register
    const localSkills = await window.electronAPI.skillScanLocal()
    const local = localSkills.find(s => s.id === entry.id)
    if (local) {
      const { meta } = parseSkillMd(local.skillMdContent, local.files)

      skillRegistry.register({
        id: entry.id,
        name: meta.name || entry.name,
        nameEn: meta.nameEn || entry.nameEn,
        icon: meta.icon || entry.icon,
        category: meta.category || entry.category,
        description: meta.description || entry.description,
        keywords: meta.keywords || entry.tags,
        aiInvocable: meta.aiInvocable,
        execute: meta.executionMode === 'shell' && meta.scriptInterpreter
          ? createShellExecutor(result.skillDir, meta.scriptInterpreter)
          : undefined,
      })
    }

    // Update installed list
    const installed = ((await window.electronAPI.storeGet('marketplace-installed')) as InstalledSkillRecord[] | null) || []
    const record: InstalledSkillRecord = {
      id: entry.id,
      name: entry.name,
      version: entry.version,
      source: entry.source,
      installedAt: Date.now(),
      repoUrl: entry.repoUrl,
      skillDir: result.skillDir,
    }
    const updated = installed.filter(r => r.id !== entry.id)
    updated.push(record)
    await window.electronAPI.storeSet('marketplace-installed', updated)

    return true
  } catch (err) {
    console.error('[Niromi] Install skill failed:', err)
    return false
  }
}

/**
 * Uninstall a marketplace skill.
 */
export async function uninstallSkill(skillId: string): Promise<void> {
  skillRegistry.unregister(skillId)
  await window.electronAPI.skillUninstall(skillId)

  const installed = ((await window.electronAPI.storeGet('marketplace-installed')) as InstalledSkillRecord[] | null) || []
  const updated = installed.filter(r => r.id !== skillId)
  await window.electronAPI.storeSet('marketplace-installed', updated)
}

/**
 * Fetch the remote marketplace index.
 */
export async function fetchMarketplaceIndex(): Promise<MarketplaceIndex> {
  try {
    const res = await fetch(MARKETPLACE_INDEX_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    return { version: 0, updatedAt: '', skills: [] }
  }
}
