import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { BookMarked } from 'lucide-react'

export const metadata = { title: 'Strategy Detail' }

export default function StrategyDetailPage() {
  return (
    <PlaceholderPage
      title="Strategy Detail"
      description="Playbook editor with confluence checklist on the left, and per-strategy analytics on the right."
      icon={BookMarked}
    />
  )
}
