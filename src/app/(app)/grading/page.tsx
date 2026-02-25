import { GradingClient } from '@/components/grading/grading-client'

export const metadata = {
  title: 'Grading | Trading Journal OS',
  description: 'Your performance scorecards calculated from actual trades',
}

export default function GradingPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <GradingClient />
    </div>
  )
}
