import { describe, it, expect, beforeEach } from 'vitest'
import { useCharacterStore } from '../characterStore'
import { EMOTION_DECAY_FACTOR, IDLE_SLEEP_MINUTES } from '@/core/constants'

describe('characterStore', () => {
  beforeEach(() => {
    useCharacterStore.setState({
      emotions: { curiosity: 0, focus: 0, joy: 0, concern: 0 },
      animationState: 'idle',
      lastInteraction: Date.now(),
    })
  })

  describe('setEmotions', () => {
    it('sets partial emotions and preserves other values', () => {
      useCharacterStore.getState().setEmotions({ joy: 0.8 })
      const { emotions } = useCharacterStore.getState()
      expect(emotions.joy).toBe(0.8)
      expect(emotions.curiosity).toBe(0)
      expect(emotions.focus).toBe(0)
      expect(emotions.concern).toBe(0)
    })

    it('clamps values above 1 to 1', () => {
      useCharacterStore.getState().setEmotions({ curiosity: 1.5, joy: 2.0 })
      const { emotions } = useCharacterStore.getState()
      expect(emotions.curiosity).toBe(1)
      expect(emotions.joy).toBe(1)
    })

    it('clamps values below 0 to 0', () => {
      useCharacterStore.getState().setEmotions({ focus: -0.5, concern: -1 })
      const { emotions } = useCharacterStore.getState()
      expect(emotions.focus).toBe(0)
      expect(emotions.concern).toBe(0)
    })

    it('updates lastInteraction timestamp', () => {
      const before = Date.now()
      useCharacterStore.getState().setEmotions({ joy: 0.5 })
      const { lastInteraction } = useCharacterStore.getState()
      expect(lastInteraction).toBeGreaterThanOrEqual(before)
    })
  })

  describe('animationState', () => {
    it('all emotions near zero results in idle', () => {
      useCharacterStore.getState().setEmotions({ curiosity: 0.1, focus: 0.1, joy: 0.1, concern: 0.1 })
      expect(useCharacterStore.getState().animationState).toBe('idle')
    })

    it('highest emotion curiosity results in curious', () => {
      useCharacterStore.getState().setEmotions({ curiosity: 0.9, focus: 0.2, joy: 0.1, concern: 0.1 })
      expect(useCharacterStore.getState().animationState).toBe('curious')
    })

    it('highest emotion joy results in happy', () => {
      useCharacterStore.getState().setEmotions({ curiosity: 0.1, focus: 0.1, joy: 0.9, concern: 0.1 })
      expect(useCharacterStore.getState().animationState).toBe('happy')
    })

    it('highest emotion concern results in concerned', () => {
      useCharacterStore.getState().setEmotions({ curiosity: 0.1, focus: 0.1, joy: 0.1, concern: 0.9 })
      expect(useCharacterStore.getState().animationState).toBe('concerned')
    })
  })

  describe('decay', () => {
    it('multiplies all emotions by decay factor (0.95)', () => {
      useCharacterStore.getState().setEmotions({ curiosity: 1, focus: 0.8, joy: 0.6, concern: 0.4 })
      useCharacterStore.getState().decay()
      const { emotions } = useCharacterStore.getState()
      expect(emotions.curiosity).toBeCloseTo(1 * EMOTION_DECAY_FACTOR)
      expect(emotions.focus).toBeCloseTo(0.8 * EMOTION_DECAY_FACTOR)
      expect(emotions.joy).toBeCloseTo(0.6 * EMOTION_DECAY_FACTOR)
      expect(emotions.concern).toBeCloseTo(0.4 * EMOTION_DECAY_FACTOR)
    })

    it('skips emotion update when all emotions near-zero', () => {
      useCharacterStore.setState({
        emotions: { curiosity: 0.0005, focus: 0.0001, joy: 0.0003, concern: 0.0002 },
      })
      const emotionsBefore = { ...useCharacterStore.getState().emotions }
      useCharacterStore.getState().decay()
      const emotionsAfter = useCharacterStore.getState().emotions
      // Emotions should remain unchanged (skip branch)
      expect(emotionsAfter.curiosity).toBe(emotionsBefore.curiosity)
      expect(emotionsAfter.focus).toBe(emotionsBefore.focus)
      expect(emotionsAfter.joy).toBe(emotionsBefore.joy)
      expect(emotionsAfter.concern).toBe(emotionsBefore.concern)
    })
  })

  describe('idle detection', () => {
    it('after IDLE_SLEEP_MINUTES, animationState becomes sleepy', () => {
      const sixMinutesAgo = Date.now() - 6 * 60 * 1000
      useCharacterStore.setState({
        emotions: { curiosity: 0, focus: 0, joy: 0, concern: 0 },
        lastInteraction: sixMinutesAgo,
      })
      // Trigger animationState recalculation via decay
      useCharacterStore.getState().decay()
      expect(useCharacterStore.getState().animationState).toBe('sleepy')
      // Verify the threshold is based on the constant
      expect(IDLE_SLEEP_MINUTES).toBe(5)
    })
  })
})
