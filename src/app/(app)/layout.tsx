import { AppShell } from '@/components/layout/app-shell'
import { GlobalToolbar } from '@/components/layout/global-toolbar'
import { ImportModalRoot } from '@/components/import/import-modal-root'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell toolbar={<GlobalToolbar />}>
      {children}
      <ImportModalRoot />
    </AppShell>
  )
}
