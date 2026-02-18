import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { LayoutDashboard } from 'lucide-react'

export const metadata = { title: 'Command Center' }

export default function CommandCenterPage() {
  return (
    <PlaceholderPage
      title="Command Center"
      description="Your daily trading cockpit with configurable KPI widgets, equity curve, and AI insights."
      icon={LayoutDashboard}
    />
  )
}
