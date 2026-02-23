"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Power, Loader2, Plus } from "lucide-react";

type Subscription = {
    id: string;
    name: string;
    provider: string | null;
    amount: number;
    billing_cycle: "monthly" | "yearly" | "weekly";
    next_billing_date: string | null;
    category: string | null;
    is_active: boolean;
};

export function SubscriptionsTab() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
    const [subscriptionToDelete, setSubscriptionToDelete] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [provider, setProvider] = useState("");
    const [amount, setAmount] = useState("");
    const [billingCycle, setBillingCycle] = useState("monthly");
    const [nextBillingDate, setNextBillingDate] = useState("");
    const [category, setCategory] = useState("");
    const [isActive, setIsActive] = useState(true);

    const { data: subscriptions, isLoading } = useQuery({
        queryKey: ["finance", "subscriptions"],
        queryFn: async () => {
            const res = await fetch("/api/finance/subscriptions");
            if (!res.ok) throw new Error("Failed to fetch subscriptions");
            const json = await res.json();
            return json.data as Subscription[];
        }
    });

    const createMutation = useMutation({
        mutationFn: async (newSub: any) => {
            const res = await fetch("/api/finance/subscriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newSub),
            });
            if (!res.ok) throw new Error("Failed to create subscription");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["finance"] });
            setIsDialogOpen(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: any }) => {
            const res = await fetch(`/api/finance/subscriptions/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update subscription");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["finance"] });
            setIsDialogOpen(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/finance/subscriptions/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete subscription");
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
            name,
            provider,
            amount: parseFloat(amount),
            billing_cycle: billingCycle,
            next_billing_date: nextBillingDate || null,
            category,
            is_active: isActive
        };

        if (selectedSubscription) {
            updateMutation.mutate({ id: selectedSubscription.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleEdit = (sub: Subscription) => {
        setSelectedSubscription(sub);
        setName(sub.name);
        setProvider(sub.provider || "");
        setAmount(sub.amount.toString());
        setBillingCycle(sub.billing_cycle);
        setNextBillingDate(sub.next_billing_date || "");
        setCategory(sub.category || "");
        setIsActive(sub.is_active);
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setSelectedSubscription(null);
        setName("");
        setProvider("");
        setAmount("");
        setBillingCycle("monthly");
        setNextBillingDate("");
        setCategory("");
        setIsActive(true);
        setIsDialogOpen(true);
    };

    const handleToggleActive = (sub: Subscription) => {
        updateMutation.mutate({ id: sub.id, data: { is_active: !sub.is_active } });
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                </div>
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    const data = subscriptions || [];

    const getMonthlyCost = (amount: number, cycle: string) => {
        if (cycle === 'yearly') return amount / 12;
        if (cycle === 'weekly') return amount * 4.33;
        return amount; // monthly
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const activeSubs = data.filter(s => s.is_active);
    const activeSubsCount = activeSubs.length;
    const monthlyCost = activeSubs.reduce((sum, s) => sum + getMonthlyCost(Number(s.amount), s.billing_cycle), 0);
    const yearlyCost = monthlyCost * 12;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const dueThisMonth = activeSubs.filter(s => {
        if (!s.next_billing_date) return false;
        const d = new Date(s.next_billing_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-4">
            {/* KPI Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">
                            {activeSubsCount}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-[#EF4444]">
                            {formatCurrency(monthlyCost)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Yearly Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-[#EF4444]">
                            {formatCurrency(yearlyCost)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Due This Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-[#F59E0B]">
                            {dueThisMonth}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">All Subscriptions</h3>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleAddNew} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Subscription
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{selectedSubscription ? 'Edit Subscription' : 'Add Subscription'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input required value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Provider</Label>
                                    <Input value={provider} onChange={e => setProvider(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Input value={category} onChange={e => setCategory(e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Amount</Label>
                                    <Input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Billing Cycle</Label>
                                    <Select value={billingCycle} onValueChange={setBillingCycle} required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Cycle" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="yearly">Yearly</SelectItem>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 items-center">
                                <div className="space-y-2">
                                    <Label>Next Billing Date</Label>
                                    <Input type="date" value={nextBillingDate} onChange={e => setNextBillingDate(e.target.value)} />
                                </div>
                                <div className="flex items-center space-x-2 pt-6">
                                    <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
                                    <Label htmlFor="is-active">Active</Label>
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Subscription
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead className="hidden md:table-cell">Category</TableHead>
                            <TableHead className="hidden md:table-cell">Billing Cycle</TableHead>
                            <TableHead className="text-right">Monthly Cost</TableHead>
                            <TableHead>Next Billing</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground h-32">
                                    No subscriptions tracked yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map(sub => (
                                <TableRow key={sub.id} className={!sub.is_active ? "opacity-60" : ""}>
                                    <TableCell className="font-medium">{sub.name}</TableCell>
                                    <TableCell>{sub.provider || '-'}</TableCell>
                                    <TableCell className="hidden md:table-cell">{sub.category || '-'}</TableCell>
                                    <TableCell className="hidden md:table-cell capitalize">{sub.billing_cycle}</TableCell>
                                    <TableCell className="text-right font-mono text-[#EF4444]">
                                        {formatCurrency(getMonthlyCost(Number(sub.amount), sub.billing_cycle))}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">{formatDate(sub.next_billing_date)}</TableCell>
                                    <TableCell>
                                        <Badge variant={sub.is_active ? "default" : "secondary"} className={sub.is_active ? "bg-[#22C55E]" : ""}>
                                            {sub.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleToggleActive(sub)}>
                                                <Power className={`h-4 w-4 ${sub.is_active ? 'text-muted-foreground' : 'text-[#22C55E]'}`} />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(sub)}>
                                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                setSubscriptionToDelete(sub.id);
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
                        <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this subscription? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => subscriptionToDelete && deleteMutation.mutate(subscriptionToDelete)}
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
