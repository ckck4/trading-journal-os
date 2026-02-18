import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { Clock } from 'lucide-react'

export const metadata = { title: 'Settings — Sessions' }

export default function SettingsSessionsPage() {
  return (
    <PlaceholderPage
      title="Sessions & Rollover"
      description="Define named trading sessions with start/end times and rollover hour settings."
      icon={Clock}
    />
  )
}
