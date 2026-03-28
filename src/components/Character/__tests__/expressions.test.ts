import { describe, it, expect } from 'vitest'
import { expressionMap, type ExpressionStyle } from '../expressions'
import type { AnimationState } from '@/stores/characterStore'

const ALL_STATES: AnimationState[] = [
  'idle',
  'curious',
  'focused',
  'happy',
  'concerned',
  'yawning',
  'sleepy',
  'monitoring',
  'alert',
]

describe('expressionMap', () => {
  it('has an entry for every AnimationState', () => {
    for (const state of ALL_STATES) {
      expect(expressionMap[state]).toBeDefined()
    }
  })

  it('has exactly 9 entries matching all states', () => {
    expect(Object.keys(expressionMap)).toHaveLength(ALL_STATES.length)
  })

  describe('eyesActive', () => {
    it('is false for sleepy', () => {
      expect(expressionMap.sleepy.eyesActive).toBe(false)
    })

    it('is false for yawning', () => {
      expect(expressionMap.yawning.eyesActive).toBe(false)
    })

    it('is true for idle', () => {
      expect(expressionMap.idle.eyesActive).toBe(true)
    })

    it('is true for all non-sleeping states', () => {
      const activeStates: AnimationState[] = [
        'idle',
        'curious',
        'focused',
        'happy',
        'concerned',
        'monitoring',
        'alert',
      ]
      for (const state of activeStates) {
        expect(expressionMap[state].eyesActive).toBe(true)
      }
    })
  })

  describe('value ranges', () => {
    it('breathSpeed is positive for all states', () => {
      for (const state of ALL_STATES) {
        expect(expressionMap[state].breathSpeed).toBeGreaterThan(0)
      }
    })

    it('scale is between 0.5 and 1.5 for all states', () => {
      for (const state of ALL_STATES) {
        expect(expressionMap[state].scale).toBeGreaterThanOrEqual(0.5)
        expect(expressionMap[state].scale).toBeLessThanOrEqual(1.5)
      }
    })

    it('glowIntensity is between 0 and 1 for all states', () => {
      for (const state of ALL_STATES) {
        expect(expressionMap[state].glowIntensity).toBeGreaterThanOrEqual(0)
        expect(expressionMap[state].glowIntensity).toBeLessThanOrEqual(1)
      }
    })

    it('brightness is between 0 and 2 for all states', () => {
      for (const state of ALL_STATES) {
        expect(expressionMap[state].brightness).toBeGreaterThan(0)
        expect(expressionMap[state].brightness).toBeLessThanOrEqual(2)
      }
    })

    it('bounce is non-negative for all states', () => {
      for (const state of ALL_STATES) {
        expect(expressionMap[state].bounce).toBeGreaterThanOrEqual(0)
      }
    })

    it('glowColor is a valid CSS hex color for all states', () => {
      const hexPattern = /^#[0-9A-Fa-f]{6}$/
      for (const state of ALL_STATES) {
        expect(expressionMap[state].glowColor).toMatch(hexPattern)
      }
    })
  })

  describe('specific expression properties', () => {
    it('idle has neutral default values', () => {
      const idle = expressionMap.idle
      expect(idle.scale).toBe(1)
      expect(idle.tilt).toBe(0)
      expect(idle.bounce).toBe(0)
    })

    it('happy has bounce > 0 (bouncy animation)', () => {
      expect(expressionMap.happy.bounce).toBeGreaterThan(0)
    })

    it('sleepy has slower breathSpeed than idle', () => {
      expect(expressionMap.sleepy.breathSpeed).toBeGreaterThan(
        expressionMap.idle.breathSpeed
      )
    })

    it('sleepy has lower brightness than idle', () => {
      expect(expressionMap.sleepy.brightness).toBeLessThan(
        expressionMap.idle.brightness
      )
    })

    it('alert has higher glowIntensity than idle', () => {
      expect(expressionMap.alert.glowIntensity).toBeGreaterThan(
        expressionMap.idle.glowIntensity
      )
    })
  })

  describe('ExpressionStyle shape', () => {
    it('every entry has all required keys', () => {
      const requiredKeys: (keyof ExpressionStyle)[] = [
        'breathSpeed',
        'scale',
        'tilt',
        'bounce',
        'glowColor',
        'glowIntensity',
        'brightness',
        'eyesActive',
      ]
      for (const state of ALL_STATES) {
        for (const key of requiredKeys) {
          expect(expressionMap[state]).toHaveProperty(key)
        }
      }
    })
  })
})
