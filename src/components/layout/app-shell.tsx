'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'

interface AppShellProps {
  children: React.ReactNode
  toolbar?: React.ReactNode
}

export function AppShell({ children, toolbar }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar slot — provided by (app)/layout.tsx */}
        {toolbar}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
