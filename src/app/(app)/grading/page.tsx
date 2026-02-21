import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { Award } from 'lucide-react'

export const metadata = { title: 'Grading Overview' }

export default function GradingPage() {
  return (
    <PlaceholderPage
      title="Grading Overview"
      description="Daily, weekly, and monthly average grade roll-ups, distribution chart, and grade trend over time."
      icon={Award}
    />
  )
}
