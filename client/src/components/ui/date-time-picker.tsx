import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Clock, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
    /** Value in datetime-local format: "YYYY-MM-DDTHH:mm" */
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    onClear?: () => void;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
    value,
    onChange,
    placeholder = 'Select date and time',
    className,
    onClear,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const datePart = value ? value.split('T')[0] : '';
    const timePart = value ? (value.split('T')[1]?.slice(0, 5) || '12:00') : '12:00';
    const hours = timePart.split(':')[0] ?? '12';
    const minutes = timePart.split(':')[1] ?? '00';

    const selectedDate = datePart ? new Date(`${datePart}T12:00:00`) : undefined;

    const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minuteOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

    // Round up minutes to nearest 5 for display if not matching
    const displayMinutes = minuteOptions.includes(minutes) ? minutes : minuteOptions[0];

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen]);

    const handleDateSelect = (date: Date | undefined) => {
        if (!date) return;
        const dateStr = format(date, 'yyyy-MM-dd');
        onChange(`${dateStr}T${timePart}`);
    };

    const handleTimeChange = (newHours: string, newMinutes: string) => {
        const base = datePart || format(new Date(), 'yyyy-MM-dd');
        onChange(`${base}T${newHours}:${newMinutes}`);
    };

    const formattedDisplay = value && datePart
        ? `${format(new Date(`${datePart}T12:00:00`), 'MMM d, yyyy')} · ${hours}:${minutes}`
        : null;

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'w-full flex items-center gap-2.5 h-11 px-3.5 rounded-xl border text-left transition-all',
                    value
                        ? 'border-slate-200 bg-white text-slate-800'
                        : 'border-slate-200 bg-white text-slate-400',
                    isOpen
                        ? 'ring-2 ring-primary/20 border-primary/30'
                        : 'hover:border-slate-300'
                )}
            >
                <CalendarIcon size={15} className="text-slate-400 shrink-0" />
                <span className={cn('flex-1 text-sm font-semibold truncate', !value && 'font-medium')}>
                    {formattedDisplay || placeholder}
                </span>
                {value && onClear ? (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onClear?.(); } }}
                        className="p-0.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={13} />
                    </span>
                ) : (
                    <ChevronDown
                        size={14}
                        className={cn('text-slate-400 shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
                    />
                )}
            </button>

            {isOpen && (
                <div className="absolute z-50 top-full left-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 overflow-hidden min-w-74">
                    {/* Calendar */}
                    <div className="p-3 pb-1">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            initialFocus
                        />
                    </div>

                    {/* Time picker */}
                    <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/60">
                        <div className="flex items-center gap-2 mb-2.5">
                            <Clock size={13} className="text-slate-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Time</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Hour</label>
                                <select
                                    value={hours}
                                    onChange={(e) => handleTimeChange(e.target.value, displayMinutes)}
                                    className="w-full h-9 rounded-lg border border-slate-200 bg-white text-sm font-bold text-center focus:ring-2 focus:ring-primary/20 focus:outline-none focus:border-primary/30 cursor-pointer"
                                >
                                    {hourOptions.map((h) => (
                                        <option key={h} value={h}>
                                            {h}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <span className="text-slate-400 font-black text-lg mt-4">:</span>
                            <div className="flex-1">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Min</label>
                                <select
                                    value={displayMinutes}
                                    onChange={(e) => handleTimeChange(hours, e.target.value)}
                                    className="w-full h-9 rounded-lg border border-slate-200 bg-white text-sm font-bold text-center focus:ring-2 focus:ring-primary/20 focus:outline-none focus:border-primary/30 cursor-pointer"
                                >
                                    {minuteOptions.map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Period</label>
                                <select
                                    value={Number(hours) >= 12 ? 'PM' : 'AM'}
                                    onChange={(e) => {
                                        const isPM = e.target.value === 'PM';
                                        let h = Number(hours);
                                        if (isPM && h < 12) h += 12;
                                        if (!isPM && h >= 12) h -= 12;
                                        handleTimeChange(String(h).padStart(2, '0'), displayMinutes);
                                    }}
                                    className="w-full h-9 rounded-lg border border-slate-200 bg-white text-sm font-bold text-center focus:ring-2 focus:ring-primary/20 focus:outline-none focus:border-primary/30 cursor-pointer"
                                >
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Confirm */}
                    <div className="px-4 pb-3 pt-2">
                        <Button
                            type="button"
                            className="w-full h-9 rounded-xl text-xs font-black uppercase tracking-widest"
                            onClick={() => setIsOpen(false)}
                            disabled={!datePart}
                        >
                            {datePart ? 'Confirm' : 'Select a date first'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
