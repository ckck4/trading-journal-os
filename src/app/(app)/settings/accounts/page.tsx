import { PlaceholderPage } from '@/components/ui/placeholder-page'
import { Wallet } from 'lucide-react'

export const metadata = { title: 'Settings — Accounts' }

export default function SettingsAccountsPage() {
  return (
    <PlaceholderPage
      title="Accounts"
      description="Manage your trading accounts — add, edit, and remove broker accounts."
      icon={Wallet}
    />
  )
}
