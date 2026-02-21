import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { Bot } from 'lucide-react'

export const metadata = { title: 'AI Coach' }

export default function CoachPage() {
  return (
    <PlaceholderPage
      title="AI Coach"
      description="Daily AI-generated insights, action plans, pre-market briefs, and scrollable insight history."
      icon={Bot}
    />
  )
}
