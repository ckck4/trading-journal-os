import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { PieChart } from 'lucide-react'

export const metadata = { title: 'Analytics Breakdown' }

export default function AnalyticsBreakdownPage() {
  return (
    <PlaceholderPage
      title="Analytics Breakdown"
      description="Drill-down view filtered by a specific dimension — instrument, session, strategy, or time of day."
      icon={PieChart}
    />
  )
}
