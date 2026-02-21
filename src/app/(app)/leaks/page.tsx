import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { SearchX } from 'lucide-react'

export const metadata = { title: 'Leak Detector' }

export default function LeaksPage() {
  return (
    <PlaceholderPage
      title="Leak Detector"
      description="Signal cards exposing loss patterns — instrument, time-of-day, session, and strategy leaks with severity badges."
      icon={SearchX}
    />
  )
}
