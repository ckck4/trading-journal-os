"use client";

import { useState } from "react";
import { ImportModal } from "@/components/import/import-modal";

// ── Global Toolbar ─────────────────────────────────────────────────────────
// Contains the Import button and any other top-level toolbar actions.
export function GlobalToolbar() {
    const [importOpen, setImportOpen] = useState(false);

    return (
        <>
            <header
                className="flex h-12 items-center justify-between border-b px-4"
                style={{
                    backgroundColor: "#0A0A0A",
                    borderColor: "#333333",
                }}
            >
                {/* Left: app name / nav placeholder */}
                <span className="text-sm font-semibold tracking-tight" style={{ color: "#FFFFFF" }}>
                    Trading Journal
                </span>

                {/* Right: toolbar actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setImportOpen(true)}
                        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:border-blue-500 hover:text-blue-400"
                        style={{
                            borderColor: "#333333",
                            color: "#A3A3A3",
                            backgroundColor: "transparent",
                        }}
                    >
                        <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                            />
                        </svg>
                        Import
                    </button>
                </div>
            </header>

            <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
        </>
    );
}
