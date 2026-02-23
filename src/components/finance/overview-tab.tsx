"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export function OverviewTab() {
    const { data: result, isLoading } = useQuery({
        queryKey: ["finance", "overview"],
        queryFn: async () => {
            const res = await fetch("/api/finance/overview");
            if (!res.ok) throw new Error("Failed to fetch overview data");
            const json = await res.json();
            return json.data;
        }
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                </div>
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    if (!result) return null;

    const data = result;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const formatPct = (val: number) => {
        return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#14171E] border border-[#2A2F3E] rounded-md p-3 shadow-md">
                    <p className="text-sm font-medium mb-1">{label}</p>
                    {payload.map((pl: any, i: number) => (
                        <p key={i} className="text-sm font-mono" style={{ color: pl.color }}>
                            {pl.name}: {formatCurrency(pl.value)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const COLORS = ['#3B82F6', '#22C55E', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

    const renderInsights = () => {
        const insights = [];
        if (data.expenseByCategory && data.expenseByCategory.length > 0) {
            insights.push(`Your largest expense category is ${data.expenseByCategory[0].category} at ${formatCurrency(data.expenseByCategory[0].amount)}/mo.`);
        }
        insights.push(`YTD ROI is ${formatPct(data.ytdROI)}.`);
        if (data.activeSubscriptionsMonthly > 0) {
            insights.push(`You have ${formatCurrency(data.activeSubscriptionsMonthly)}/mo in active subscriptions.`);
        }

        const change = data.thisMonthNet - data.lastMonthNet;
        const dir = change >= 0 ? 'up' : 'down';
        insights.push(`This month you are ${dir} ${formatCurrency(Math.abs(change))} vs last month.`);

        if (data.ytdSpend === 0 && data.ytdEarned === 0) {
            return <p className="text-muted-foreground text-sm">Add expenses and payouts to see insights.</p>;
        }

        return (
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                {insights.map((ins, i) => <li key={i}>{ins}</li>)}
            </ul>
        );
    };

    return (
        <div className="space-y-4">
            {/* KPI Row 1 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">This Month Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">
                            {formatCurrency(data.thisMonthExpenses)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">This Month Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">
                            {formatCurrency(data.thisMonthRevenue)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">This Month Net</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold font-mono ${data.thisMonthNet >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                            {formatCurrency(data.thisMonthNet)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">YTD ROI</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold font-mono ${data.ytdROI >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                            {formatPct(data.ytdROI)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* KPI Row 2 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Last Month Net</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">
                            {formatCurrency(data.lastMonthNet)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg Monthly Expense</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">
                            {formatCurrency(data.avgMonthlyExpense)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions/mo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">
                            {formatCurrency(data.activeSubscriptionsMonthly)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">YTD Spend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">
                            {formatCurrency(data.ytdSpend)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Expenses</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {data.monthlyExpenseTrend?.length > 0 && data.monthlyExpenseTrend.some((d: any) => d.amount > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.monthlyExpenseTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2F3E" />
                                    <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="amount" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No expenses data</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {data.monthlyRevenueTrend?.length > 0 && data.monthlyRevenueTrend.some((d: any) => d.amount > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.monthlyRevenueTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2F3E" />
                                    <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="amount" name="Revenue" fill="#22C55E" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No revenue data</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit Over Time</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {data.netProfitOverTime?.length > 0 && data.netProfitOverTime.some((d: any) => d.amount !== 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.netProfitOverTime}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2F3E" />
                                    <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="amount" name="Net Profit" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4, fill: '#3B82F6' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No profit data</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Expense by Category</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {data.expenseByCategory?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.expenseByCategory}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="amount"
                                        nameKey="category"
                                    >
                                        {data.expenseByCategory.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No category data</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Insights Row */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Financial Insights</CardTitle>
                </CardHeader>
                <CardContent>
                    {renderInsights()}
                </CardContent>
            </Card>
        </div>
    );
}
