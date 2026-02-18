import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { Building2 } from 'lucide-react'

export const metadata = { title: 'Prop Firm HQ' }

export default function PropPage() {
  return (
    <PlaceholderPage
      title="Prop Firm HQ"
      description="Evaluation funnel pipeline, rule status gauges, payout tracker, and trading window status."
      icon={Building2}
    />
  )
}
