import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { CheckSquare } from 'lucide-react'

export const metadata = { title: 'Settings — Routines' }

export default function SettingsRoutinesPage() {
  return (
    <PlaceholderPage
      title="Routines"
      description="Build pre-market and post-market checklists for consistent trading discipline."
      icon={CheckSquare}
    />
  )
}
