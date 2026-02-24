"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function CashFlowTab() {
    const { data: result, isLoading } = useQuery({
        queryKey: ["finance", "cashflow"],
        queryFn: async () => {
            const res = await fetch("/api/finance/cashflow");
            if (!res.ok) throw new Error("Failed to fetch cashflow data");
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
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-[400px] w-full rounded-xl" />
                    <Skeleton className="h-[400px] w-full rounded-xl" />
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

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{
                background: '#14171E',
                border: '1px solid #2A2F3E',
                borderRadius: '6px',
                padding: '8px 12px'
            }}>
                <p style={{ color: '#E8EAF0', marginBottom: 4 }}>{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={`item-${index}`} style={{ color: entry.color, fontFamily: 'JetBrains Mono' }}>
                        {entry.name}: {formatCurrency(entry.value)}
                    </p>
                ))}
            </div>
        );
    };

    const tableData = data.monthlyFlow.map((mf: any, i: number) => ({
        ...mf,
        runningTotal: data.cumulativePosition[i]?.cumulative || 0
    }));

    // The requirements say 12 months for charts
    // Inflows vs Outflows (grouped BarChart)
    // Cumulative Cash Position (AreaChart)

    const isDataEmpty = data.totalInflows12mo === 0 && data.totalOutflows12mo === 0;

    return (
        <div className="space-y-4">
            {/* KPI Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Inflows 12mo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">
                            {formatCurrency(data.totalInflows12mo)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Outflows 12mo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">
                            {formatCurrency(data.totalOutflows12mo)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg Monthly Burn</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">
                            {formatCurrency(data.avgMonthlyBurn)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Net Cash Position</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold font-mono ${data.netCashPosition >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                            {formatCurrency(data.netCashPosition)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Inflows vs Outflows</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {isDataEmpty ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                No cash flow data yet
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.monthlyFlow}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2F3E" />
                                    <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none' }} />
                                    <Bar dataKey="inflows" name="Inflows" fill="#22C55E" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="outflows" name="Outflows" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Cumulative Cash Position</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {isDataEmpty ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                No cash flow data yet
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.cumulativePosition}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2F3E" />
                                    <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none' }} />
                                    <Area type="monotone" dataKey="cumulative" name="Cumulative" stroke="#3B82F6" fillOpacity={0.2} fill="#3B82F6" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Cash Flow Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    {isDataEmpty ? (
                        <div className="text-center py-6 text-muted-foreground">
                            No cash flow data yet. Add expenses and payouts to get started.
                        </div>
                    ) : (
                        <div className="rounded-md border border-border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Month</TableHead>
                                        <TableHead className="text-right">Inflows</TableHead>
                                        <TableHead className="text-right">Outflows</TableHead>
                                        <TableHead className="text-right">Net</TableHead>
                                        <TableHead className="text-right">Running Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tableData.reverse().map((row: any, i: number) => (
                                        <TableRow key={i}>
                                            <TableCell>{row.month}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {formatCurrency(row.inflows)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {formatCurrency(row.outflows)}
                                            </TableCell>
                                            <TableCell className={`text-right font-mono ${row.net > 0 ? 'text-[#22C55E]' : row.net < 0 ? 'text-[#EF4444]' : ''}`}>
                                                {formatCurrency(row.net)}
                                            </TableCell>
                                            <TableCell className={`text-right font-mono ${row.runningTotal > 0 ? 'text-[#22C55E]' : row.runningTotal < 0 ? 'text-[#EF4444]' : ''}`}>
                                                {formatCurrency(row.runningTotal)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
