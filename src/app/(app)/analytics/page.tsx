import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { BarChart2 } from 'lucide-react'

export const metadata = { title: 'Analytics Lab' }

export default function AnalyticsPage() {
  return (
    <PlaceholderPage
      title="Analytics Lab"
      description="KPI row, equity curve, breakdown charts by dimension, heatmap, and distribution histogram."
      icon={BarChart2}
    />
  )
}
