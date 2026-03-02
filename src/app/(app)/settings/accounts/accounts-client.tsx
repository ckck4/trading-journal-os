'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Loader2, Wallet } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { AccountOption } from '@/app/api/accounts/route'

export function AccountsClient() {
    const queryClient = useQueryClient()
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const { data, isLoading } = useQuery<{ accounts: AccountOption[] }>({
        queryKey: ['accounts'],
        queryFn: async () => {
            const res = await fetch('/api/accounts')
            if (!res.ok) throw new Error('Failed to fetch accounts')
            return res.json()
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete account')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] })
            setDeletingId(null)
        },
        onError: (err) => {
            console.error(err)
            alert('Failed to delete account')
            setDeletingId(null)
        }
    })

    // get the active item
    const accountToDelete = data?.accounts.find(a => a.id === deletingId)

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-[var(--foreground)]">Accounts</h1>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    Manage your connected trading accounts.
                </p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
                </div>
            ) : data?.accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)]">
                    <Wallet className="h-8 w-8 text-[var(--muted-foreground)] mb-4" />
                    <p className="text-sm text-[var(--muted-foreground)]">No accounts found.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {data?.accounts.map((account) => (
                        <div
                            key={account.id}
                            className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]"
                        >
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-[var(--foreground)]">
                                        {account.externalId || account.name}
                                    </span>
                                    {account.externalId && account.name && (
                                        <span className="text-xs text-[var(--muted-foreground)] px-2 py-0.5 rounded-full bg-[var(--accent)] border border-[var(--border)]">
                                            {account.name}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-[var(--muted-foreground)]">
                                    {account.tradeCount} trade{account.tradeCount !== 1 && 's'} &middot; {account.broker}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingId(account.id)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent className="border-[#2A2F3E] bg-[#14171E] text-[#E8EAF0]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Account</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#8B92A8]">
                            This will permanently delete <strong className="text-white">{accountToDelete?.externalId || accountToDelete?.name}</strong> and ALL associated data including trades, fills, import batches, and daily summaries. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-[#2A2F3E] bg-transparent hover:bg-white/5 text-white">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-[#EF4444] text-white hover:bg-[#EF4444]/90"
                            onClick={(e) => {
                                e.preventDefault()
                                if (deletingId) deleteMutation.mutate(deletingId)
                            }}
                        >
                            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Account'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
