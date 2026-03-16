import { create } from 'zustand'

export interface Emotions {
  curiosity: number
  focus: number
  joy: number
  concern: number
}

export type AnimationState = 'idle' | 'curious' | 'focused' | 'happy' | 'concerned' | 'sleepy' | 'yawning'

interface CharacterState {
  emotions: Emotions
  animationState: AnimationState
  lastInteraction: number
  isBlinking: boolean

  setEmotion: (key: keyof Emotions, value: number) => void
  setEmotions: (emotions: Partial<Emotions>) => void
  decay: () => void
  blink: () => void
  updateAnimationState: () => void
}

const DECAY_FACTOR = 0.95
const IDLE_THRESHOLD = 0.3
const YAWN_TIMEOUT = 4 * 60 * 1000  // 4 minutes
const SLEEP_TIMEOUT = 5 * 60 * 1000 // 5 minutes

function getAnimationState(emotions: Emotions, lastInteraction: number): AnimationState {
  const now = Date.now()
  const idleTime = now - lastInteraction

  if (idleTime > SLEEP_TIMEOUT) return 'sleepy'
  if (idleTime > YAWN_TIMEOUT) return 'yawning'

  const { curiosity, focus, joy, concern } = emotions
  const max = Math.max(curiosity, focus, joy, concern)

  if (max < IDLE_THRESHOLD) return 'idle'
  if (max === curiosity) return 'curious'
  if (max === focus) return 'focused'
  if (max === joy) return 'happy'
  if (max === concern) return 'concerned'
  return 'idle'
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  emotions: { curiosity: 0, focus: 0, joy: 0, concern: 0 },
  animationState: 'idle',
  lastInteraction: Date.now(),
  isBlinking: false,

  setEmotion: (key, value) => {
    set((state) => {
      const emotions = { ...state.emotions, [key]: Math.max(0, Math.min(1, value)) }
      return {
        emotions,
        lastInteraction: Date.now(),
        animationState: getAnimationState(emotions, Date.now()),
      }
    })
  },

  setEmotions: (partial) => {
    set((state) => {
      const emotions = { ...state.emotions }
      for (const [k, v] of Object.entries(partial)) {
        emotions[k as keyof Emotions] = Math.max(0, Math.min(1, v))
      }
      return {
        emotions,
        lastInteraction: Date.now(),
        animationState: getAnimationState(emotions, Date.now()),
      }
    })
  },

  decay: () => {
    set((state) => {
      const emotions = {
        curiosity: state.emotions.curiosity * DECAY_FACTOR,
        focus: state.emotions.focus * DECAY_FACTOR,
        joy: state.emotions.joy * DECAY_FACTOR,
        concern: state.emotions.concern * DECAY_FACTOR,
      }
      return {
        emotions,
        animationState: getAnimationState(emotions, state.lastInteraction),
      }
    })
  },

  blink: () => {
    set({ isBlinking: true })
    setTimeout(() => set({ isBlinking: false }), 150)
  },

  updateAnimationState: () => {
    const state = get()
    set({ animationState: getAnimationState(state.emotions, state.lastInteraction) })
  },
}))
