'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      {/* Logo / Title */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Trading Journal OS</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Sign in to your account</p>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-md)]">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error */}
          {error && (
            <div className="rounded-md border border-[var(--color-red)] bg-[var(--color-red-muted)] px-3 py-2 text-sm text-[var(--color-red)]">
              {error}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                'w-full rounded-md border border-[var(--border)] bg-[var(--background)]',
                'px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]',
                'focus:border-[var(--color-accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]',
                'transition-colors duration-150'
              )}
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                'w-full rounded-md border border-[var(--border)] bg-[var(--background)]',
                'px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]',
                'focus:border-[var(--color-accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]',
                'transition-colors duration-150'
              )}
              placeholder="••••••••"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full rounded-md px-4 py-2 text-sm font-medium',
              'bg-[var(--primary)] text-[var(--primary-foreground)]',
              'hover:bg-[var(--color-accent-hover)] transition-colors duration-150',
              'disabled:cursor-not-allowed disabled:opacity-60'
            )}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>

      {/* Register link */}
      <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)] transition-colors">
          Create one
        </Link>
      </p>
    </div>
  )
}
