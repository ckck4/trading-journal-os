import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { PlusCircle } from 'lucide-react'

export const metadata = { title: 'New Ledger Entry' }

export default function LedgerNewPage() {
  return (
    <PlaceholderPage
      title="New Ledger Entry"
      description="Add an expense or revenue entry — date, category, amount, description, and recurring toggle."
      icon={PlusCircle}
    />
  )
}
