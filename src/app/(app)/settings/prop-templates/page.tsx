import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { Building2 } from 'lucide-react'

export const metadata = { title: 'Settings — Prop Templates' }

export default function SettingsPropTemplatesPage() {
  return (
    <PlaceholderPage
      title="Prop Firm Templates"
      description="Configure prop firm rule templates — profit targets, max loss, consistency rules, and payout thresholds."
      icon={Building2}
    />
  )
}
