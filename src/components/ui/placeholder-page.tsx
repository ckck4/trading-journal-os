import { type LucideIcon } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description: string
  icon: LucideIcon
}

export function PlaceholderPage({ title, description, icon: Icon }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--muted)] border border-[var(--border)]">
        <Icon size={28} className="text-[var(--muted-foreground)]" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">{title}</h1>
        <p className="text-sm text-[var(--muted-foreground)] max-w-xs">{description}</p>
      </div>
      <span className="rounded-full border border-[var(--color-accent-muted)] bg-[var(--color-accent-muted)] px-3 py-1 text-xs font-medium text-[var(--color-accent-primary)]">
        Coming Soon
      </span>
    </div>
  )
}
