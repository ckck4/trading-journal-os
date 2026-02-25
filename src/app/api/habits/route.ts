import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { subDays, isSameDay, parseISO } from 'date-fns'

const CreateHabitSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    category: z.string().optional(),
    is_active: z.boolean().optional()
})

function getHabitStats(completions: { completed_date: string }[], frequency: string) {
    const sortedDates = completions
        .map(c => parseISO(c.completed_date))
        .sort((a, b) => b.getTime() - a.getTime()) // newest first

    const today = new Date()
    let currentStreak = 0
    let bestStreak = completions.length > 0 ? 1 : 0

    if (sortedDates.length === 0) {
        return { completedToday: false, currentStreak: 0, bestStreak: 0, weeklyRate: 0 }
    }

    const completedToday = sortedDates.some(d => isSameDay(d, today))

    let checkDate = completedToday ? today : subDays(today, 1)
    for (const match of sortedDates) {
        if (isSameDay(match, checkDate)) {
            currentStreak++
            checkDate = subDays(checkDate, 1)
        } else if (match < checkDate) {
            break
        }
    }

    let maxStreak = 0
    let tempStreak = 0
    let previousDate: Date | null = null

    const ascendingDates = [...sortedDates].reverse()
    for (const date of ascendingDates) {
        if (!previousDate) {
            tempStreak = 1
        } else {
            const diffTime = Math.abs(date.getTime() - previousDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                tempStreak++
            } else {
                tempStreak = 1
            }
        }
        if (tempStreak > maxStreak) {
            maxStreak = tempStreak
        }
        previousDate = date
    }
    bestStreak = maxStreak

    const oneWeekAgo = subDays(today, 7)
    const last7DaysCompletions = sortedDates.filter(d => d >= oneWeekAgo).length
    const weeklyRate = (last7DaysCompletions / 7) * 100

    return {
        completedToday,
        currentStreak,
        bestStreak,
        weeklyRate: Number(weeklyRate.toFixed(1))
    }
}

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminClient = createAdminClient()
        const { data: userHabits, error: habitsErr } = await adminClient
            .from('habits')
            .select('*')
            .eq('user_id', user.id)
            .order('name', { ascending: true })

        if (habitsErr) throw habitsErr

        const { data: allCompletions, error: compErr } = await adminClient
            .from('habit_completions')
            .select('*')
            .eq('user_id', user.id)

        if (compErr) throw compErr

        const data = userHabits?.map(h => {
            const compsForHabit = allCompletions?.filter(c => c.habit_id === h.id) || []
            const stats = getHabitStats(compsForHabit, h.frequency)

            return {
                ...h,
                ...stats
            }
        }) || []

        return NextResponse.json({ data })
    } catch (error: any) {
        console.error('Failed to fetch habits:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const mappedBody = {
            name: body.name,
            description: body.description,
            frequency: body.frequency,
            category: body.category,
            is_active: body.isActive ?? body.is_active
        }

        const parsed = CreateHabitSchema.safeParse(mappedBody)

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 })
        }

        const {
            name, description, frequency, category, is_active
        } = parsed.data

        const adminClient = createAdminClient()
        const { data: newHabit, error } = await adminClient
            .from('habits')
            .insert({
                user_id: user.id,
                name,
                description,
                frequency: frequency ?? 'daily',
                category: category ?? 'preparation',
                is_active: is_active ?? true
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ data: newHabit })
    } catch (error: any) {
        console.error('Failed to create habit:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
