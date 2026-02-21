import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { SlidersHorizontal } from 'lucide-react'

export const metadata = { title: 'Settings — Preferences' }

export default function SettingsPreferencesPage() {
  return (
    <PlaceholderPage
      title="Preferences"
      description="Timezone, base currency, number format, display density, and other personal preferences."
      icon={SlidersHorizontal}
    />
  )
}
