"use client";

import { useState, KeyboardEvent, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, X } from "lucide-react";

export function SettingsTab() {
    const queryClient = useQueryClient();

    const [fiscalYearStart, setFiscalYearStart] = useState("1");
    const [vendorPresets, setVendorPresets] = useState<string[]>([]);
    const [customTags, setCustomTags] = useState<string[]>([]);

    const [vendorInput, setVendorInput] = useState("");
    const [tagInput, setTagInput] = useState("");

    const { data: settings, isLoading } = useQuery({
        queryKey: ["finance", "settings"],
        queryFn: async () => {
            const res = await fetch("/api/finance/settings");
            if (!res.ok) throw new Error("Failed to fetch settings");
            const json = await res.json();
            return json.data;
        }
    });

    useEffect(() => {
        if (settings) {
            setFiscalYearStart(settings.fiscal_year_start?.toString() || "1");
            setVendorPresets(settings.vendor_presets || []);
            setCustomTags(settings.custom_tags || []);
        }
    }, [settings]);

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/finance/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fiscal_year_start: parseInt(fiscalYearStart),
                    vendor_presets: vendorPresets,
                    custom_tags: customTags
                })
            });
            if (!res.ok) throw new Error("Failed to save settings");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["finance", "settings"] });
            alert("Settings saved successfully.");
        },
        onError: () => {
            alert("Failed to save settings. Please try again.");
        }
    });

    const handleVendorKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && vendorInput.trim()) {
            e.preventDefault();
            if (!vendorPresets.includes(vendorInput.trim())) {
                setVendorPresets([...vendorPresets, vendorInput.trim()]);
            }
            setVendorInput("");
        }
    };

    const removeVendor = (vendor: string) => {
        setVendorPresets(vendorPresets.filter(v => v !== vendor));
    };

    const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && tagInput.trim()) {
            e.preventDefault();
            if (!customTags.includes(tagInput.trim())) {
                setCustomTags([...customTags, tagInput.trim()]);
            }
            setTagInput("");
        }
    };

    const removeTag = (tag: string) => {
        setCustomTags(customTags.filter(t => t !== tag));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle>General</CardTitle>
                    <CardDescription>Basic configurations for your financial data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 max-w-md">
                        <label className="text-sm font-medium">Fiscal Year Start Month</label>
                        <Select value={fiscalYearStart} onValueChange={setFiscalYearStart}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">January</SelectItem>
                                <SelectItem value="2">February</SelectItem>
                                <SelectItem value="3">March</SelectItem>
                                <SelectItem value="4">April</SelectItem>
                                <SelectItem value="5">May</SelectItem>
                                <SelectItem value="6">June</SelectItem>
                                <SelectItem value="7">July</SelectItem>
                                <SelectItem value="8">August</SelectItem>
                                <SelectItem value="9">September</SelectItem>
                                <SelectItem value="10">October</SelectItem>
                                <SelectItem value="11">November</SelectItem>
                                <SelectItem value="12">December</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">Used to calculate YTD figures.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Expense Entry</CardTitle>
                    <CardDescription>Presets to speed up manual data entry</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Vendor Presets</label>
                        <Input
                            value={vendorInput}
                            onChange={(e) => setVendorInput(e.target.value)}
                            onKeyDown={handleVendorKeyDown}
                            placeholder="Type a vendor and press Enter"
                        />
                        <p className="text-sm text-muted-foreground">These appear as suggestions when adding expenses.</p>

                        {vendorPresets.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {vendorPresets.map(vendor => (
                                    <div key={vendor} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm">
                                        <span>{vendor}</span>
                                        <button onClick={() => removeVendor(vendor)} className="hover:bg-muted p-0.5 rounded-full transition-colors ml-1">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Custom Tags</label>
                        <Input
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            placeholder="Type a tag and press Enter"
                        />
                        <p className="text-sm text-muted-foreground">Custom tags for organizing and filtering expenses.</p>

                        {customTags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {customTags.map(tag => (
                                    <div key={tag} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm">
                                        <span>{tag}</span>
                                        <button onClick={() => removeTag(tag)} className="hover:bg-muted p-0.5 rounded-full transition-colors ml-1">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-start">
                <Button
                    onClick={() => mutation.mutate()}
                    disabled={mutation.isPending}
                >
                    {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Settings
                </Button>
            </div>
        </div>
    );
}
