import { Metadata } from 'next'
import { GoalsClient } from '@/components/goals/goals-client'

export const metadata: Metadata = {
  title: 'Goals & Habits | Trading Journal OS',
  description: 'Set targets, build habits, and track your progress'
}

export default function GoalsPage() {
  return <GoalsClient />
}
