"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Calendar, CreditCard, TrendingUp, Loader2 } from "lucide-react";

export function ReportsTab() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    const [monthlyMonth, setMonthlyMonth] = useState(currentMonth.toString());
    const [monthlyYear, setMonthlyYear] = useState(currentYear.toString());
    const [yearlyYear, setYearlyYear] = useState(currentYear.toString());

    const [isGenerating, setIsGenerating] = useState<string | null>(null);

    const yearOptions = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
    const monthOptions = [
        { value: "1", label: "January" }, { value: "2", label: "February" },
        { value: "3", label: "March" }, { value: "4", label: "April" },
        { value: "5", label: "May" }, { value: "6", label: "June" },
        { value: "7", label: "July" }, { value: "8", label: "August" },
        { value: "9", label: "September" }, { value: "10", label: "October" },
        { value: "11", label: "November" }, { value: "12", label: "December" }
    ];

    const generateHtml = (title: string, bodyContent: string) => {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        color: #000;
                        background: #fff;
                        padding: 40px;
                        line-height: 1.6;
                    }
                    h1 { margin-bottom: 5px; }
                    .date-generated { color: #666; margin-bottom: 30px; font-size: 0.9em; }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 30px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 12px;
                        text-align: left;
                    }
                    th {
                        background-color: #f8f9fa;
                        font-weight: 600;
                    }
                    .kpi-row {
                        display: flex;
                        gap: 20px;
                        margin-bottom: 30px;
                    }
                    .kpi-box {
                        border: 1px solid #ddd;
                        padding: 20px;
                        flex: 1;
                        border-radius: 6px;
                    }
                    .kpi-title {
                        font-size: 0.9em;
                        color: #666;
                        text-transform: uppercase;
                        margin-bottom: 5px;
                    }
                    .kpi-value {
                        font-size: 1.5em;
                        font-weight: bold;
                    }
                    .text-right { text-align: right; }
                    .text-green { color: #16a34a; }
                    .text-red { color: #dc2626; }
                    .font-mono { font-family: monospace; }
                </style>
            </head>
            <body>
                <div class="print-report">
                    <h1>${title}</h1>
                    <div class="date-generated">Generated on ${new Date().toLocaleDateString()}</div>
                    ${bodyContent}
                </div>
                <script>
                    window.onload = () => {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `;
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const handleMonthlySummary = async () => {
        setIsGenerating("monthly");
        try {
            const [expRes, payRes] = await Promise.all([
                fetch("/api/finance/expenses"),
                fetch("/api/finance/payouts")
            ]);

            const expJson = await expRes.json();
            const payJson = await payRes.json();

            const expenses = (expJson.data || []).filter((e: any) => {
                const d = new Date(e.date);
                return d.getFullYear() === parseInt(monthlyYear) && (d.getMonth() + 1) === parseInt(monthlyMonth);
            });

            const payouts = (payJson.data || []).filter((p: any) => {
                const d = new Date(p.date);
                return p.status === 'received' && d.getFullYear() === parseInt(monthlyYear) && (d.getMonth() + 1) === parseInt(monthlyMonth);
            });

            const totalIncome = payouts.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
            const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
            const net = totalIncome - totalExpenses;

            const monthName = monthOptions.find(m => m.value === monthlyMonth)?.label;

            let bodyHtml = `
                <div class="kpi-row">
                    <div class="kpi-box">
                        <div class="kpi-title">Total Income</div>
                        <div class="kpi-value font-mono">${formatCurrency(totalIncome)}</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-title">Total Expenses</div>
                        <div class="kpi-value font-mono">${formatCurrency(totalExpenses)}</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-title">Net Profit</div>
                        <div class="kpi-value font-mono ${net >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(net)}</div>
                    </div>
                </div>

                <h2>Income (Payouts)</h2>
                ${payouts.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payouts.map((p: any) => `
                            <tr>
                                <td>${new Date(p.date).toLocaleDateString()}</td>
                                <td class="font-mono">${formatCurrency(Number(p.amount))}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>` : '<p>No income for this period.</p>'}

                <h2>Expenses</h2>
                ${expenses.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Vendor</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${expenses.map((e: any) => `
                            <tr>
                                <td>${new Date(e.date).toLocaleDateString()}</td>
                                <td>${e.vendor || ''}</td>
                                <td>${e.category}</td>
                                <td>${e.description}</td>
                                <td class="font-mono">${formatCurrency(Number(e.amount))}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>` : '<p>No expenses for this period.</p>'}
            `;

            const html = generateHtml(`Monthly Financial Summary — ${monthName} ${monthlyYear}`, bodyHtml);
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(html);
                win.document.close();
            }
        } catch (error) {
            console.error("Failed to generate report", error);
        } finally {
            setIsGenerating(null);
        }
    };

    const handleYearlySummary = async () => {
        setIsGenerating("yearly");
        try {
            const [expRes, payRes] = await Promise.all([
                fetch("/api/finance/expenses"),
                fetch("/api/finance/payouts")
            ]);

            const expJson = await expRes.json();
            const payJson = await payRes.json();

            const yearNum = parseInt(yearlyYear);

            const expenses = (expJson.data || []).filter((e: any) => {
                return new Date(e.date).getFullYear() === yearNum;
            });

            const payouts = (payJson.data || []).filter((p: any) => {
                return p.status === 'received' && new Date(p.date).getFullYear() === yearNum;
            });

            const monthlyData = Array.from({ length: 12 }, (_, i) => ({
                month: monthOptions[i].label,
                income: 0,
                expenses: 0,
                net: 0
            }));

            expenses.forEach((e: any) => {
                const m = new Date(e.date).getMonth();
                monthlyData[m].expenses += Number(e.amount);
            });

            payouts.forEach((p: any) => {
                const m = new Date(p.date).getMonth();
                monthlyData[m].income += Number(p.amount);
            });

            monthlyData.forEach(m => {
                m.net = m.income - m.expenses;
            });

            const ytdIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
            const ytdExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);
            const ytdNet = ytdIncome - ytdExpenses;

            let bodyHtml = `
                <div class="kpi-row">
                    <div class="kpi-box">
                        <div class="kpi-title">YTD Total Income</div>
                        <div class="kpi-value font-mono">${formatCurrency(ytdIncome)}</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-title">YTD Total Expenses</div>
                        <div class="kpi-value font-mono">${formatCurrency(ytdExpenses)}</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-title">YTD Net Profit</div>
                        <div class="kpi-value font-mono ${ytdNet >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(ytdNet)}</div>
                    </div>
                </div>

                <h2>Month by Month Breakdown</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th class="text-right">Income</th>
                            <th class="text-right">Expenses</th>
                            <th class="text-right">Net</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${monthlyData.map((m: any) => `
                            <tr>
                                <td>${m.month}</td>
                                <td class="text-right font-mono">${formatCurrency(m.income)}</td>
                                <td class="text-right font-mono">${formatCurrency(m.expenses)}</td>
                                <td class="text-right font-mono ${m.net > 0 ? 'text-green' : m.net < 0 ? 'text-red' : ''}">${formatCurrency(m.net)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th><strong>Totals</strong></th>
                            <th class="text-right font-mono"><strong>${formatCurrency(ytdIncome)}</strong></th>
                            <th class="text-right font-mono"><strong>${formatCurrency(ytdExpenses)}</strong></th>
                            <th class="text-right font-mono ${ytdNet >= 0 ? 'text-green' : 'text-red'}"><strong>${formatCurrency(ytdNet)}</strong></th>
                        </tr>
                    </tfoot>
                </table>
            `;

            const html = generateHtml(`Yearly Financial Summary — ${yearlyYear}`, bodyHtml);
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(html);
                win.document.close();
            }
        } catch (error) {
            console.error("Failed to generate report", error);
        } finally {
            setIsGenerating(null);
        }
    };

    const handleSubscriptionAudit = async () => {
        setIsGenerating("subscription");
        try {
            const res = await fetch("/api/finance/subscriptions");
            const json = await res.json();

            const subs = json.data || [];

            let totalMonthly = 0;
            let totalAnnual = 0;

            const rowsHtml = subs.map((s: any) => {
                const amt = Number(s.amount);
                let monthlyCost = 0;
                let annualCost = 0;
                if (s.billing_cycle === 'monthly') {
                    monthlyCost = amt;
                    annualCost = amt * 12;
                } else if (s.billing_cycle === 'yearly') {
                    monthlyCost = amt / 12;
                    annualCost = amt;
                } else if (s.billing_cycle === 'quarterly') {
                    monthlyCost = amt / 3;
                    annualCost = amt * 4;
                }

                if (s.status === 'active') {
                    totalMonthly += monthlyCost;
                    totalAnnual += annualCost;
                }

                return `
                    <tr>
                        <td>${s.name}</td>
                        <td>${s.provider || ''}</td>
                        <td style="text-transform: capitalize;">${s.billing_cycle}</td>
                        <td class="text-right font-mono">${formatCurrency(amt)}</td>
                        <td class="text-right font-mono">${formatCurrency(annualCost)}</td>
                    </tr>
                `;
            }).join('');

            let bodyHtml = `
                <div class="kpi-row">
                    <div class="kpi-box">
                        <div class="kpi-title">Total Monthly Cost (Active)</div>
                        <div class="kpi-value font-mono">${formatCurrency(totalMonthly)}</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-title">Total Annual Cost (Active)</div>
                        <div class="kpi-value font-mono">${formatCurrency(totalAnnual)}</div>
                    </div>
                </div>

                <h2>All Subscriptions</h2>
                ${subs.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Provider</th>
                            <th>Billing Cycle</th>
                            <th class="text-right">Amount</th>
                            <th class="text-right">Annual Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>` : '<p>No subscriptions found.</p>'}
            `;

            const html = generateHtml(`Subscription Audit`, bodyHtml);
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(html);
                win.document.close();
            }
        } catch (error) {
            console.error("Failed to generate report", error);
        } finally {
            setIsGenerating(null);
        }
    };

    const handlePropFirmProfitability = async () => {
        setIsGenerating("prop_firm");
        try {
            const [expRes, payRes, accRes] = await Promise.all([
                fetch("/api/finance/expenses"),
                fetch("/api/finance/payouts"),
                fetch("/api/accounts")
            ]);

            const expJson = await expRes.json();
            const payJson = await payRes.json();
            const accJson = await accRes.json();

            // The account objects are in { accounts: [] } 
            const accounts = accJson.accounts || [];

            const expenses = (expJson.data || []).filter((e: any) => e.category === 'Prop Firm Fees');
            const payouts = (payJson.data || []).filter((p: any) => p.status === 'received');

            const accMap = new Map();
            accounts.forEach((acc: any) => {
                accMap.set(acc.id, { name: acc.name, payoutsReceived: 0, feesPaid: 0, net: 0 });
            });
            // We also need a catch-all for unnamed accounts
            accMap.set('unknown', { name: 'Other/Unknown Account', payoutsReceived: 0, feesPaid: 0, net: 0 });

            // Count fees? Currently, expenses are not tied directly to an account in the schema except maybe if we added an account_id 
            // The prompt says: fetch GET /api/finance/payouts and GET /api/finance/expenses (filter category = Prop Firm Fees)
            // But wait, the expenses table doesn't have an account_id. Or does it?
            // Actually, expenses table might not have account_id. If a fee is paid, maybe put it to "Overall" or if we do have account_id, group by it. Let's just sum it.
            // Wait, looking at schema (I don't have it explicitly open, but I can assume expenses have an account_id nullable, or maybe we just group payouts by account and put ALL fees to one pool?)

            // Wait, "Per account table: account name, total payouts received, prop fees paid ... " 
            // I'll group by account_id for both if possible. If an expense doesn't have account_id, assign to unknown.
            expenses.forEach((e: any) => {
                const id = e.account_id || 'unknown';
                if (!accMap.has(id)) {
                    accMap.set(id, { name: 'Unknown', payoutsReceived: 0, feesPaid: 0, net: 0 });
                }
                const record = accMap.get(id);
                record.feesPaid += Number(e.amount);
            });

            payouts.forEach((p: any) => {
                const id = p.account_id || 'unknown';
                if (!accMap.has(id)) {
                    accMap.set(id, { name: 'Unknown', payoutsReceived: 0, feesPaid: 0, net: 0 });
                }
                const record = accMap.get(id);
                record.payoutsReceived += Number(p.amount);
            });

            const rows = Array.from(accMap.values()).filter(r => r.payoutsReceived > 0 || r.feesPaid > 0);

            let totalPayouts = 0;
            let totalFees = 0;

            rows.forEach(r => {
                r.net = r.payoutsReceived - r.feesPaid;
                totalPayouts += r.payoutsReceived;
                totalFees += r.feesPaid;
            });

            const totalNet = totalPayouts - totalFees;

            let bodyHtml = `
                <div class="kpi-row">
                    <div class="kpi-box">
                        <div class="kpi-title">Total Payouts Received</div>
                        <div class="kpi-value font-mono">${formatCurrency(totalPayouts)}</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-title">Total Prop Fees Paid</div>
                        <div class="kpi-value font-mono">${formatCurrency(totalFees)}</div>
                    </div>
                    <div class="kpi-box">
                        <div class="kpi-title">Total Net Profitability</div>
                        <div class="kpi-value font-mono ${totalNet >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(totalNet)}</div>
                    </div>
                </div>

                <h2>Per Account Breakdown</h2>
                ${rows.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Account</th>
                            <th class="text-right">Payouts Received</th>
                            <th class="text-right">Fees Paid</th>
                            <th class="text-right">Net Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((r: any) => `
                            <tr>
                                <td>${r.name}</td>
                                <td class="text-right font-mono">${formatCurrency(r.payoutsReceived)}</td>
                                <td class="text-right font-mono">${formatCurrency(r.feesPaid)}</td>
                                <td class="text-right font-mono ${r.net > 0 ? 'text-green' : r.net < 0 ? 'text-red' : ''}">${formatCurrency(r.net)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th><strong>Totals</strong></th>
                            <th class="text-right font-mono"><strong>${formatCurrency(totalPayouts)}</strong></th>
                            <th class="text-right font-mono"><strong>${formatCurrency(totalFees)}</strong></th>
                            <th class="text-right font-mono ${totalNet >= 0 ? 'text-green' : 'text-red'}"><strong>${formatCurrency(totalNet)}</strong></th>
                        </tr>
                    </tfoot>
                </table>` : '<p>No data found.</p>'}
            `;

            const html = generateHtml(`Prop Firm Profitability Report`, bodyHtml);
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(html);
                win.document.close();
            }
        } catch (error) {
            console.error("Failed to generate report", error);
        } finally {
            setIsGenerating(null);
        }
    };

    return (
        <div className="grid gap-4 md:grid-cols-2">

            {/* Card 1: Monthly Financial Summary */}
            <Card className="flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">Monthly Financial Summary</CardTitle>
                    </div>
                    <CardDescription>
                        Complete breakdown of income, expenses, and net for a selected month
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Month</label>
                            <Select value={monthlyMonth} onValueChange={setMonthlyMonth}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthOptions.map((m) => (
                                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Year</label>
                            <Select value={monthlyYear} onValueChange={setMonthlyYear}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {yearOptions.map((y) => (
                                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        onClick={handleMonthlySummary}
                        disabled={isGenerating !== null}
                        className="w-full"
                    >
                        {isGenerating === "monthly" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate & Download
                    </Button>
                </CardFooter>
            </Card>

            {/* Card 2: Yearly Financial Summary */}
            <Card className="flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">Yearly Financial Summary</CardTitle>
                    </div>
                    <CardDescription>
                        Annual overview of all financial activity and ROI
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Year</label>
                        <Select value={yearlyYear} onValueChange={setYearlyYear}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                                {yearOptions.map((y) => (
                                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter className="mt-auto">
                    <Button
                        onClick={handleYearlySummary}
                        disabled={isGenerating !== null}
                        className="w-full"
                    >
                        {isGenerating === "yearly" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate & Download
                    </Button>
                </CardFooter>
            </Card>

            {/* Card 3: Subscription Audit */}
            <Card className="flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">Subscription Audit</CardTitle>
                    </div>
                    <CardDescription>
                        Full list of active subscriptions with annual cost analysis
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                    {/* No input needed */}
                </CardContent>
                <CardFooter>
                    <Button
                        onClick={handleSubscriptionAudit}
                        disabled={isGenerating !== null}
                        className="w-full mt-auto"
                    >
                        {isGenerating === "subscription" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate & Download
                    </Button>
                </CardFooter>
            </Card>

            {/* Card 4: Prop Firm Profitability */}
            <Card className="flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">Prop Firm Profitability</CardTitle>
                    </div>
                    <CardDescription>
                        Per-account revenue vs fees and net profitability
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                    {/* No input needed */}
                </CardContent>
                <CardFooter>
                    <Button
                        onClick={handlePropFirmProfitability}
                        disabled={isGenerating !== null}
                        className="w-full mt-auto"
                    >
                        {isGenerating === "prop_firm" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate & Download
                    </Button>
                </CardFooter>
            </Card>

        </div>
    );
}
