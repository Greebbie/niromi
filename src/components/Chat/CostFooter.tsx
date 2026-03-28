import { useCostStore } from '@/stores/costStore'
import { useConfigStore } from '@/stores/configStore'

const FREE_PROVIDERS = new Set(['ollama', 'vllm'])

function formatCost(usd: number): string {
  if (usd === 0) return '$0'
  if (usd < 0.001) return '<$0.001'
  return `~$${usd.toFixed(3)}`
}

export default function CostFooter() {
  const { sessionCost, dailyCost } = useCostStore()
  const provider = useConfigStore((s) => s.provider)

  if (FREE_PROVIDERS.has(provider)) return null
  if (sessionCost <= 0) return null

  return (
    <div className="px-3 py-1 text-caption text-white/25 text-center select-none border-t border-white/5">
      This chat: {formatCost(sessionCost)} · Today: {formatCost(dailyCost)}
    </div>
  )
}
