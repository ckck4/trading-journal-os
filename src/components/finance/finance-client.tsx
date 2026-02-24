"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./overview-tab";
import { ExpensesTab } from "./expenses-tab";
import { SubscriptionsTab } from "./subscriptions-tab";
import { PayoutsTab } from "./payouts-tab";
import { CashFlowTab } from "./cashflow-tab";
import { ReportsTab } from "./reports-tab";
import { SettingsTab } from "./settings-tab";

export function FinanceClient() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Finance Manager</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Track your trading business income, expenses & ROI
                    </p>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                    <TabsTrigger value="payouts">Payouts</TabsTrigger>
                    <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <OverviewTab />
                </TabsContent>

                <TabsContent value="expenses" className="space-y-4">
                    <ExpensesTab />
                </TabsContent>

                <TabsContent value="subscriptions" className="space-y-4">
                    <SubscriptionsTab />
                </TabsContent>

                <TabsContent value="payouts" className="space-y-4">
                    <PayoutsTab />
                </TabsContent>

                <TabsContent value="cashflow" className="space-y-4">
                    <CashFlowTab />
                </TabsContent>
                <TabsContent value="reports" className="space-y-4">
                    <ReportsTab />
                </TabsContent>
                <TabsContent value="settings" className="space-y-4">
                    <SettingsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
