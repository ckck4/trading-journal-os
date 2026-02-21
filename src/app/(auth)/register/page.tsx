'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-[400px] text-center">
        <div className="rounded-xl border border-[var(--color-green)] bg-[var(--color-green-muted)] p-6">
          <h2 className="text-lg font-semibold text-[var(--color-green)]">Check your email</h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            We sent a confirmation link to <strong className="text-[var(--foreground)]">{email}</strong>.
            Click it to activate your account.
          </p>
        </div>
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          <Link href="/login" className="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)] transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[400px]">
      {/* Logo / Title */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Create Account</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Start your trading journal</p>
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
              autoComplete="new-password"
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

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
      </div>

      {/* Login link */}
      <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
        Already have an account?{' '}
        <Link href="/login" className="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)] transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
