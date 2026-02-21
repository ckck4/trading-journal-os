import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { Receipt } from 'lucide-react'

export const metadata = { title: 'Business Ledger' }

export default function LedgerPage() {
  return (
    <PlaceholderPage
      title="Business Ledger"
      description="Expense and revenue entries table, revenue vs expenses chart, ROI card, and monthly P&L statement."
      icon={Receipt}
    />
  )
}
