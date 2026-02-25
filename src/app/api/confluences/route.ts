import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const CreateConfluenceSchema = z.object({
    strategy_id: z.string().uuid(),
    name: z.string().min(1),
    weight: z.number().optional().default(1.0),
    category: z.enum(['Risk Management', 'Execution', 'Discipline', 'Strategy', 'Efficiency', 'Custom']).optional().default('Execution'),
})

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const strategy_id = searchParams.get('strategy_id')

        let query = supabase
            .from('confluences')
            .select('*')
            .eq('user_id', user.id)
            .order('category')
            .order('name')

        if (strategy_id) {
            query = query.eq('strategy_id', strategy_id)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ data })
    } catch (error: any) {
        console.error('Failed to fetch confluences:', error)
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
        const parsed = CreateConfluenceSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 })
        }

        const { strategy_id, name, weight, category } = parsed.data

        const adminClient = createAdminClient()
        const { data: newConfluence, error } = await adminClient
            .from('confluences')
            .insert({
                user_id: user.id,
                strategy_id,
                name,
                weight,
                category
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ data: newConfluence })
    } catch (error: any) {
        console.error('Failed to create confluence:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
