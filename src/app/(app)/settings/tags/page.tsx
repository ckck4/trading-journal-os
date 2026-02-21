import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { Tag } from 'lucide-react'

export const metadata = { title: 'Settings — Tags' }

export default function SettingsTagsPage() {
  return (
    <PlaceholderPage
      title="Tags & Labels"
      description="Manage custom tags for annotating trades — name, color, and category."
      icon={Tag}
    />
  )
}
