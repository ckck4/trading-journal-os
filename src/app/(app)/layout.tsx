import { AppShell } from '@/components/layout/app-shell'
import { GlobalToolbar } from '@/components/layout/global-toolbar'
import { ImportModal } from '@/components/import/import-modal'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell toolbar={<GlobalToolbar />}>
      {children}
      <ImportModal />
    </AppShell>
  )
}
