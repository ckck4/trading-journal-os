import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { LayoutGrid } from 'lucide-react'

export const metadata = { title: 'Settings — Dashboard' }

export default function SettingsDashboardPage() {
  return (
    <PlaceholderPage
      title="Dashboard Layout"
      description="Customize your Command Center widget layout — choose, reorder, and resize your KPI widgets."
      icon={LayoutGrid}
    />
  )
}
