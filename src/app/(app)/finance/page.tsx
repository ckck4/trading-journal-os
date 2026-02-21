import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { DollarSign } from 'lucide-react'

export const metadata = { title: 'Finance Manager' }

export default function FinancePage() {
  return (
    <PlaceholderPage
      title="Finance Manager"
      description="CFO dashboard — gross P&L, net P&L, commissions, fees, payouts, and per-account equity curves."
      icon={DollarSign}
    />
  )
}
