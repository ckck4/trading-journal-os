import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { TrendingUp } from 'lucide-react'

export const metadata = { title: 'Settings — Instruments' }

export default function SettingsInstrumentsPage() {
  return (
    <PlaceholderPage
      title="Instruments"
      description="Manage tradeable instruments — tick size, point value, currency, and display names."
      icon={TrendingUp}
    />
  )
}
