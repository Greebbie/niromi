export interface LocalMatch {
  tool?: string
  skill?: string
  params: Record<string, unknown>
  /** Direct response — no tool/skill needed, return this text immediately */
  directResponse?: string
}

export interface Pattern {
  regex: RegExp
  tool?: string
  skill?: string
  extract: (match: RegExpMatchArray) => Record<string, unknown>
  /** If set, returns a direct response instead of a tool/skill call */
  direct?: (match: RegExpMatchArray) => string
  /** Additional validation — if returns false, skip this pattern */
  guard?: (match: RegExpMatchArray) => boolean
}
