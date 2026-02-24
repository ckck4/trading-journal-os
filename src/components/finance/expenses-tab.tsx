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
import { Pencil, Trash2, Check, Loader2, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type Expense = {
    id: string;
    amount: number;
    category: string;
    vendor: string | null;
    description: string | null;
    date: string;
    tags: string[] | null;
    is_recurring: boolean;
};

export function ExpensesTab() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

    // Form State
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [vendor, setVendor] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [tags, setTags] = useState("");
    const [isRecurring, setIsRecurring] = useState(false);
    const [addToSubscriptions, setAddToSubscriptions] = useState(false);

    const { data: expenses, isLoading } = useQuery({
        queryKey: ["finance", "expenses"],
        queryFn: async () => {
            const res = await fetch("/api/finance/expenses");
            if (!res.ok) throw new Error("Failed to fetch expenses");
            const json = await res.json();
            return json.data as Expense[];
        }
    });

    const { data: settings } = useQuery({
        queryKey: ["finance", "settings"],
        queryFn: async () => {
            const res = await fetch("/api/finance/settings");
            if (!res.ok) return null;
            const json = await res.json();
            return json.data;
        }
    });

    const createMutation = useMutation({
        mutationFn: async (newExpense: any) => {
            const res = await fetch("/api/finance/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newExpense),
            });
            if (!res.ok) throw new Error("Failed to create expense");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["finance"] });
            setIsDialogOpen(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: any }) => {
            const res = await fetch(`/api/finance/expenses/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update expense");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["finance"] });
            setIsDialogOpen(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/finance/expenses/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete expense");
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
            category,
            vendor,
            description,
            date,
            tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
            is_recurring: isRecurring
        };

        if (selectedExpense) {
            updateMutation.mutate({ id: selectedExpense.id, data: payload });
        } else {
            createMutation.mutate(payload, {
                onSuccess: () => {
                    if (isRecurring && addToSubscriptions) {
                        fetch("/api/finance/subscriptions", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                name: vendor || description || "New Subscription",
                                provider: vendor || null,
                                amount: parseFloat(amount),
                                billing_cycle: "monthly",
                                category,
                                is_active: true
                            }),
                        }).then(() => {
                            queryClient.invalidateQueries({ queryKey: ["finance", "subscriptions"] });
                        }).catch(console.error);
                    }
                }
            });
        }
    };

    const handleEdit = (exp: Expense) => {
        setSelectedExpense(exp);
        setAmount(exp.amount.toString());
        setCategory(exp.category);
        setVendor(exp.vendor || "");
        setDescription(exp.description || "");
        setDate(exp.date);
        setTags(exp.tags?.join(", ") || "");
        setIsRecurring(exp.is_recurring);
        setAddToSubscriptions(false);
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setSelectedExpense(null);
        setAmount("");
        setCategory("");
        setVendor("");
        setDescription("");
        setDate(new Date().toISOString().split("T")[0]);
        setTags("");
        setIsRecurring(false);
        setAddToSubscriptions(false);
        setIsDialogOpen(true);
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

    const data = expenses || [];

    const totalExpenses = data.reduce((sum, e) => sum + Number(e.amount), 0);
    const recurringExpenses = data.filter(e => e.is_recurring).reduce((sum, e) => sum + Number(e.amount), 0);
    const largestExpense = data.length > 0 ? Math.max(...data.map(e => Number(e.amount))) : 0;
    const avgExpense = data.length > 0 ? totalExpenses / data.length : 0;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-4">
            {/* KPI Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-[#EF4444]">
                            {formatCurrency(totalExpenses)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Recurring</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-muted-foreground">
                            {formatCurrency(recurringExpenses)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Largest Expense</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-muted-foreground">
                            {formatCurrency(largestExpense)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg Expense</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-muted-foreground">
                            {formatCurrency(avgExpense)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">All Expenses</h3>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleAddNew} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Expense
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{selectedExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
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
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={category} onValueChange={setCategory} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Software">Software</SelectItem>
                                        <SelectItem value="Education">Education</SelectItem>
                                        <SelectItem value="Data & News">Data & News</SelectItem>
                                        <SelectItem value="Hardware">Hardware</SelectItem>
                                        <SelectItem value="Prop Firm Fees">Prop Firm Fees</SelectItem>
                                        <SelectItem value="Marketing">Marketing</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Vendor</Label>
                                <Input
                                    value={vendor}
                                    onChange={e => setVendor(e.target.value)}
                                    list="vendor-presets"
                                />
                                {settings?.vendor_presets?.length > 0 && (
                                    <datalist id="vendor-presets">
                                        {settings.vendor_presets.map((v: string) => <option key={v} value={v} />)}
                                    </datalist>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input value={description} onChange={e => setDescription(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Tags (Comma separated)</Label>
                                <Input
                                    value={tags}
                                    onChange={e => setTags(e.target.value)}
                                    list="tag-presets"
                                />
                                {settings?.custom_tags?.length > 0 && (
                                    <datalist id="tag-presets">
                                        {settings.custom_tags.map((t: string) => <option key={t} value={t} />)}
                                    </datalist>
                                )}
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
                                    <Label htmlFor="recurring">Recurring Expense</Label>
                                </div>
                                {isRecurring && !selectedExpense && (
                                    <div className="flex items-center space-x-2 ml-6">
                                        <Checkbox
                                            id="add-to-sub"
                                            checked={addToSubscriptions}
                                            onCheckedChange={(checked) => setAddToSubscriptions(checked as boolean)}
                                        />
                                        <Label htmlFor="add-to-sub" className="text-muted-foreground font-normal">Also add to subscriptions</Label>
                                    </div>
                                )}
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Expense
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
                            <TableHead>Vendor</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="hidden md:table-cell">Description</TableHead>
                            <TableHead className="hidden md:table-cell">Tags</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-center">Recurring</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground h-32">
                                    No expenses yet. Click &apos;Add Expense&apos; to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map(exp => (
                                <TableRow key={exp.id}>
                                    <TableCell className="whitespace-nowrap">{formatDate(exp.date)}</TableCell>
                                    <TableCell>{exp.vendor || '-'}</TableCell>
                                    <TableCell>{exp.category}</TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">{exp.description}</TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <div className="flex gap-1 flex-wrap">
                                            {exp.tags?.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-[#EF4444]">{formatCurrency(exp.amount)}</TableCell>
                                    <TableCell className="text-center">
                                        {exp.is_recurring && <Check className="h-4 w-4 mx-auto text-[#22C55E]" />}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(exp)}>
                                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                setExpenseToDelete(exp.id);
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
                        <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this expense? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => expenseToDelete && deleteMutation.mutate(expenseToDelete)}
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
