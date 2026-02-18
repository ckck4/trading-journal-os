import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { CalendarDays } from 'lucide-react'

export const metadata = { title: 'Journal Calendar' }

export default function JournalCalendarPage() {
  return (
    <PlaceholderPage
      title="Journal Calendar"
      description="Monthly heatmap calendar — cells colored by daily P&L or grade. Click any day to filter trades."
      icon={CalendarDays}
    />
  )
}
