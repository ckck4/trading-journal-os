import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { Database } from 'lucide-react'

export const metadata = { title: 'Settings — Data' }

export default function SettingsDataPage() {
  return (
    <PlaceholderPage
      title="Data Management"
      description="Export your data, view import history, and manage danger zone operations."
      icon={Database}
    />
  )
}
