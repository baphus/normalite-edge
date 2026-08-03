import React, { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
    DEFAULT_EXPORT_COLUMNS,
    EXPORT_COLUMNS,
    type ExportColumnKey,
    type ExportScope,
} from './types';

export type ExportFormat = 'pdf' | 'xlsx';

interface ExportScoresDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    allCount: number;
    filteredCount: number;
    busy: boolean;
    onExport: (format: ExportFormat, scope: ExportScope, columns: ExportColumnKey[]) => void;
}

export const ExportScoresDialog: React.FC<ExportScoresDialogProps> = ({
    open,
    onOpenChange,
    allCount,
    filteredCount,
    busy,
    onExport,
}) => {
    const [scope, setScope] = useState<ExportScope>('ALL');
    const [columns, setColumns] = useState<ExportColumnKey[]>([...DEFAULT_EXPORT_COLUMNS]);

    const rowCount = scope === 'FILTERED' ? filteredCount : allCount;
    const canExport = !busy && rowCount > 0 && columns.length > 0;

    const toggleColumn = (key: ExportColumnKey) => {
        setColumns((current) => {
            if (!current.includes(key)) return [...current, key];
            // At least one column must survive, or the export is an empty file.
            if (current.length === 1) return current;
            return current.filter((candidate) => candidate !== key);
        });
    };

    const reset = () => {
        setColumns([...DEFAULT_EXPORT_COLUMNS]);
        setScope('ALL');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl rounded-xl font-lexend">
                <DialogHeader>
                    <DialogTitle className="text-[15px] font-semibold text-slate-900">
                        Export student scores
                    </DialogTitle>
                    <DialogDescription className="text-[12px] text-slate-500">
                        Choose which attempts and which columns to include. Both formats use the
                        same selection.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <p
                            id="export-scope-label"
                            className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500"
                        >
                            Rows
                        </p>
                        <div
                            role="group"
                            aria-labelledby="export-scope-label"
                            className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2"
                        >
                            {([
                                { value: 'ALL' as const, label: 'All attempts', count: allCount },
                                { value: 'FILTERED' as const, label: 'Filtered attempts', count: filteredCount },
                            ]).map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={scope === option.value}
                                    onClick={() => setScope(option.value)}
                                    className={cn(
                                        'rounded-lg border px-3 py-2 text-left text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                                        scope === option.value
                                            ? 'border-primary bg-primary/5 text-slate-900'
                                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                                    )}
                                >
                                    {option.label}
                                    <span className="ml-1.5 tabular-nums text-slate-400">
                                        {option.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between gap-3">
                            <p
                                id="export-columns-label"
                                className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500"
                            >
                                Columns
                            </p>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={reset}
                                className="h-7 rounded-lg px-2 text-[12px] font-semibold text-slate-500"
                            >
                                Reset
                            </Button>
                        </div>
                        <div
                            role="group"
                            aria-labelledby="export-columns-label"
                            className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3"
                        >
                            {EXPORT_COLUMNS.map((column) => {
                                const checked = columns.includes(column.key);
                                const lastOne = checked && columns.length === 1;
                                const inputId = `export-column-${column.key}`;

                                return (
                                    <div
                                        key={column.key}
                                        className={cn(
                                            'flex items-center gap-2 rounded-lg border px-3 py-2',
                                            checked
                                                ? 'border-primary/30 bg-primary/5'
                                                : 'border-slate-200 bg-white',
                                        )}
                                    >
                                        <Checkbox
                                            id={inputId}
                                            checked={checked}
                                            disabled={lastOne}
                                            onCheckedChange={() => toggleColumn(column.key)}
                                        />
                                        <label
                                            htmlFor={inputId}
                                            className={cn(
                                                'text-[12px] font-medium',
                                                checked ? 'text-slate-900' : 'text-slate-500',
                                            )}
                                        >
                                            {column.label}
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="h-8 rounded-lg border-slate-200 text-[12px] font-semibold"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={!canExport}
                        onClick={() => onExport('xlsx', scope, columns)}
                        className="h-8 gap-1.5 rounded-lg border-slate-200 text-[12px] font-semibold"
                    >
                        <FileSpreadsheet size={13} aria-hidden="true" /> Excel
                    </Button>
                    <Button
                        type="button"
                        disabled={!canExport}
                        onClick={() => onExport('pdf', scope, columns)}
                        className="h-8 gap-1.5 rounded-lg bg-primary text-[12px] font-semibold text-white hover:bg-primary/90"
                    >
                        <Download size={13} aria-hidden="true" /> PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ExportScoresDialog;
