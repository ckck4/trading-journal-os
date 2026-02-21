"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ImportResult } from "@/lib/import/run-import";

// ── State machine ──────────────────────────────────────────────────────────
type ModalPhase = "idle" | "processing" | "complete" | "error";

interface ImportModalProps {
    open: boolean;
    onClose: () => void;
}

export function ImportModal({ open, onClose }: ImportModalProps) {
    const queryClient = useQueryClient();
    const [phase, setPhase] = useState<ModalPhase>("idle");
    const [file, setFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [errorsExpanded, setErrorsExpanded] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = useCallback(() => {
        setPhase("idle");
        setFile(null);
        setIsDragOver(false);
        setResult(null);
        setErrorMessage("");
        setErrorsExpanded(false);
    }, []);

    const handleClose = useCallback(() => {
        if (phase === "processing") return; // block close while running
        resetState();
        onClose();
    }, [phase, resetState, onClose]);

    // ── File selection ─────────────────────────────────────────────────────
    const acceptFile = useCallback((f: File) => {
        if (!f.name.toLowerCase().endsWith(".csv")) {
            setErrorMessage("Only .csv files are accepted");
            setPhase("error");
            return;
        }
        setFile(f);
        setPhase("idle");
        setErrorMessage("");
    }, []);

    const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) acceptFile(f);
        e.target.value = ""; // reset so same file can be re-selected
    };

    // ── Drag & drop ────────────────────────────────────────────────────────
    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };
    const onDragLeave = () => setIsDragOver(false);
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) acceptFile(f);
    };

    // ── Import ─────────────────────────────────────────────────────────────
    const startImport = async () => {
        if (!file) return;
        setPhase("processing");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/import", { method: "POST", body: formData });
            const data = await res.json();

            if (!res.ok) {
                setErrorMessage(data.error ?? "Import failed");
                setPhase("error");
                return;
            }

            setResult(data as ImportResult);
            setPhase("complete");
            // Invalidate all data that depends on trades/summaries so every
            // page (Dashboard, Analytics, Journal, Prop HQ) refreshes automatically.
            // Specific keys first for targeted invalidation, then no-args as a
            // safety net to catch any query not explicitly listed.
            queryClient.invalidateQueries({ queryKey: ['trades'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-daily'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-breakdowns'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
            queryClient.invalidateQueries({ queryKey: ['prop-evaluations'] });
            queryClient.invalidateQueries({ queryKey: ['eval-status'] });
            // Blanket invalidation — marks every cached query stale so any
            // mounted component refetches and any future mount gets fresh data.
            queryClient.invalidateQueries();
        } catch (e) {
            setErrorMessage(e instanceof Error ? e.message : "Network error");
            setPhase("error");
        }
    };

    if (!open) return null;

    return (
        // Backdrop
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
            onClick={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            {/* Modal panel */}
            <div
                className="relative w-full max-w-md rounded-xl border p-6 shadow-2xl"
                style={{
                    backgroundColor: "#1A1A1A",
                    borderColor: "#333333",
                    color: "#FFFFFF",
                }}
            >
                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Import Fills</h2>
                    {phase !== "processing" && (
                        <button
                            onClick={handleClose}
                            className="rounded p-1 transition-colors"
                            style={{ color: "#A3A3A3" }}
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* ── Idle / file selection ── */}
                {(phase === "idle" || phase === "error") && (
                    <>
                        {/* Drag & drop zone — label natively forwards clicks to the file input */}
                        <label
                            htmlFor="import-csv-input"
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                            className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-10 text-center transition-colors"
                            style={{
                                borderColor: isDragOver ? "#3B82F6" : "#333333",
                                backgroundColor: isDragOver
                                    ? "rgba(59,130,246,0.07)"
                                    : "transparent",
                            }}
                        >
                            <svg
                                className="mb-3 h-10 w-10"
                                style={{ color: "#A3A3A3" }}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                            </svg>
                            {file ? (
                                <span className="text-sm font-medium" style={{ color: "#FFFFFF" }}>
                                    {file.name}
                                    <span
                                        className="ml-2 text-xs"
                                        style={{ color: "#A3A3A3" }}
                                    >
                                        ({(file.size / 1024).toFixed(1)} KB)
                                    </span>
                                </span>
                            ) : (
                                <>
                                    <p className="text-sm font-medium">
                                        Drop Tradeovate Fills CSV here
                                    </p>
                                    <p className="mt-1 text-xs" style={{ color: "#A3A3A3" }}>
                                        or click to browse
                                    </p>
                                </>
                            )}
                        </label>
                        <input
                            id="import-csv-input"
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={onFileInputChange}
                        />

                        {/* Error banner */}
                        {phase === "error" && errorMessage && (
                            <div
                                className="mb-4 rounded-lg border px-4 py-3 text-sm"
                                style={{
                                    backgroundColor: "rgba(239,68,68,0.1)",
                                    borderColor: "rgba(239,68,68,0.4)",
                                    color: "#FCA5A5",
                                }}
                            >
                                {errorMessage}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleClose}
                                className="flex-1 rounded-lg border py-2 text-sm transition-colors"
                                style={{ borderColor: "#333333", color: "#A3A3A3" }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={startImport}
                                disabled={!file}
                                className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-40"
                                style={{
                                    backgroundColor: file ? "#3B82F6" : "#3B82F6",
                                    color: "#FFFFFF",
                                }}
                            >
                                Start Import
                            </button>
                        </div>
                    </>
                )}

                {/* ── Processing ── */}
                {phase === "processing" && (
                    <div className="flex flex-col items-center py-8">
                        <svg
                            className="mb-4 h-10 w-10 animate-spin"
                            style={{ color: "#3B82F6" }}
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                        </svg>
                        <p className="text-sm font-medium">Processing fills…</p>
                        <p className="mt-1 text-xs" style={{ color: "#A3A3A3" }}>
                            Parsing → deduplicating → reconstructing trades
                        </p>
                    </div>
                )}

                {/* ── Complete ── */}
                {phase === "complete" && result && (
                    <>
                        <div className="mb-5 space-y-3">
                            <ResultRow
                                icon="✅"
                                label="New fills imported"
                                value={result.newFills}
                                color="#10B981"
                            />
                            <ResultRow
                                icon="🔄"
                                label="Duplicates skipped"
                                value={result.duplicateFills}
                                color="#A3A3A3"
                            />
                            <ResultRow
                                icon="✅"
                                label="Trades created"
                                value={result.tradesCreated}
                                color="#10B981"
                            />
                            {result.errorRows > 0 && (
                                <ResultRow
                                    icon="❌"
                                    label="Rows with errors"
                                    value={result.errorRows}
                                    color="#F87171"
                                />
                            )}
                        </div>

                        {/* Expandable error details */}
                        {result.errors.length > 0 && (
                            <div className="mb-5">
                                <button
                                    onClick={() => setErrorsExpanded((v) => !v)}
                                    className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors"
                                    style={{ borderColor: "#333333", color: "#A3A3A3" }}
                                >
                                    <span>
                                        {result.errors.length} error detail
                                        {result.errors.length !== 1 ? "s" : ""}
                                    </span>
                                    <span>{errorsExpanded ? "▲" : "▼"}</span>
                                </button>
                                {errorsExpanded && (
                                    <div
                                        className="mt-2 max-h-40 overflow-y-auto rounded-lg border p-3"
                                        style={{ borderColor: "#333333" }}
                                    >
                                        {result.errors.map((e, i) => (
                                            <p
                                                key={i}
                                                className="mb-1 text-xs"
                                                style={{ color: "#F87171" }}
                                            >
                                                {e.row != null ? `Row ${e.row}: ` : ""}
                                                {e.message}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleClose}
                            className="w-full rounded-lg py-2 text-sm font-medium"
                            style={{ backgroundColor: "#3B82F6", color: "#FFFFFF" }}
                        >
                            Done
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

// ── Result row helper ──────────────────────────────────────────────────────
function ResultRow({
    icon,
    label,
    value,
    color,
}: {
    icon: string;
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm" style={{ color: "#A3A3A3" }}>
                <span>{icon}</span>
                {label}
            </span>
            <span className="font-mono text-sm font-semibold" style={{ color }}>
                {value}
            </span>
        </div>
    );
}
