import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { Layers } from 'lucide-react'

export const metadata = { title: 'Strategies' }

export default function StrategiesPage() {
  return (
    <PlaceholderPage
      title="Strategies"
      description="Strategy card grid with win rate badge, trade count, and mini sparkline. Click to open playbook detail."
      icon={Layers}
    />
  )
}
