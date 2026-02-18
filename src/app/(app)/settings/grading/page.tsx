import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { Award } from 'lucide-react'

export const metadata = { title: 'Settings — Grading Rubrics' }

export default function SettingsGradingPage() {
  return (
    <PlaceholderPage
      title="Grading Rubrics"
      description="Configure trade grading rubrics — criteria, weights, and scoring scale."
      icon={Award}
    />
  )
}
