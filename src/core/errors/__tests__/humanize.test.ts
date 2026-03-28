import { humanizeError } from '../humanize'

describe('humanizeError', () => {
  // --- Pattern matching (11 patterns) ---

  it('matches GroupId required', () => {
    expect(humanizeError('GroupId required')).toBe(
      'Minimax 需要填 Group ID 哦~ 去设置里填一下？'
    )
  })

  it('matches 401 auth error', () => {
    expect(humanizeError(new Error('401 Unauthorized'))).toBe(
      'API Key 好像不对哦~ 去设置里检查一下？'
    )
  })

  it('matches 429 rate limit', () => {
    expect(humanizeError('429')).toBe(
      '调用太频繁了，Niromi 休息一下再试~'
    )
  })

  it('matches Minimax error', () => {
    expect(humanizeError('Minimax error: bad request')).toBe(
      'Minimax 返回了错误，检查一下 API Key 和 Group ID？'
    )
  })

  it('matches 502 server error', () => {
    expect(humanizeError('502 Bad Gateway')).toBe(
      'AI 服务那边好像出了点问题...'
    )
  })

  it('matches network error', () => {
    expect(humanizeError('fetch failed')).toBe(
      'Niromi 连不上网络呢...'
    )
  })

  it('matches timeout', () => {
    expect(humanizeError('timeout')).toBe(
      '等了好久都没有回应...再试一次？'
    )
  })

  it('matches permission denied', () => {
    expect(humanizeError('EACCES')).toBe(
      'Niromi 没有权限访问这个文件呢...'
    )
  })

  it('matches file not found', () => {
    expect(humanizeError('ENOENT')).toBe(
      '找不到这个文件哦~'
    )
  })

  it('matches disk full', () => {
    expect(humanizeError('ENOSPC')).toBe(
      '磁盘空间不够了...'
    )
  })

  it('matches file busy', () => {
    expect(humanizeError('EBUSY')).toBe(
      '这个文件正在被使用中呢...'
    )
  })

  // --- Error object vs string ---

  it('handles Error object the same as string', () => {
    const asString = humanizeError('forbidden')
    const asError = humanizeError(new Error('forbidden'))
    expect(asString).toBe(asError)
  })

  // --- Fallback behavior ---

  it('returns fallback with hint for short unmatched message', () => {
    const result = humanizeError('weird stuff')
    expect(result).toContain('呜...出了点小状况')
    expect(result).toContain('(weird stuff)')
  })

  it('returns fallback without hint for long unmatched message', () => {
    const longMsg = 'x'.repeat(100)
    const result = humanizeError(longMsg)
    expect(result).toBe('呜...出了点小状况，Niromi 也不太确定怎么回事')
    expect(result).not.toContain('(')
  })

  // --- Language ---

  it('returns English when lang is "en"', () => {
    expect(humanizeError('timeout', 'en')).toBe(
      'No response after a long wait... try again?'
    )
  })

  it('resolves lang "auto" based on navigator.language', () => {
    // happy-dom sets navigator.language to 'en-US', so auto resolves to 'en'
    const result = humanizeError('timeout', 'auto')
    const isEn = navigator.language?.startsWith('en')
    if (isEn) {
      expect(result).toBe('No response after a long wait... try again?')
    } else {
      expect(result).toBe('等了好久都没有回应...再试一次？')
    }
  })

  // --- null / undefined ---

  it('handles null/undefined input gracefully', () => {
    const fromNull = humanizeError(null)
    const fromUndefined = humanizeError(undefined)
    expect(fromNull).toContain('呜...出了点小状况')
    expect(fromUndefined).toBe('呜...出了点小状况，Niromi 也不太确定怎么回事')
  })
})
