import { vi } from 'vitest'
import { useCostStore } from '../costStore'

describe('costStore', () => {
  beforeEach(() => {
    useCostStore.setState({
      sessionTokensIn: 0,
      sessionTokensOut: 0,
      sessionCost: 0,
      lastMessageCost: null,
      dailyCost: 0,
      dailyDate: new Date().toISOString().slice(0, 10),
      monthlyCost: 0,
      monthlyDate: new Date().toISOString().slice(0, 7),
    })
  })

  describe('addUsage', () => {
    it('increases sessionTokensIn and sessionTokensOut', () => {
      useCostStore.getState().addUsage(500, 100, 'claude', 'claude-sonnet-4')
      const state = useCostStore.getState()
      expect(state.sessionTokensIn).toBe(500)
      expect(state.sessionTokensOut).toBe(100)
    })

    it('calculates cost correctly (1000 in + 100 out with claude-sonnet-4)', () => {
      // claude-sonnet-4: input=$3/1M, output=$15/1M
      // cost = (1000 * 3 + 100 * 15) / 1_000_000 = (3000 + 1500) / 1_000_000 = 0.0045
      useCostStore.getState().addUsage(1000, 100, 'claude', 'claude-sonnet-4')
      const state = useCostStore.getState()
      expect(state.sessionCost).toBeCloseTo(0.0045, 6)
    })

    it('accumulates sessionCost across calls', () => {
      useCostStore.getState().addUsage(1000, 100, 'claude', 'claude-sonnet-4')
      useCostStore.getState().addUsage(1000, 100, 'claude', 'claude-sonnet-4')
      const state = useCostStore.getState()
      expect(state.sessionCost).toBeCloseTo(0.009, 6)
    })

    it('sets lastMessageCost to most recent cost', () => {
      useCostStore.getState().addUsage(1000, 100, 'claude', 'claude-sonnet-4')
      expect(useCostStore.getState().lastMessageCost).toBeCloseTo(0.0045, 6)

      useCostStore.getState().addUsage(2000, 200, 'claude', 'claude-sonnet-4')
      // (2000 * 3 + 200 * 15) / 1_000_000 = 0.009
      expect(useCostStore.getState().lastMessageCost).toBeCloseTo(0.009, 6)
    })

    it('accumulates dailyCost', () => {
      useCostStore.getState().addUsage(1000, 100, 'claude', 'claude-sonnet-4')
      useCostStore.getState().addUsage(1000, 100, 'claude', 'claude-sonnet-4')
      expect(useCostStore.getState().dailyCost).toBeCloseTo(0.009, 6)
    })

    it('accumulates monthlyCost', () => {
      useCostStore.getState().addUsage(1000, 100, 'claude', 'claude-sonnet-4')
      useCostStore.getState().addUsage(1000, 100, 'claude', 'claude-sonnet-4')
      expect(useCostStore.getState().monthlyCost).toBeCloseTo(0.009, 6)
    })

    it('resets dailyCost when date changes', () => {
      // Set dailyDate to yesterday
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      useCostStore.setState({ dailyCost: 1.0, dailyDate: yesterday })

      useCostStore.getState().addUsage(1000, 100, 'claude', 'claude-sonnet-4')
      const state = useCostStore.getState()
      // dailyCost should be reset to 0 + new cost, not 1.0 + new cost
      expect(state.dailyCost).toBeCloseTo(0.0045, 6)
      expect(state.dailyDate).toBe(new Date().toISOString().slice(0, 10))
    })

    it('resets monthlyCost when month changes', () => {
      // Set monthlyDate to a different month
      useCostStore.setState({ monthlyCost: 5.0, monthlyDate: '2020-01' })

      useCostStore.getState().addUsage(1000, 100, 'claude', 'claude-sonnet-4')
      const state = useCostStore.getState()
      // monthlyCost should be reset to 0 + new cost
      expect(state.monthlyCost).toBeCloseTo(0.0045, 6)
    })
  })

  describe('resetSession', () => {
    it('clears session counters but keeps daily/monthly', () => {
      useCostStore.getState().addUsage(1000, 100, 'claude', 'claude-sonnet-4')
      const dailyBefore = useCostStore.getState().dailyCost
      const monthlyBefore = useCostStore.getState().monthlyCost

      useCostStore.getState().resetSession()

      const state = useCostStore.getState()
      expect(state.sessionTokensIn).toBe(0)
      expect(state.sessionTokensOut).toBe(0)
      expect(state.sessionCost).toBe(0)
      expect(state.lastMessageCost).toBeNull()
      expect(state.dailyCost).toBe(dailyBefore)
      expect(state.monthlyCost).toBe(monthlyBefore)
    })
  })

  describe('free providers', () => {
    it('ollama has zero cost', () => {
      useCostStore.getState().addUsage(10000, 5000, 'ollama', 'llama3')
      const state = useCostStore.getState()
      expect(state.sessionCost).toBe(0)
      expect(state.lastMessageCost).toBe(0)
    })
  })
})
