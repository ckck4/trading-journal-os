import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { Target } from 'lucide-react'

export const metadata = { title: 'Goals' }

export default function GoalsPage() {
  return (
    <PlaceholderPage
      title="Goals"
      description="Active goal cards with progress bars, streak counters, and target vs actual. Add new goals via modal."
      icon={Target}
    />
  )
}
