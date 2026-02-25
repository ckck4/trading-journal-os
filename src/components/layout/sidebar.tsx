'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  BookOpen,
  BarChart2,
  Layers,
  Building2,
  DollarSign,
  BookMarked,
  Award,
  Search,
  Bot,
  Target,
  Upload,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  Zap,
} from 'lucide-react'

export interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  badge?: number | string
}

const mainNavItems: NavItem[] = [
  { label: 'Command Center', icon: LayoutDashboard, href: '/' },
  { label: 'Trade Journal', icon: BookOpen, href: '/journal' },
  { label: 'Analytics Lab', icon: BarChart2, href: '/analytics' },
  { label: 'Prop Firm HQ', icon: Building2, href: '/prop' },
  { label: 'Strategies', icon: BookMarked, href: '/strategies' },
  { label: 'Goals', icon: Target, href: '/goals' },
  { label: 'Finance', icon: DollarSign, href: '/finance' },
  { label: 'Ledger', icon: BookOpen, href: '/ledger' },
  { label: 'Grading', icon: Award, href: '/grading' },
  { label: 'Leak Detector', icon: Search, href: '/leaks' },
  { label: 'AI Coach', icon: Bot, href: '/coach' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r transition-all duration-300',
        'bg-[var(--sidebar)] border-[var(--sidebar-border)]',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* Logo + collapse toggle */}
      <div
        className={cn(
          'flex items-center border-b border-[var(--sidebar-border)] h-[52px] px-3 shrink-0',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!collapsed && (
          <span className="text-sm font-semibold text-[var(--foreground)] truncate">
            Trading Journal OS
          </span>
        )}
        <button
          onClick={onToggle}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)] transition-colors duration-150"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {mainNavItems.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            active={isActive(item.href)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="shrink-0 border-t border-[var(--sidebar-border)] py-2 px-2 space-y-0.5">
        <SidebarItem
          item={{ label: 'Import', icon: Upload, href: '#import' }}
          active={false}
          collapsed={collapsed}
          variant="action"
        />
        <SidebarItem
          item={{ label: 'Settings', icon: Settings, href: '/settings/preferences' }}
          active={isActive('/settings')}
          collapsed={collapsed}
        />
        <SidebarItem
          item={{ label: 'Account', icon: User, href: '/settings/accounts' }}
          active={false}
          collapsed={collapsed}
        />
      </div>
    </aside>
  )
}

interface SidebarItemProps {
  item: NavItem
  active: boolean
  collapsed: boolean
  variant?: 'default' | 'action'
}

function SidebarItem({ item, active, collapsed, variant = 'default' }: SidebarItemProps) {
  const Icon = item.icon

  const content = (
    <span
      className={cn(
        'group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150 cursor-pointer select-none',
        collapsed && 'justify-center px-2',
        active
          ? 'bg-[var(--color-accent-muted)] text-[var(--sidebar-primary)] shadow-[inset_0_0_0_1px_var(--color-accent-muted)]'
          : variant === 'action'
            ? 'text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-primary)]'
            : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]'
      )}
    >
      <Icon
        size={16}
        className={cn(
          'shrink-0 transition-colors duration-150',
          active ? 'text-[var(--sidebar-primary)]' : ''
        )}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge !== undefined && (
        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--sidebar-primary)] px-1 text-[10px] font-semibold text-white">
          {item.badge}
        </span>
      )}
    </span>
  )

  if (item.href === '#import') {
    return <div>{content}</div>
  }

  return (
    <Link href={item.href} className="block">
      {content}
    </Link>
  )
}
