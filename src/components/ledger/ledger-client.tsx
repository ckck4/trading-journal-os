"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus,
    Download,
    Wallet,
    TrendingUp,
    TrendingDown,
    Percent,
    Repeat,
    Briefcase,
    Target,
    Clock,
    Pencil,
    Trash2,
    ChevronRight,
    Loader2,
    Info,
} from "lucide-react";
import {
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Helper for formatting currency
const formatCurrency = (val: number | null | undefined) => {
    if (val == null) return "$0.00";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(val);
};

// Colors for Pie Chart
const COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899", "#14B8A6", "#F43F5E", "#6366F1"];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border border-[#2A2F3E] bg-[#14171E] p-3 text-sm shadow-xl">
                <p className="mb-2 font-medium text-[#E8EAF0]">{payload[0].name}</p>
                <p className="font-mono text-[#EF4444]">
                    ${Number(payload[0].value).toFixed(2)}
                </p>
            </div>
        );
    }
    return null;
};

type EntryType = "income" | "expense" | "payout" | "funding";
type EntrySource = "trade" | "expense" | "payout" | "manual";

export interface LedgerEntry {
    id: string;
    date: string;
    type: EntryType;
    amount: number;
    description: string;
    category: string;
    source: EntrySource;
}

export function LedgerClient() {
    const queryClient = useQueryClient();

    // Dialog States
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    // Form States
    const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
    const [formData, setFormData] = useState({
        type: "income" as EntryType,
        amount: "",
        description: "",
        category: "",
        date: format(new Date(), "yyyy-MM-dd")
    });

    // Fetch Ledger Data
    const { data: ledgerData, isLoading } = useQuery({
        queryKey: ["ledger"],
        queryFn: async () => {
            const res = await fetch("/api/ledger");
            if (!res.ok) throw new Error("Failed to fetch ledger");
            const json = await res.json();
            return json.data;
        }
    });

    // Add Entry Mutation
    const addMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch("/api/ledger", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to add entry");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ledger"] });
            setIsAddOpen(false);
            setFormData({ type: "income", amount: "", description: "", category: "", date: format(new Date(), "yyyy-MM-dd") });
        },
        onError: (err: any) => alert(err.message)
    });

    // Edit Entry Mutation
    const editMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await fetch(`/api/ledger/${payload.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to edit entry");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ledger"] });
            setIsEditOpen(false);
        },
        onError: (err: any) => alert(err.message)
    });

    // Delete Entry Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/ledger/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to delete entry");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ledger"] });
            setIsDeleteOpen(false);
        },
        onError: (err: any) => alert(err.message)
    });

    const entries: LedgerEntry[] = ledgerData?.entries || [];
    const summary = ledgerData?.summary || {};
    const propStats = ledgerData?.propStats || {};

    const expenseBreakdown = useMemo(() => {
        if (!entries) return [];
        const expenses = entries.filter((e: LedgerEntry) => e.type === "expense");
        const map = new Map<string, number>();
        expenses.forEach((e: LedgerEntry) => {
            map.set(e.category || "General", (map.get(e.category || "General") || 0) + e.amount);
        });
        return Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [entries]);

    const recentExpenses = useMemo(() => {
        if (!entries) return [];
        return entries.filter((e: LedgerEntry) => e.type === "expense").slice(0, 10);
    }, [entries]);

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addMutation.mutate({
            ...formData,
            amount: parseFloat(formData.amount)
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEntry) return;
        editMutation.mutate({
            id: selectedEntry.id,
            ...formData,
            amount: parseFloat(formData.amount)
        });
    };

    const handleExport = () => {
        if (!entries.length) return;
        const csvRows = ["Date,Type,Source,Description,Category,Amount"];
        entries.forEach((e: LedgerEntry) => {
            // Escape quotes and wrap in quotes for robust CSV
            const desc = `"${(e.description || "").replace(/"/g, '""')}"`;
            const cat = `"${(e.category || "").replace(/"/g, '""')}"`;
            csvRows.push(`${e.date},${e.type},${e.source},${desc},${cat},${e.amount}`);
        });
        const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ledger-export.csv";
        a.click();
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <div className="grid gap-4 md:grid-cols-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
                <div className="grid gap-4 md:grid-cols-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
                <Skeleton className="h-64" />
                <Skeleton className="h-96" />
            </div>
        );
    }

    const {
        totalRevenue = 0,
        totalExpenses = 0,
        netProfit = 0,
        roi = 0,
        monthlyRecurring = 0,
        totalFunding = 0,
        fundedAccountCount = 0,
        paybackPeriod = null
    } = summary;

    const passRate = propStats.evalsPurchased > 0
        ? ((propStats.passed / propStats.evalsPurchased) * 100).toFixed(1)
        : 0;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Business Ledger</h1>
                    <p className="text-muted-foreground">Track expenses, revenue, and ROI like a CFO</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                    <Button onClick={() => {
                        setFormData({ type: "income", amount: "", description: "", category: "", date: format(new Date(), "yyyy-MM-dd") });
                        setIsAddOpen(true);
                    }}>
                        <Plus className="mr-2 h-4 w-4" /> Add Entry
                    </Button>
                </div>
            </div>

            {/* SECTION 1 - KPIs Row 1 */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-500">{formatCurrency(totalRevenue)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <TrendingDown className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-500">{formatCurrency(totalExpenses)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                        <Wallet className={`h-4 w-4 ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {formatCurrency(netProfit)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">ROI</CardTitle>
                        <Percent className={`h-4 w-4 ${roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {roi.toFixed(2)}%
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* SECTION 2 - KPIs Row 2 */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Recurring</CardTitle>
                        <Repeat className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(monthlyRecurring)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Funding</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalFunding)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Funded Accounts</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{fundedAccountCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="flex items-center gap-1.5">
                            <CardTitle className="text-sm font-medium">Payback Period</CardTitle>
                            <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-[14px] w-[14px] text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="top"
                                        className="max-w-[280px] bg-[#14171E] border-[#2A2F3E] text-[#E8EAF0] text-sm leading-relaxed p-3 shadow-xl"
                                    >
                                        <div className="space-y-2">
                                            <p className="font-semibold">Calculated as: Total Expenses ÷ (Net Profit ÷ 12)</p>
                                            <p>The estimated number of months until your total trading business expenses are fully recovered by your net profit.</p>
                                            <p className="text-muted-foreground/80 mt-1">
                                                {paybackPeriod === null ? "Your business is not yet profitable. Focus on reducing expenses or increasing payout frequency." :
                                                    paybackPeriod <= 6 ? "Excellent — you are recovering costs quickly." :
                                                        paybackPeriod <= 12 ? "Good — on track to break even within a year." :
                                                            paybackPeriod <= 24 ? "Moderate — consider reviewing your expense structure." :
                                                                "High — your expenses may be outpacing your returns."}
                                            </p>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{paybackPeriod !== null ? `${paybackPeriod.toFixed(1)} mo` : 'N/A'}</div>
                    </CardContent>
                </Card>
            </div>

            {/* SECTION 3 - Prop Firm Funnel */}
            <Card>
                <CardHeader>
                    <CardTitle>Prop Firm Funnel</CardTitle>
                    <CardDescription>Track the lifecycle of your funded evaluations</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col space-y-8">
                        {/* Funnel Vis */}
                        <div className="flex flex-col sm:flex-row items-center justify-between rounded-lg border border-border p-6 bg-muted/20">
                            <div className="flex flex-col items-center p-2">
                                <span className="text-muted-foreground text-sm font-medium mb-1">Evals Purchased</span>
                                <span className="text-3xl font-bold">{propStats.evalsPurchased}</span>
                            </div>
                            <ChevronRight className="hidden sm:block h-6 w-6 text-muted-foreground/50 mx-2" />
                            <div className="flex flex-col items-center p-2">
                                <span className="text-muted-foreground text-sm font-medium mb-1">Currently Active</span>
                                <span className="text-3xl font-bold">{propStats.currentlyActive}</span>
                            </div>
                            <ChevronRight className="hidden sm:block h-6 w-6 text-muted-foreground/50 mx-2" />
                            <div className="flex flex-col items-center p-2">
                                <span className="text-muted-foreground text-sm font-medium mb-1">Passed</span>
                                <span className="text-3xl font-bold">{propStats.passed}</span>
                            </div>
                            <ChevronRight className="hidden sm:block h-6 w-6 text-emerald-500/50 mx-2" />
                            <div className="flex flex-col items-center p-2">
                                <span className="text-emerald-500 text-sm font-medium mb-1">Funded</span>
                                <span className="text-3xl font-bold text-emerald-500">{propStats.funded}</span>
                            </div>
                        </div>
                        {/* Funnel Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 divide-y-2 md:divide-y-0 md:divide-x-2 divide-border">
                            <div className="flex flex-col items-center text-center py-2">
                                <span className="text-sm text-muted-foreground">Pass Rate</span>
                                <span className="text-xl font-bold">{passRate}%</span>
                            </div>
                            <div className="flex flex-col items-center text-center py-2">
                                <span className="text-sm text-muted-foreground">Failed Accounts</span>
                                <span className="text-xl font-bold">{propStats.failed}</span>
                            </div>
                            <div className="flex flex-col items-center text-center py-2">
                                <span className="text-sm text-muted-foreground">Total Funding</span>
                                <span className="text-xl font-bold">{formatCurrency(propStats.totalFunding)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* SECTION 4 - Two Columns */}
            <div className="grid gap-4 md:grid-cols-5">
                {/* Left (40%) */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Expense Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {expenseBreakdown.length > 0 ? (
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={expenseBreakdown}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {expenseBreakdown.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                                No expenses yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
                {/* Right (60%) */}
                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentExpenses.length > 0 ? (
                            <div className="rounded-md border border-border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/50 text-left">
                                            <th className="p-3 font-medium h-10">Date</th>
                                            <th className="p-3 font-medium h-10">Description</th>
                                            <th className="p-3 font-medium h-10">Category</th>
                                            <th className="p-3 font-medium text-right h-10">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentExpenses.map((exp: LedgerEntry) => (
                                            <tr key={exp.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                                                <td className="p-3">{format(new Date(exp.date), "MMM d, yyyy")}</td>
                                                <td className="p-3">{exp.description}</td>
                                                <td className="p-3">
                                                    <Badge variant="secondary" className="font-normal">{exp.category}</Badge>
                                                </td>
                                                <td className="p-3 text-right font-mono text-rose-500">
                                                    -{formatCurrency(exp.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                                No recent expenses.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* SECTION 5 - Full Ledger Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Entries</CardTitle>
                    <CardDescription>Comprehensive ledger of all income and expenses</CardDescription>
                </CardHeader>
                <CardContent>
                    {entries.length > 0 ? (
                        <div className="rounded-md border border-border overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/50 text-left">
                                        <th className="p-3 font-medium h-10">Date</th>
                                        <th className="p-3 font-medium h-10">Type</th>
                                        <th className="p-3 font-medium h-10">Source</th>
                                        <th className="p-3 font-medium h-10">Description</th>
                                        <th className="p-3 font-medium h-10">Category</th>
                                        <th className="p-3 font-medium text-right h-10">Amount</th>
                                        <th className="p-3 font-medium text-center h-10 w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((entry: LedgerEntry) => (
                                        <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/30 whitespace-nowrap">
                                            <td className="p-3">{format(new Date(entry.date), "yyyy-MM-dd")}</td>
                                            <td className="p-3">
                                                <Badge
                                                    className={
                                                        entry.type === 'income' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                            entry.type === 'expense' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                                entry.type === 'payout' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                                    'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                                    }
                                                    variant="outline"
                                                >
                                                    {entry.type}
                                                </Badge>
                                            </td>
                                            <td className="p-3">
                                                <Badge
                                                    variant="outline"
                                                    className={entry.source === 'manual' ? "border-yellow-500/50 text-yellow-500" : "text-muted-foreground"}
                                                >
                                                    {entry.source}
                                                </Badge>
                                            </td>
                                            <td className="p-3 truncate max-w-[200px]" title={entry.description}>{entry.description}</td>
                                            <td className="p-3">
                                                {entry.category ? (
                                                    <Badge variant="secondary" className="font-normal">{entry.category}</Badge>
                                                ) : <span className="text-muted-foreground">-</span>}
                                            </td>
                                            <td className={`p-3 text-right font-mono ${['income', 'payout', 'funding'].includes(entry.type) ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {['income', 'payout', 'funding'].includes(entry.type) ? '+' : '-'}{formatCurrency(entry.amount)}
                                            </td>
                                            <td className="p-3 text-center">
                                                {entry.source === "manual" ? (
                                                    <div className="flex justify-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            onClick={() => {
                                                                setSelectedEntry(entry);
                                                                setFormData({
                                                                    type: entry.type,
                                                                    amount: entry.amount.toString(),
                                                                    description: entry.description || "",
                                                                    category: entry.category || "",
                                                                    date: entry.date
                                                                });
                                                                setIsEditOpen(true);
                                                            }}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-rose-500"
                                                            onClick={() => {
                                                                setSelectedEntry(entry);
                                                                setIsDeleteOpen(true);
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                            No ledger entries yet.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ADd Entry Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Manual Entry</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddSubmit} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="type">Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(val) => setFormData({ ...formData, type: val as EntryType })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="income">Income</SelectItem>
                                    <SelectItem value="expense">Expense</SelectItem>
                                    <SelectItem value="payout">Payout</SelectItem>
                                    <SelectItem value="funding">Funding</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount ($)</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                            <Input
                                id="category"
                                required
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={addMutation.isPending}>
                                {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Entry
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Entry Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Manual Entry</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-type">Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(val) => setFormData({ ...formData, type: val as EntryType })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="income">Income</SelectItem>
                                    <SelectItem value="expense">Expense</SelectItem>
                                    <SelectItem value="payout">Payout</SelectItem>
                                    <SelectItem value="funding">Funding</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-date">Date</Label>
                            <Input
                                id="edit-date"
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-amount">Amount ($)</Label>
                            <Input
                                id="edit-amount"
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Input
                                id="edit-description"
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-category">Category</Label>
                            <Input
                                id="edit-category"
                                required
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={editMutation.isPending}>
                                {editMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the manual ledger entry for "{selectedEntry?.description}".
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-rose-500 hover:bg-rose-600"
                            onClick={() => selectedEntry && deleteMutation.mutate(selectedEntry.id)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete Entry"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
