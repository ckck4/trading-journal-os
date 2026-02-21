import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { ClipboardCheck } from 'lucide-react'

export const metadata = { title: 'Evaluation Detail' }

export default function PropEvalDetailPage() {
  return (
    <PlaceholderPage
      title="Evaluation Detail"
      description="Per-evaluation rule status — profit target, max loss, consistency, position size rules."
      icon={ClipboardCheck}
    />
  )
}
