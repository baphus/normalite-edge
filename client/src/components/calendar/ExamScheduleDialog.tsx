import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { PROGRAM_TRACKS } from './programTracks';

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

/** Convert a Date to "YYYY-MM-DD" for datetime-local inputs. */
function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${day}`;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* ExamScheduleDialog                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

export interface ExamScheduleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    prefillDate: Date | null;
    onCreated: () => void;
}

export const ExamScheduleDialog: React.FC<ExamScheduleDialogProps> = ({
    open,
    onOpenChange,
    prefillDate,
    onCreated,
}) => {
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [timeLimit, setTimeLimit] = useState('60');
    const [programTrack, setProgramTrack] = useState<string | null>(null);
    const [opensValue, setOpensValue] = useState('');
    const [showDeadline, setShowDeadline] = useState(false);
    const [deadlineValue, setDeadlineValue] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    /* Reset form whenever the dialog opens */
    useEffect(() => {
        if (!open) return;
        const d = prefillDate ?? new Date();
        setOpensValue(`${toDateStr(d)}T08:00`);
        setTitle('');
        setSubject('');
        setTimeLimit('60');
        setProgramTrack(null);
        setShowDeadline(false);
        setDeadlineValue('');
        setErrors({});
    }, [open, prefillDate]);

    /* ── Validation ──────────────────────────────────────────────────────── */

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!title.trim()) errs.title = 'Title is required.';
        if (!subject.trim()) errs.subject = 'Subject is required.';
        const tl = Number(timeLimit);
        if (!timeLimit || isNaN(tl) || tl < 1) errs.timeLimit = 'Time limit must be at least 1 minute.';
        if (showDeadline && deadlineValue && opensValue && new Date(deadlineValue) <= new Date(opensValue)) {
            errs.deadline = 'Deadline must be after the opening time.';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    /* ── Submit ──────────────────────────────────────────────────────────── */

    const handleSubmit = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                title: title.trim(),
                subject: subject.trim(),
                timeLimit: Number(timeLimit),
                scheduledDate: new Date(opensValue).toISOString(),
            };
            if (programTrack) {
                payload.programTrack = programTrack;
            }
            if (showDeadline && deadlineValue) {
                payload.deadline = new Date(deadlineValue).toISOString();
            }

            const res = await api.post('/exams', payload);
            const examId = res.data?.data?.id as string | undefined;

            onOpenChange(false);
            onCreated();
            toast.success('Exam created as draft.', {
                action: {
                    label: 'Edit questions',
                    onClick: () => {
                        if (examId) navigate(`/manage-exams/${examId}/edit`);
                    },
                },
            });
        } catch {
            toast.error('Failed to create exam. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    /* ── Render ──────────────────────────────────────────────────────────── */

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Match the conference wizard's dialog dimensions and radius */}
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold text-gray-900">
                        New Exam
                    </DialogTitle>
                    <DialogDescription className="text-xs text-gray-400">
                        Create a draft exam and set its schedule. You'll add questions in the editor next.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Title */}
                    <div className="space-y-1.5">
                        <Label htmlFor="exam-title" className="text-xs font-medium text-gray-600">
                            Title
                        </Label>
                        <Input
                            id="exam-title"
                            placeholder="e.g. LET Review Mock Exam"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="h-9 text-sm rounded-lg"
                        />
                        {errors.title && <p className="text-xs text-rose-500">{errors.title}</p>}
                    </div>

                    {/* Subject */}
                    <div className="space-y-1.5">
                        <Label htmlFor="exam-subject" className="text-xs font-medium text-gray-600">
                            Subject
                        </Label>
                        <Input
                            id="exam-subject"
                            placeholder="e.g. Professional Education"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className="h-9 text-sm rounded-lg"
                        />
                        {errors.subject && <p className="text-xs text-rose-500">{errors.subject}</p>}
                    </div>

                    {/* Time Limit */}
                    <div className="space-y-1.5">
                        <Label htmlFor="exam-time-limit" className="text-xs font-medium text-gray-600">
                            Time Limit (minutes)
                        </Label>
                        <Input
                            id="exam-time-limit"
                            type="number"
                            min={1}
                            value={timeLimit}
                            onChange={e => setTimeLimit(e.target.value)}
                            className="h-9 text-sm rounded-lg w-28"
                        />
                        {errors.timeLimit && <p className="text-xs text-rose-500">{errors.timeLimit}</p>}
                    </div>

                    {/* Program Track — single-select pill buttons */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-600">Program Track</p>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                onClick={() => setProgramTrack(null)}
                                className={cn(
                                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                                    programTrack === null
                                        ? 'bg-primary text-white border-primary shadow-sm'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary',
                                )}
                            >
                                All Programs
                            </button>
                            {PROGRAM_TRACKS.map(pt => (
                                <button
                                    key={pt.id}
                                    type="button"
                                    onClick={() => setProgramTrack(pt.id)}
                                    className={cn(
                                        'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                                        programTrack === pt.id
                                            ? 'bg-primary text-white border-primary shadow-sm'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary',
                                    )}
                                >
                                    {pt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Opens */}
                    <div className="space-y-1.5">
                        <p className="text-xs font-medium text-gray-600">Opens</p>
                        <p className="text-[11px] text-gray-400">Times are Philippine Time (Asia/Manila).</p>
                        <DateTimePicker
                            value={opensValue}
                            onChange={setOpensValue}
                            placeholder="Select opening date & time"
                        />
                    </div>

                    {/* Deadline (optional) */}
                    <div className="space-y-1.5">
                        <p className="text-xs font-medium text-gray-600">
                            Deadline <span className="text-gray-400 font-normal">(optional)</span>
                        </p>
                        {!showDeadline ? (
                            <button
                                type="button"
                                onClick={() => setShowDeadline(true)}
                                className="flex items-center gap-1.5 rounded text-xs font-semibold text-gray-400 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                                <Plus size={12} /> Add deadline
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <DateTimePicker
                                    value={deadlineValue}
                                    onChange={setDeadlineValue}
                                    placeholder="Select deadline date & time"
                                    onClear={() => {
                                        setShowDeadline(false);
                                        setDeadlineValue('');
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDeadline(false);
                                        setDeadlineValue('');
                                    }}
                                    className="flex items-center gap-1 rounded text-xs font-semibold text-gray-400 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                >
                                    <X size={11} /> Remove deadline
                                </button>
                            </div>
                        )}
                        {errors.deadline && <p className="text-xs text-rose-500">{errors.deadline}</p>}
                    </div>
                </div>

                <DialogFooter className="flex items-center justify-between gap-2 pt-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-gray-500 hover:text-gray-700"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        className="text-xs min-w-24 rounded-lg"
                        onClick={handleSubmit}
                        disabled={saving}
                    >
                        {saving
                            ? <Loader2 size={13} className="animate-spin" />
                            : 'Create'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
