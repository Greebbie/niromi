import { KNOWN_APPS } from './data/known-apps'
import { KNOWN_WEBSITES } from './data/known-websites'

/** Levenshtein edit distance — zero-token fuzzy matching */
export function editDistance(a: string, b: string): number {
  const la = a.length
  const lb = b.length
  const dp: number[] = Array.from({ length: lb + 1 }, (_, i) => i)

  for (let i = 1; i <= la; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= lb; j++) {
      const temp = dp[j]
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = temp
    }
  }
  return dp[lb]
}

/** Find closest matching known app (edit distance ≤ 2) */
export function fuzzyMatchApp(input: string): string | null {
  const lower = input.toLowerCase().trim()
  if (lower.length < 2) return null

  let bestMatch: string | null = null
  let bestDist = 3
  for (const app of KNOWN_APPS) {
    const dist = editDistance(lower, app)
    if (dist < bestDist) {
      bestDist = dist
      bestMatch = app
    }
  }
  return bestMatch
}

/** Find closest matching known website (edit distance ≤ 2) */
export function fuzzyMatchWebsite(input: string): { name: string; url: string } | null {
  const lower = input.toLowerCase().trim()
  if (lower.length < 3) return null

  let bestMatch: string | null = null
  let bestDist = 3
  for (const name of Object.keys(KNOWN_WEBSITES)) {
    const dist = editDistance(lower, name)
    if (dist < bestDist) {
      bestDist = dist
      bestMatch = name
    }
  }
  return bestMatch ? { name: bestMatch, url: KNOWN_WEBSITES[bestMatch] } : null
}
