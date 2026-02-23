"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Loader2, Plus } from "lucide-react";

type Payout = {
    id: string;
    account_id: string | null;
    account_name: string | null;
    amount: number;
    date: string;
    status: "pending" | "received" | "rejected";
    notes: string | null;
};

type Account = {
    id: string;
    name: string;
};

export function PayoutsTab() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
    const [payoutToDelete, setPayoutToDelete] = useState<string | null>(null);

    // Form State
    const [amount, setAmount] = useState("");
    const [accountId, setAccountId] = useState("none");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [status, setStatus] = useState("pending");
    const [notes, setNotes] = useState("");

    const { data: payouts, isLoading } = useQuery({
        queryKey: ["finance", "payouts"],
        queryFn: async () => {
            const res = await fetch("/api/finance/payouts");
            if (!res.ok) throw new Error("Failed to fetch payouts");
            const json = await res.json();
            return json.data as Payout[];
        }
    });

    const { data: accounts } = useQuery({
        queryKey: ["accounts"],
        queryFn: async () => {
            const res = await fetch("/api/accounts");
            if (!res.ok) return [];
            const json = await res.json();
            return (json.data || []) as Account[];
        }
    });

    const createMutation = useMutation({
        mutationFn: async (newPayout: any) => {
            const res = await fetch("/api/finance/payouts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newPayout),
            });
            if (!res.ok) throw new Error("Failed to create payout");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["finance"] });
            setIsDialogOpen(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: any }) => {
            const res = await fetch(`/api/finance/payouts/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update payout");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["finance"] });
            setIsDialogOpen(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/finance/payouts/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete payout");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["finance"] });
            setIsDeleteDialogOpen(false);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            amount: parseFloat(amount),
            account_id: accountId === "none" ? null : accountId,
            date,
            status,
            notes: notes || null
        };

        if (selectedPayout) {
            updateMutation.mutate({ id: selectedPayout.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleEdit = (pay: Payout) => {
        setSelectedPayout(pay);
        setAmount(pay.amount.toString());
        setAccountId(pay.account_id || "none");
        setDate(pay.date);
        setStatus(pay.status);
        setNotes(pay.notes || "");
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setSelectedPayout(null);
        setAmount("");
        setAccountId("none");
        setDate(new Date().toISOString().split("T")[0]);
        setStatus("pending");
        setNotes("");
        setIsDialogOpen(true);
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                </div>
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    const data = payouts || [];

    const totalReceived = data.filter(p => p.status === 'received').reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPending = data.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0);
    const payoutCount = data.length;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'received': return 'bg-[#22C55E]';
            case 'pending': return 'bg-[#F59E0B]';
            case 'rejected': return 'bg-[#EF4444]';
            default: return 'bg-gray-500';
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-4">
            {/* KPI Row */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Received</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-[#22C55E]">
                            {formatCurrency(totalReceived)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-[#F59E0B]">
                            {formatCurrency(totalPending)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Payout Count</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-muted-foreground">
                            {payoutCount} <span className="text-sm font-normal">all time</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">All Payouts</h3>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleAddNew} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Payout
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{selectedPayout ? 'Edit Payout' : 'Add Payout'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Amount</Label>
                                    <Input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input type="date" required value={date} onChange={e => setDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Account</Label>
                                    <Select value={accountId} onValueChange={setAccountId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- None --</SelectItem>
                                            {accounts?.map((acc: Account) => (
                                                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={status} onValueChange={setStatus} required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="received">Received</SelectItem>
                                            <SelectItem value="rejected">Rejected</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." className="resize-none" />
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Payout
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Account</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="hidden md:table-cell">Notes</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground h-32">
                                    No payouts recorded yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map(pay => (
                                <TableRow key={pay.id}>
                                    <TableCell className="whitespace-nowrap">{formatDate(pay.date)}</TableCell>
                                    <TableCell className="font-medium">{pay.account_name || 'N/A'}</TableCell>
                                    <TableCell className="text-right font-mono text-[#22C55E]">+{formatCurrency(pay.amount)}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={`capitalize ${getStatusColor(pay.status)} text-white hover:${getStatusColor(pay.status)}`}>
                                            {pay.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">{pay.notes || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(pay)}>
                                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                setPayoutToDelete(pay.id);
                                                setIsDeleteDialogOpen(true);
                                            }}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Payout</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this payout record? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => payoutToDelete && deleteMutation.mutate(payoutToDelete)}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
