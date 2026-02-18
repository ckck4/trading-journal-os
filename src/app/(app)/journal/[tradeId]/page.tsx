import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { FileText } from 'lucide-react'

export const metadata = { title: 'Trade Detail' }

export default function TradeDetailPage() {
  return (
    <PlaceholderPage
      title="Trade Detail"
      description="Full trade view — fills table, P&L, R-multiple, strategy, tags, grade rubric, notes, and screenshots."
      icon={FileText}
    />
  )
}
