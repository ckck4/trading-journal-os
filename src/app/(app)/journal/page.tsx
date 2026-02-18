import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { BookOpen } from 'lucide-react'

export const metadata = { title: 'Trade Journal' }

export default function JournalPage() {
  return (
    <PlaceholderPage
      title="Trade Journal"
      description="Scrollable trade log grouped by day with detail panel, strategy, tags, grades, and notes."
      icon={BookOpen}
    />
  )
}
