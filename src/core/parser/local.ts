/**
 * Local command parser — zero token consumption for simple commands.
 * Matches simple Chinese/English patterns and returns tool/skill calls directly.
 */

export type { LocalMatch } from './types'
import type { LocalMatch } from './types'
import { allPatterns } from './matchers'
import { fuzzyMatchApp, fuzzyMatchWebsite } from './utils'

/**
 * Try to match user input against local patterns.
 * Returns a match if found, null if the message should go to AI.
 */
export function parseLocal(input: string): LocalMatch | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Strip common request prefixes that don't change the intent
  const stripped = trimmed.replace(/^(?:请帮我|你帮我|能不能帮我|可以帮我|帮我|请|麻烦|帮忙)\s*/i, '')

  for (const pattern of allPatterns) {
    const match = stripped.match(pattern.regex) || trimmed.match(pattern.regex)
    if (match) {
      if (pattern.guard && !pattern.guard(match)) continue
      if (pattern.direct) {
        return {
          params: pattern.extract(match),
          directResponse: pattern.direct(match),
        }
      }
      return {
        tool: pattern.tool,
        skill: pattern.skill,
        params: pattern.extract(match),
      }
    }
  }

  // Fuzzy fallback: try to match "open X" patterns with typo tolerance
  const openMatch = stripped.match(/^(?:打开|启动|open|launch|start)\s+(.+)$/i)
    || trimmed.match(/^(?:打开|启动|open|launch|start)\s+(.+)$/i)
  if (openMatch) {
    const target = openMatch[1].trim()
    const website = fuzzyMatchWebsite(target)
    if (website) return { tool: 'open_app', params: { name: website.url } }
    const app = fuzzyMatchApp(target)
    if (app) return { tool: 'open_app', params: { name: app } }
  }

  // Fuzzy fallback for "go to X" patterns → website
  const goMatch = stripped.match(/^(?:去|go to|visit)\s+(.+)$/i)
    || trimmed.match(/^(?:去|go to|visit)\s+(.+)$/i)
  if (goMatch) {
    const website = fuzzyMatchWebsite(goMatch[1].trim())
    if (website) return { tool: 'open_app', params: { name: website.url } }
  }

  return null
}
