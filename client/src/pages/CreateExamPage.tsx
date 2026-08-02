import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    ChevronRight,
    ChevronUp,
    ChevronDown,
    GripVertical,
    Save,
    Plus,
    X,
    Trash2,
    Copy,
    Clock,
    FileUp,
    FileJson,
    ImagePlus,
    CalendarClock,
    MoreHorizontal,
    Eye,
    FileText,
    Settings2,
    LayoutList,
    ListChecks,
} from 'lucide-react';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import { parseCsvRecords } from '@/lib/parseCsvRecords';
import { readUploadedText } from '@/lib/readUploadedText';
import { uploadImageToCloudinary } from '@/lib/upload';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Question {
    id: string;
    text: string;
    imageUrl?: string;
    options: string[];
    correctOption: number;
    rationale: string;
    section: string;
}

interface TrackOption {
    id: string;
    name: string;
    code?: string | null;
}

interface ExamQuestionApi {
    id: string;
    orderNo?: number;
    sectionId?: string;
    section?: {
        id?: string;
        title?: string;
    };
    questionText?: string;
    imageUrl?: string;
    choiceA?: string;
    choiceB?: string;
    choiceC?: string;
    choiceD?: string;
    correctChoice?: string;
    rationalization?: string;
}

interface ExamApi {
    id: string;
    title: string;
    subject?: string;
    description?: string | null;
    categoryCode?: 'GENERAL_EDUCATION' | 'PROFESSIONAL_EDUCATION' | 'SPECIALIZATION' | null;
    program_track?: string | null;
    trackIds?: string[];
    tracks?: Array<{ id: string; name: string; code?: string | null }>;
    timeLimit?: number;
    timeLimitMinutes?: number;
    maxAttempts?: number | null;
    status?: 'LIVE' | 'DRAFT' | 'ARCHIVED' | 'CLOSED' | 'PUBLISHED';
    deadline?: string | null;
    closeOnDeadline?: boolean;
    sections?: Array<{ id: string; title: string; orderNo?: number }>;
    questions?: ExamQuestionApi[];
}

type EditableExamStatus = 'LIVE' | 'DRAFT' | 'CLOSED' | 'ARCHIVED';

const editableStatusOptions: Array<{ value: EditableExamStatus; label: string }> = [
    { value: 'LIVE', label: 'Live' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'CLOSED', label: 'Closed' },
    { value: 'ARCHIVED', label: 'Archived' },
];

const categoryOptions = [
    { value: 'NONE', label: 'No Category' },
    { value: 'GENERAL_EDUCATION', label: 'General Education' },
    { value: 'PROFESSIONAL_EDUCATION', label: 'Professional Education' },
    { value: 'SPECIALIZATION', label: 'Specialization' },
] as const;

type CategoryValue = (typeof categoryOptions)[number]['value'];

const DEFAULT_SECTION_TITLE = 'Main section';
const NEW_SECTION_OPTION = '__NEW_SECTION_OPTION__';
const OPTION_DISPLAY_ORDER = [0, 2, 1, 3];

const ExcelTemplateIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
        <rect x="3" y="4" width="8" height="16" rx="1.5" fill="#107C41" />
        <path d="M6.2 9L7.9 12L6.2 15H7.8L8.8 13.1L9.8 15H11.4L9.7 12L11.4 9H9.8L8.8 10.9L7.8 9H6.2Z" fill="white" />
        <path d="M10 6.5C10 5.67157 10.6716 5 11.5 5H18.5C19.3284 5 20 5.67157 20 6.5V17.5C20 18.3284 19.3284 19 18.5 19H11.5C10.6716 19 10 18.3284 10 17.5V6.5Z" fill="#33C481" />
        <path d="M12.5 8H17.5M12.5 11H17.5M12.5 14H17.5M12.5 17H17.5" stroke="white" strokeWidth="1.25" strokeLinecap="round" opacity="0.95" />
    </svg>
);

const normalizeSectionValue = (value?: string | null) => value?.trim() || DEFAULT_SECTION_TITLE;

type AutoGrowTextareaProps = React.ComponentProps<typeof Textarea>;

const AutoGrowTextarea: React.FC<AutoGrowTextareaProps> = ({ className, onInput, value, ...props }) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const syncHeight = () => {
        const node = textareaRef.current;
        if (!node) return;

        node.style.height = '0px';
        node.style.height = `${node.scrollHeight}px`;
    };

    useEffect(() => {
        syncHeight();
    }, [value]);

    return (
        <Textarea
            {...props}
            ref={textareaRef}
            value={value}
            onInput={(event) => {
                syncHeight();
                onInput?.(event);
            }}
            className={`${className || ''} overflow-hidden`}
        />
    );
};

interface SortableQuestionCardProps {
    question: Question;
    index: number;
    totalVisibleQuestions: number;
    onDuplicateQuestion: (question: Question) => void;
    onOpenMoveQuestion: (question: Question) => void;
    onDeleteQuestion: (questionId: string) => void;
    onUpdateQuestion: (questionId: string, updates: Partial<Question>) => void;
    onQuestionImageUpload: (questionId: string, event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    onMoveQuestion: (questionId: string, direction: 'up' | 'down') => void;
}

const SortableQuestionCard: React.FC<SortableQuestionCardProps> = ({
    question,
    index,
    totalVisibleQuestions,
    onDuplicateQuestion,
    onOpenMoveQuestion,
    onDeleteQuestion,
    onUpdateQuestion,
    onQuestionImageUpload,
    onMoveQuestion,
}) => {
    const [showRationale, setShowRationale] = useState(false);
    const [isImageDragging, setIsImageDragging] = useState(false);
    const imageInputRef = useRef<HTMLInputElement | null>(null);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: question.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const handleImageDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsImageDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const fakeEvent = { target: { files: [file], value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>;
            void onQuestionImageUpload(question.id, fakeEvent);
        }
    }, [question.id, onQuestionImageUpload]);

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className={`group/card rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white transition-all ${isDragging ? 'opacity-60 shadow-xl ring-2 ring-primary/20 scale-[1.01]' : 'hover:shadow-md hover:border-slate-200'}`}
        >
            {/* Card Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                    <button
                        type="button"
                        className="cursor-grab rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white hover:text-primary active:cursor-grabbing"
                        {...attributes}
                        {...listeners}
                        title="Drag to reorder"
                    >
                        <GripVertical size={15} />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] rounded-lg bg-primary/10 px-2 text-[10px] font-black text-primary">
                            Q{index + 1}
                        </span>
                        {normalizeSectionValue(question.section) && (
                            <span className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                <LayoutList size={9} />
                                {normalizeSectionValue(question.section)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {/* Quick reorder buttons - only on larger screens */}
                    {totalVisibleQuestions > 1 && (
                        <div className="hidden sm:flex items-center gap-0.5 mr-1">
                            <button
                                type="button"
                                className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                                disabled={index === 0}
                                onClick={() => onMoveQuestion(question.id, 'up')}
                                title="Move up"
                            >
                                <ChevronUp size={14} />
                            </button>
                            <button
                                type="button"
                                className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                                disabled={index === totalVisibleQuestions - 1}
                                onClick={() => onMoveQuestion(question.id, 'down')}
                                title="Move down"
                            >
                                <ChevronDown size={14} />
                            </button>
                        </div>
                    )}
                    {/* Dropdown action menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                title="Question actions"
                            >
                                <MoreHorizontal size={16} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            {totalVisibleQuestions > 1 && (
                                <>
                                    <DropdownMenuItem
                                        disabled={index === 0}
                                        onClick={() => onMoveQuestion(question.id, 'up')}
                                        className="gap-2 text-xs font-semibold"
                                    >
                                        <ChevronUp size={13} /> Move Up
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        disabled={index === totalVisibleQuestions - 1}
                                        onClick={() => onMoveQuestion(question.id, 'down')}
                                        className="gap-2 text-xs font-semibold"
                                    >
                                        <ChevronDown size={13} /> Move Down
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            <DropdownMenuItem onClick={() => onDuplicateQuestion(question)} className="gap-2 text-xs font-semibold">
                                <Copy size={13} /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onOpenMoveQuestion(question)} className="gap-2 text-xs font-semibold">
                                <ChevronRight size={13} /> Move to Section
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => onDeleteQuestion(question.id)}
                                className="gap-2 text-xs font-semibold text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                                <Trash2 size={13} /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Card Body */}
            <CardContent className="space-y-5 p-5 sm:p-6">
                {/* Question Text */}
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Question
                    </Label>
                    <AutoGrowTextarea
                        value={question.text}
                        onChange={(e) => onUpdateQuestion(question.id, { text: e.target.value })}
                        placeholder="Enter your question here..."
                        className="min-h-[4.5rem] rounded-xl border-slate-200/80 bg-slate-50/30 px-4 py-3 text-sm font-semibold leading-relaxed shadow-none focus:ring-primary/20 focus:border-primary/30 resize-none transition-all"
                    />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Image <span className="lowercase font-medium text-slate-300">(optional)</span>
                    </Label>
                    {question.imageUrl ? (
                        <div className="relative group/img rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                            <img
                                src={question.imageUrl}
                                alt="Question attachment"
                                className="max-h-52 w-auto max-w-full rounded-lg border border-slate-100 object-contain bg-white mx-auto"
                            />
                            <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                <label className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-primary hover:border-primary/30 cursor-pointer shadow-sm transition-all">
                                    <ImagePlus size={11} />
                                    Replace
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(event) => { void onQuestionImageUpload(question.id, event); }}
                                        className="hidden"
                                    />
                                </label>
                                <button
                                    type="button"
                                    className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-600 hover:border-red-200 cursor-pointer shadow-sm transition-all"
                                    onClick={() => onUpdateQuestion(question.id, { imageUrl: '' })}
                                >
                                    <Trash2 size={11} />
                                    Remove
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsImageDragging(true); }}
                            onDragLeave={() => setIsImageDragging(false)}
                            onDrop={handleImageDrop}
                            onClick={() => imageInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 cursor-pointer transition-all ${
                                isImageDragging
                                    ? 'border-primary/40 bg-primary/5'
                                    : 'border-slate-200/80 bg-slate-50/20 hover:border-primary/25 hover:bg-primary/[0.02]'
                            }`}
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                                <ImagePlus size={18} className="text-slate-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-slate-500">Click to upload or drag and drop</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">PNG, JPG up to 3MB</p>
                            </div>
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(event) => { void onQuestionImageUpload(question.id, event); }}
                                className="hidden"
                            />
                        </div>
                    )}
                </div>

                {/* Answer Choices */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Answer Choices
                        </Label>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500">
                            Tap circle to mark correct
                        </span>
                    </div>
                    <RadioGroup
                        value={question.correctOption.toString()}
                        onValueChange={(val) => onUpdateQuestion(question.id, { correctOption: parseInt(val) })}
                        className="space-y-2"
                    >
                        {OPTION_DISPLAY_ORDER.map((optIdx) => (
                            <div
                                key={optIdx}
                                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                                    question.correctOption === optIdx
                                        ? 'bg-emerald-50/50 border-emerald-200/80 ring-1 ring-emerald-100/60'
                                        : 'bg-white border-slate-150 hover:border-slate-200 hover:bg-slate-50/30'
                                }`}
                            >
                                <span className={`inline-flex items-center justify-center h-6 min-w-[1.5rem] rounded-md text-[10px] font-black ${
                                    question.correctOption === optIdx
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-100 text-slate-400'
                                }`}>
                                    {String.fromCharCode(65 + optIdx)}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <AutoGrowTextarea
                                        value={question.options[optIdx] || ''}
                                        rows={1}
                                        onChange={(e) => {
                                            const newOpts = [...question.options];
                                            newOpts[optIdx] = e.target.value;
                                            onUpdateQuestion(question.id, { options: newOpts });
                                        }}
                                        placeholder={`Enter option ${String.fromCharCode(65 + optIdx)}...`}
                                        className={`min-h-0 w-full resize-none border-none bg-transparent p-0 text-sm font-semibold leading-5 focus:ring-0 ${
                                            question.correctOption === optIdx ? 'text-slate-900' : 'text-slate-500'
                                        }`}
                                    />
                                </div>
                                <RadioGroupItem
                                    value={optIdx.toString()}
                                    id={`q-${question.id}-opt-${optIdx}`}
                                    className={`shrink-0 transition-colors ${
                                        question.correctOption === optIdx
                                            ? 'border-emerald-400 text-emerald-500 focus:ring-emerald-500'
                                            : 'border-slate-300 text-slate-300 focus:ring-slate-300'
                                    }`}
                                />
                            </div>
                        ))}
                    </RadioGroup>
                </div>

                {/* Rationale - Collapsible */}
                <div className="border-t border-slate-100 pt-4">
                    <button
                        type="button"
                        onClick={() => setShowRationale(!showRationale)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
                    >
                        <span className={`flex items-center justify-center h-5 w-5 rounded-md transition-transform ${showRationale ? 'rotate-90' : ''}`}>
                            <ChevronRight size={12} />
                        </span>
                        Rationale / Explanation
                        {question.rationale && !showRationale && (
                            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                        <span className="lowercase font-medium text-slate-300">(optional)</span>
                    </button>
                    {showRationale && (
                        <div className="mt-3">
                            <AutoGrowTextarea
                                value={question.rationale}
                                onChange={(e) => onUpdateQuestion(question.id, { rationale: e.target.value })}
                                placeholder="Explain why this is the correct answer..."
                                className="min-h-[3.5rem] resize-none rounded-xl border-slate-200/80 bg-slate-50/30 px-4 py-3 text-xs font-medium leading-relaxed shadow-none focus:ring-primary/20 focus:border-primary/30 transition-all"
                            />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const CreateExamPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;
    const { user } = useAuth();
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 6,
            },
        })
    );

    const PRESET_DURATIONS = [30, 60, 90, 120, 180, 240];

    // Form State
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState('');
    const [maxAttempts, setMaxAttempts] = useState('3');
    const [isCustomDuration, setIsCustomDuration] = useState(false);
    const [deadline, setDeadline] = useState('');
    const [showDeadline, setShowDeadline] = useState(false);
    const [closeOnDeadline, setCloseOnDeadline] = useState(false);
    const [examStatus, setExamStatus] = useState<EditableExamStatus>('DRAFT');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<CategoryValue>('NONE');
    const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
    const [tracks, setTracks] = useState<TrackOption[]>([]);
    const [sections, setSections] = useState<string[]>([DEFAULT_SECTION_TITLE]);
    const [activeSection, setActiveSection] = useState(DEFAULT_SECTION_TITLE);
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [editingSectionName, setEditingSectionName] = useState('');
    const [programs, setPrograms] = useState<string[]>(['All Programs']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingExam, setIsLoadingExam] = useState(false);
    const [allowMultipleAttemptsConfig, setAllowMultipleAttemptsConfig] = useState(false);
    const importFileRef = useRef<HTMLInputElement | null>(null);
    const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
    const [importPreviewQuestions, setImportPreviewQuestions] = useState<Question[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
    const [moveQuestionTarget, setMoveQuestionTarget] = useState<Question | null>(null);
    const [moveTargetSection, setMoveTargetSection] = useState<string>(DEFAULT_SECTION_TITLE);
    const [moveTargetNewSection, setMoveTargetNewSection] = useState('');
    const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);

    useEffect(() => {
        const fetchTracks = async () => {
            try {
                const response = await api.get('/tracks');
                const items = (response.data?.data || []) as TrackOption[];
                setTracks(items);
                setPrograms(['All Programs', ...items.map((track) => track.name)]);
            } catch (error) {
                console.error('Failed to load tracks', error);
            }
        };

        fetchTracks();
    }, []);

    useEffect(() => {
        const fetchSystemSettings = async () => {
            try {
                const response = await api.get('/settings/system');
                setAllowMultipleAttemptsConfig(Boolean(response.data?.data?.allowMultipleAttempts));
            } catch (error) {
                console.error('Failed to load system settings', error);
                setAllowMultipleAttemptsConfig(false);
            }
        };

        void fetchSystemSettings();
    }, []);

    useEffect(() => {
        if (!isEditing || !id) return;

        const fetchExam = async () => {
            setIsLoadingExam(true);
            try {
                const response = await api.get(`/exams/${id}?questions=true`);
                const exam = response.data?.data as ExamApi;

                setTitle(exam.title || '');
                setDescription(exam.description || '');
                setCategory((exam.categoryCode as CategoryValue) || 'NONE');
                const loadedDuration = String(exam.timeLimit || exam.timeLimitMinutes || 120);
                setDuration(loadedDuration);
                setMaxAttempts(String(exam.maxAttempts ?? 3));
                if (!PRESET_DURATIONS.includes(Number(loadedDuration))) {
                    setIsCustomDuration(true);
                }
                setCloseOnDeadline(Boolean(exam.closeOnDeadline));
                const loadedStatus = exam.status === 'PUBLISHED' ? 'LIVE' : exam.status;
                if (loadedStatus === 'LIVE') {
                    toast.error('Published exams cannot be edited.');
                    navigate(`/manage-exams/${id}/view`);
                    return;
                }
                if (loadedStatus && ['LIVE', 'DRAFT', 'CLOSED', 'ARCHIVED'].includes(loadedStatus)) {
                    setExamStatus(loadedStatus as EditableExamStatus);
                }
                if (exam.deadline) {
                    const deadlineDate = new Date(exam.deadline);
                    const offset = deadlineDate.getTimezoneOffset();
                    const localDate = new Date(deadlineDate.getTime() - offset * 60_000);
                    setDeadline(localDate.toISOString().slice(0, 16));
                    setShowDeadline(true);
                } else {
                    setDeadline('');
                    setShowDeadline(false);
                }
                if (exam.tracks && exam.tracks.length > 0) {
                    setSelectedPrograms(exam.tracks.map((track) => track.name));
                } else {
                    setSelectedPrograms(exam.program_track ? [exam.program_track] : []);
                }

                const apiQuestions = exam.questions || [];
                const sectionMap = new Map((exam.sections || []).map((section) => [section.id, section.title]));
                if (apiQuestions.length > 0) {
                    const mapped = apiQuestions
                        .sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
                        .map((q, index) => {
                            const letters = ['A', 'B', 'C', 'D'];
                            const correctIndex = letters.indexOf((q.correctChoice || 'A').toUpperCase());
                            const resolvedSectionId = q.sectionId || q.section?.id || '';
                            const resolvedSectionTitle = q.section?.title || sectionMap.get(resolvedSectionId) || '';
                            return {
                                id: q.id || `${Date.now()}-${index}`,
                                text: q.questionText || '',
                                imageUrl: q.imageUrl || '',
                                options: [q.choiceA || '', q.choiceB || '', q.choiceC || '', q.choiceD || ''],
                                correctOption: correctIndex >= 0 ? correctIndex : 0,
                                rationale: q.rationalization || '',
                                section: normalizeSectionValue(resolvedSectionTitle),
                            };
                        });
                    setQuestions(mapped);
                }

                const fetchedSections = (exam.sections || [])
                    .slice()
                    .sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
                    .map((section) => normalizeSectionValue(section.title))
                    .filter((section): section is string => Boolean(section));
                const nextSections = fetchedSections.length > 0
                    ? fetchedSections
                    : Array.from(new Set(
                        apiQuestions
                            .map((q) => normalizeSectionValue(q.section?.title || sectionMap.get(q.sectionId || q.section?.id || '') || ''))
                            .filter(Boolean)
                    ));
                const safeSections = nextSections.length > 0 ? nextSections : [DEFAULT_SECTION_TITLE];
                setSections(safeSections);
                setActiveSection(safeSections[0] || DEFAULT_SECTION_TITLE);
            } catch (error) {
                console.error('Failed to load exam for editing', error);
                toast.error('Failed to load exam details.');
                navigate('/manage-exams');
            } finally {
                setIsLoadingExam(false);
            }
        };

        fetchExam();
    }, [isEditing, id, navigate]);

    const handleProgramToggle = (program: string) => {
        if (program === 'All Programs') {
            setSelectedPrograms(['All Programs']);
        } else {
            const next = selectedPrograms.includes(program)
                ? selectedPrograms.filter(p => p !== program)
                : [...selectedPrograms.filter(p => p !== 'All Programs'), program];
            setSelectedPrograms(next.length === 0 ? ['All Programs'] : next);
        }
    };

    const confirmAddSection = () => {
        const value = newSectionName.trim();
        if (!value) return;
        if (sections.includes(value)) {
            setNewSectionName('');
            setIsAddingSection(false);
            return;
        }

        setSections([...sections, value]);
        setActiveSection(value);
        setNewSectionName('');
        setIsAddingSection(false);
    };

    const cancelAddSection = () => {
        setNewSectionName('');
        setIsAddingSection(false);
    };

    const handleAddSectionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmAddSection();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelAddSection();
        }
    };

    const removeSection = (section: string) => {
        if (sections.length <= 1) {
            toast.error('The exam must keep at least one section.');
            return;
        }

        const remainingSections = sections.filter((s) => s !== section);
        setSections(remainingSections);
        setQuestions((prev) => prev.map((question) => {
            if (normalizeSectionValue(question.section) !== section) {
                return question;
            }

            return {
                ...question,
                section: remainingSections[0] || DEFAULT_SECTION_TITLE,
            };
        }));
        if (activeSection === section) {
            setActiveSection(remainingSections[0] || DEFAULT_SECTION_TITLE);
        }
    };

    const cancelRenameSection = () => {
        setEditingSection(null);
        setEditingSectionName('');
    };

    const createQuestion = (targetSection?: string) => {
        const newQuestion: Question = {
            id: Date.now().toString(),
            text: '',
            imageUrl: '',
            options: ['', '', '', ''],
            correctOption: 0,
            rationale: '',
            section: normalizeSectionValue(targetSection ?? activeSection ?? sections[0])
        };
        setQuestions((prev) => [...prev, newQuestion]);
    };

    const addQuestion = () => {
        createQuestion();
    };

    const updateQuestion = (id: string, updates: Partial<Question>) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
    };

    const deleteQuestion = (id: string) => {
        setDeleteQuestionId(id);
    };

    const confirmDeleteQuestion = () => {
        if (deleteQuestionId) {
            setQuestions(questions.filter(q => q.id !== deleteQuestionId));
            setDeleteQuestionId(null);
        }
    };

    const duplicateQuestion = (q: Question) => {
        const duplicate = { ...q, id: Date.now().toString() };
        setQuestions([...questions, duplicate]);
    };

    const openMoveQuestionDialog = (question: Question) => {
        setMoveQuestionTarget(question);
        setMoveTargetSection(normalizeSectionValue(question.section));
        setMoveTargetNewSection('');
    };

    const closeMoveQuestionDialog = () => {
        setMoveQuestionTarget(null);
        setMoveTargetSection(normalizeSectionValue(activeSection || sections[0]));
        setMoveTargetNewSection('');
    };

    const confirmMoveQuestion = () => {
        if (!moveQuestionTarget) {
            return;
        }

        const trimmedNewSection = moveTargetNewSection.trim();
        const nextSection = normalizeSectionValue(
            trimmedNewSection || (moveTargetSection === NEW_SECTION_OPTION ? '' : moveTargetSection)
        );

        if (!trimmedNewSection && moveTargetSection === NEW_SECTION_OPTION) {
            toast.error('Type a new section name to create it.');
            return;
        }

        if (trimmedNewSection) {
            if (!sections.includes(trimmedNewSection)) {
                setSections((prev) => [...prev, trimmedNewSection]);
            }
            setActiveSection(trimmedNewSection);
        }

        setQuestions((prev) => prev.map((question) => (
            question.id === moveQuestionTarget.id
                ? { ...question, section: nextSection }
                : question
        )));

        if (!trimmedNewSection && nextSection) {
            setActiveSection(nextSection);
        }

        closeMoveQuestionDialog();
    };

    const isQuestionVisibleInCurrentView = (question: Question) => {
        const normalizedSection = normalizeSectionValue(question.section);
        return normalizedSection === normalizeSectionValue(activeSection || sections[0]);
    };

    const reorderVisibleQuestions = (items: Question[], fromIndex: number, toIndex: number) => {
        const visibleQuestions = items.filter(isQuestionVisibleInCurrentView);
        const reorderedVisibleQuestions = arrayMove(visibleQuestions, fromIndex, toIndex);
        let visibleQuestionIndex = 0;

        return items.map((question) => {
            if (!isQuestionVisibleInCurrentView(question)) {
                return question;
            }

            const nextQuestion = reorderedVisibleQuestions[visibleQuestionIndex];
            visibleQuestionIndex += 1;
            return nextQuestion;
        });
    };

    const moveQuestion = (questionId: string, direction: 'up' | 'down') => {
        setQuestions((prev) => {
            const visibleIds = prev.filter(isQuestionVisibleInCurrentView).map((question) => question.id);

            const currentVisibleIndex = visibleIds.indexOf(questionId);
            if (currentVisibleIndex < 0) {
                return prev;
            }

            const swapWithIndex = direction === 'up'
                ? currentVisibleIndex - 1
                : currentVisibleIndex + 1;

            if (swapWithIndex < 0 || swapWithIndex >= visibleIds.length) {
                return prev;
            }

            return reorderVisibleQuestions(prev, currentVisibleIndex, swapWithIndex);
        });
    };

    const handleQuestionDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        setQuestions((prev) => {
            const visibleIds = prev.filter(isQuestionVisibleInCurrentView).map((question) => question.id);
            const currentVisibleIndex = visibleIds.indexOf(String(active.id));
            const targetVisibleIndex = visibleIds.indexOf(String(over.id));

            if (currentVisibleIndex < 0 || targetVisibleIndex < 0) {
                return prev;
            }

            return reorderVisibleQuestions(prev, currentVisibleIndex, targetVisibleIndex);
        });
    };

    const validateImageFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file.');
            return false;
        }

        const maxFileSizeInBytes = 3 * 1024 * 1024;
        if (file.size > maxFileSizeInBytes) {
            toast.error('Image must be 3MB or smaller.');
            return false;
        }

        return true;
    };

    const handleQuestionImageUpload = async (questionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (!validateImageFile(file)) {
            return;
        }

        try {
            const secureUrl = await uploadImageToCloudinary(file, 'question-images');
            updateQuestion(questionId, { imageUrl: secureUrl });
            toast.success('Image attached successfully.');
        } catch (error) {
            console.error('Failed to attach question image', error);
            toast.error('Failed to attach image. Please try again.');
        }
    };

    const updateImportPreviewQuestion = (questionId: string, updates: Partial<Question>) => {
        setImportPreviewQuestions((prev) => prev.map((question) => (
            question.id === questionId ? { ...question, ...updates } : question
        )));
    };

    const handleImportPreviewImageUpload = async (questionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (!validateImageFile(file)) {
            return;
        }

        try {
            const secureUrl = await uploadImageToCloudinary(file, 'question-images');
            updateImportPreviewQuestion(questionId, { imageUrl: secureUrl });
            toast.success('Image attached to imported question.');
        } catch (error) {
            console.error('Failed to attach imported question image', error);
            toast.error('Failed to attach image. Please try again.');
        }
    };

    const normalizeCorrectOption = (correctAnswer: unknown, choices: string[] = []) => {
        const letters = ['A', 'B', 'C', 'D'];
        const normalized = String(correctAnswer ?? '').trim();
        const normalizedUpper = normalized.toUpperCase();
        const letterIndex = letters.indexOf(normalizedUpper);
        if (letterIndex >= 0) return letterIndex;

        const numeric = Number(normalized);
        if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 4) {
            return numeric - 1;
        }

        if (!Number.isNaN(numeric) && numeric >= 0 && numeric <= 3) {
            return numeric;
        }

        if (normalized) {
            const matchedChoiceIndex = choices.findIndex(
                (choice) => choice.trim().toLowerCase() === normalized.toLowerCase()
            );
            if (matchedChoiceIndex >= 0) {
                return matchedChoiceIndex;
            }
        }

        return 0;
    };

    const triggerImport = () => {
        importFileRef.current?.click();
    };

    const getImportTargetSection = () => {
        return normalizeSectionValue(activeSection || sections[0]);
    };

    const downloadTemplate = (format: 'csv' | 'json') => {
        const csvTemplate = [
            'questionText,choiceA,choiceB,choiceC,choiceD,correctAnswer,rationalization',
            'What is 2 + 2?,2,3,4,5,C,4 is the correct sum',
        ].join('\n');

        const jsonTemplate = JSON.stringify([
            {
                questionText: 'What is 2 + 2?',
                choiceA: '2',
                choiceB: '3',
                choiceC: '4',
                choiceD: '5',
                correctAnswer: 'C',
                rationalization: '4 is the correct sum',
            },
        ], null, 2);

        const content = format === 'csv' ? csvTemplate : jsonTemplate;
        const type = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;';
        const fileName = format === 'csv' ? 'exam-import-template.csv' : 'exam-import-template.json';

        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const normalizeImportKey = (key: string) =>
        key.replace(/^\uFEFF/, '').replace(/[\s_-]+/g, '').toLowerCase();

    const toNormalizedRecord = (record: Record<string, any>) => {
        return Object.entries(record).reduce<Record<string, any>>((acc, [key, value]) => {
            acc[normalizeImportKey(key)] = value;
            return acc;
        }, {});
    };

    const pickImportValue = (record: Record<string, any>, aliases: string[]) => {
        const normalizedRecord = toNormalizedRecord(record);

        for (const alias of aliases) {
            const value = normalizedRecord[normalizeImportKey(alias)];
            if (value !== undefined && value !== null && String(value).trim().length > 0) {
                return value;
            }
        }

        return undefined;
    };

    const orderQuestionsBySections = (items: Question[], sectionOrder: string[]) => {
        const sectionIndexMap = new Map(
            sectionOrder.map((section, index) => [section.trim().toLowerCase(), index])
        );

        return items
            .map((question, index) => ({ question, index }))
            .sort((left, right) => {
                const leftSectionIndex = sectionIndexMap.get((left.question.section || '').trim().toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
                const rightSectionIndex = sectionIndexMap.get((right.question.section || '').trim().toLowerCase()) ?? Number.MAX_SAFE_INTEGER;

                if (leftSectionIndex !== rightSectionIndex) {
                    return leftSectionIndex - rightSectionIndex;
                }

                return left.index - right.index;
            })
            .map((entry) => entry.question);
    };

    const processImportedRecords = (records: Array<Record<string, any>>) => {
        if (records.length === 0) {
            toast.error('No valid question rows found in the import file.');
            return;
        }

        const targetSection = getImportTargetSection();

        const mappedQuestions: Question[] = records
            .map((record, index) => {
                const text = String(
                    pickImportValue(record, ['questionText', 'question', 'text', 'prompt']) ?? ''
                ).trim();
                if (!text) return null;

                const options = [
                    pickImportValue(record, ['choiceA', 'optionA', 'option1', 'a']) ?? '',
                    pickImportValue(record, ['choiceB', 'optionB', 'option2', 'b']) ?? '',
                    pickImportValue(record, ['choiceC', 'optionC', 'option3', 'c']) ?? '',
                    pickImportValue(record, ['choiceD', 'optionD', 'option4', 'd']) ?? '',
                ].map((option) => String(option).trim());

                const correctAnswerValue =
                    pickImportValue(record, [
                        'correctAnswer',
                        'correct_answer',
                        'correctOption',
                        'correct_choice',
                        'correct_answer_index',
                        'answer',
                    ])
                    ?? 'A';

                const correctOption = normalizeCorrectOption(correctAnswerValue, options);

                return {
                    id: `${Date.now()}-${index}`,
                    text,
                    imageUrl: '',
                    options,
                    correctOption,
                    rationale: String(
                        pickImportValue(record, ['rationalization', 'explanation', 'rationale']) ?? ''
                    ).trim(),
                    section: normalizeSectionValue(targetSection),
                } as Question;
            })
            .filter((item): item is Question => !!item);

        if (mappedQuestions.length === 0) {
            toast.error('No valid questions were parsed from the import file.');
            return;
        }

        const orderedMappedQuestions = orderQuestionsBySections(mappedQuestions, sections);

        setImportPreviewQuestions(orderedMappedQuestions);
        setIsImportPreviewOpen(true);
    };

    const applyImportedQuestions = () => {
        if (importPreviewQuestions.length === 0) {
            setIsImportPreviewOpen(false);
            return;
        }

        setQuestions((prev) => orderQuestionsBySections([...prev, ...importPreviewQuestions], sections));
        setIsImportPreviewOpen(false);
        setImportPreviewQuestions([]);
        toast.success('Imported questions added successfully.');
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        const lowerName = file.name.toLowerCase();
        if (!lowerName.endsWith('.csv') && !lowerName.endsWith('.json')) {
            toast.error('Unsupported file type. Please upload a CSV or JSON file.');
            return;
        }

        try {
            const content = await readUploadedText(file);

            if (lowerName.endsWith('.json')) {
                const parsed = JSON.parse(content);
                const rows = Array.isArray(parsed)
                    ? parsed
                    : Array.isArray(parsed?.questions)
                        ? parsed.questions
                        : Array.isArray(parsed?.items)
                            ? parsed.items
                            : [parsed];
                processImportedRecords(rows as Array<Record<string, any>>);
                return;
            }

            const rows = parseCsvRecords(content);

            if (rows.length === 0) {
                toast.error('CSV file has no data rows.');
                return;
            }

            processImportedRecords(rows);
        } catch (error) {
            console.error('Failed to import questions', error);
            toast.error('Failed to import file. Please check the template and try again.');
        }
    };

    const handleSubmitIntent = (publish: boolean) => {
        if (isEditing && examStatus === 'LIVE') {
            toast.error('Published exams cannot be edited.');
            navigate(id ? `/manage-exams/${id}/view` : '/manage-exams');
            return;
        }

        if (publish) {
            setPublishConfirmOpen(true);
            return;
        }

        void doSubmit(false);
    };

    const doSubmit = async (publish: boolean) => {
        if (!title.trim()) {
            toast.error('Please enter an exam title.');
            return;
        }

        if (!duration.trim()) {
            toast.error('Please enter the exam duration in minutes.');
            return;
        }

        const parsedMaxAttempts = allowMultipleAttemptsConfig
            ? Number(maxAttempts)
            : 1;

        if (allowMultipleAttemptsConfig) {
            if (!maxAttempts.trim()) {
                toast.error('Please set the maximum number of attempts.');
                return;
            }

            if (!Number.isInteger(parsedMaxAttempts) || parsedMaxAttempts < 1) {
                toast.error('Maximum attempts must be a whole number of at least 1.');
                return;
            }
        }

        const normalizedQuestions = questions.map((question) => {
            const text = question.text.trim();
            const imageUrl = question.imageUrl?.trim() || undefined;
            const choices = question.options.map((option) => option.trim());
            const explanation = question.rationale.trim() || undefined;

            return {
                text,
                imageUrl,
                choices,
                correctAnswer: ['A', 'B', 'C', 'D'][question.correctOption],
                explanation,
                section: normalizeSectionValue(question.section),
                hasAnyContent:
                    text.length > 0
                    || Boolean(imageUrl)
                    || choices.some((choice) => choice.length > 0)
                    || Boolean(explanation),
            };
        });

        const preparedQuestions = normalizedQuestions
            .filter((question) => question.hasAnyContent)
            .map(({ hasAnyContent, ...question }) => question);

        if (preparedQuestions.length === 0) {
            toast.error('Please add at least one question.');
            return;
        }

        if (normalizedQuestions.some((question) => question.hasAnyContent && question.text.length === 0)) {
            toast.error('Please complete or remove questions without question text.');
            return;
        }

        const hasInvalidQuestion = preparedQuestions.some((q) => q.choices.some((choice) => choice.length === 0));
        if (hasInvalidQuestion) {
            toast.error('Please complete all four options for each question.');
            return;
        }

        if (closeOnDeadline && !deadline) {
            toast.error('Please set a deadline when enabling close on deadline.');
            return;
        }

        const selectedProgramNames = selectedPrograms.filter((program) => program !== 'All Programs');
        const selectedTrackIds = tracks
            .filter((track) => selectedProgramNames.includes(track.name))
            .map((track) => track.id);

        const normalizedSectionList = Array.from(new Set([
            ...sections.map((section) => section.trim()),
            ...preparedQuestions.map((question) => normalizeSectionValue(question.section).trim()),
        ].filter(Boolean)));
        const displaySubject = normalizedSectionList[0] || title.trim();

        const payload = {
            title: title.trim(),
            subject: displaySubject,
            category: category === 'NONE' ? null : category,
            trackIds: selectedTrackIds,
            timeLimit: Number(duration),
            maxAttempts: parsedMaxAttempts,
            deadline: deadline ? new Date(deadline).toISOString() : undefined,
            closeOnDeadline: closeOnDeadline && Boolean(deadline),
            isPublished: publish,
            status: isEditing ? (publish ? 'LIVE' : examStatus) : undefined,
            sections: normalizedSectionList,
            questions: preparedQuestions,
        };

        setIsSubmitting(true);
        try {
            if (isEditing && id) {
                await api.put(`/exams/${id}`, payload);
                toast.success(publish ? 'Exam updated and published successfully!' : 'Exam draft updated successfully!');
            } else {
                await api.post('/exams', payload);
                toast.success(publish ? 'Exam published successfully!' : 'Exam saved as draft!');
            }
            navigate('/manage-exams');
        } catch (error: any) {
            console.error('Failed to submit exam', error);
            const message = error.response?.data?.message || 'Failed to save exam.';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const sectionTabs = sections;

    const filteredQuestions = questions.filter((question) => {
        const normalizedSection = normalizeSectionValue(question.section);
        return normalizedSection === normalizeSectionValue(activeSection || sections[0]);
    });

    const [showAllPrograms, setShowAllPrograms] = useState(false);
    const [showVisibilityCard, setShowVisibilityCard] = useState(false);
    const [showScheduleCard, setShowScheduleCard] = useState(false);
    const [showDescriptionCard, setShowDescriptionCard] = useState(false);
    const [editingTabSection, setEditingTabSection] = useState<string | null>(null);
    const [editingTabSectionName, setEditingTabSectionName] = useState('');

    const VISIBLE_PROGRAMS_LIMIT = 5;
    const visiblePrograms = showAllPrograms ? programs : programs.slice(0, VISIBLE_PROGRAMS_LIMIT);
    const hasMorePrograms = programs.length > VISIBLE_PROGRAMS_LIMIT;

    const startRenameTabSection = (section: string) => {
        setEditingTabSection(section);
        setEditingTabSectionName(section);
    };

    const cancelRenameTabSection = () => {
        setEditingTabSection(null);
        setEditingTabSectionName('');
    };

    const confirmRenameTabSection = () => {
        if (!editingTabSection) return;
        const nextName = editingTabSectionName.trim();
        if (!nextName) {
            toast.error('Section name is required.');
            return;
        }
        if (nextName !== editingTabSection && sections.includes(nextName)) {
            toast.error('That section name already exists.');
            return;
        }
        setSections((prev) => prev.map((section) => section === editingTabSection ? nextName : section));
        setQuestions((prev) => prev.map((question) => (
            normalizeSectionValue(question.section) === editingTabSection
                ? { ...question, section: nextName }
                : question
        )));
        if (activeSection === editingTabSection) {
            setActiveSection(nextName);
        }
        if (moveTargetSection === editingTabSection) {
            setMoveTargetSection(nextName);
        }
        cancelRenameTabSection();
    };

    if (isLoadingExam) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] font-lexend">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading exam details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5 font-lexend pb-8">
            {/* Header */}
            <header className="bg-white rounded-2xl px-5 py-4 md:px-6 border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                            <Link to="/manage-exams" className="hover:text-primary transition-colors">Exams</Link>
                            <ChevronRight size={11} />
                            <span className="text-primary">{isEditing ? 'Edit Exam' : 'New Exam'}</span>
                        </div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">
                            {isEditing ? 'Edit Mock Exam' : 'Create Mock Exam'}
                        </h1>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                            Design and publish comprehensive mock exams for students.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="ghost"
                            className="h-9 rounded-xl px-4 font-black text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                            onClick={() => navigate('/manage-exams')}
                        >
                            Discard
                        </Button>
                        <Button
                            variant="outline"
                            className="h-9 rounded-xl px-4 font-black text-xs border-slate-200 hover:bg-slate-50"
                            onClick={() => handleSubmitIntent(false)}
                            disabled={isSubmitting}
                        >
                            <Save size={14} className="mr-1.5" /> Save Draft
                        </Button>
                        <Button
                            className="h-9 rounded-xl px-5 bg-primary hover:bg-primary/90 text-white font-black text-xs"
                            onClick={() => handleSubmitIntent(true)}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : isEditing ? 'Publish Exam' : 'Publish'}
                        </Button>
                    </div>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-amber-700">
                    Warning: Once published, this exam can no longer be edited.
                </p>
            </header>

            {/* Main Two-Panel Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* ═══════════════════════════════════════════════════════ */}
                {/* LEFT COLUMN (2/3): Questions                          */}
                {/* ═══════════════════════════════════════════════════════ */}
                <div className="lg:col-span-2 space-y-4 lg:order-1">
                    {/* Toolbar row: heading + import actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600">Questions</h3>
                            <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[9px] px-2 py-1 rounded-md">
                                {questions.length} {questions.length === 1 ? 'item' : 'items'}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                ref={importFileRef}
                                type="file"
                                accept=".csv,.json,application/json,text/csv"
                                onChange={handleFileImport}
                                className="hidden"
                            />
                            <Button variant="outline" className="h-8 rounded-lg border-slate-200 bg-white font-bold text-[10px] gap-1.5 px-3 uppercase tracking-wider" onClick={triggerImport}>
                                <FileUp size={12} /> Import
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 rounded-lg border-slate-200 bg-white font-bold text-[10px] gap-1.5 px-3 uppercase tracking-wider"
                                onClick={() => downloadTemplate('csv')}
                                title="Download template"
                            >
                                <ExcelTemplateIcon /> Template
                            </Button>
                            {user?.role === 'ADMIN' && (
                                <Button
                                    variant="outline"
                                    className="h-8 w-9 rounded-lg border-slate-200 bg-white font-bold text-[10px] gap-1 px-2"
                                    onClick={() => downloadTemplate('json')}
                                    title="Download JSON template"
                                >
                                    <FileJson size={13} />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Section Tabs — single source of truth for section management */}
                    <div className={`flex items-center gap-2 ${sectionTabs.length > 0 ? 'border-b border-slate-100 pb-px' : ''}`}>
                        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 min-w-0">
                            {sectionTabs.map((section) => {
                                const count = questions.filter((q) => normalizeSectionValue(q.section) === section).length;
                                const isActive = activeSection === section;
                                const isRenaming = editingTabSection === section;

                                if (isRenaming) {
                                    return (
                                        <div key={section} className="flex items-center gap-1 shrink-0">
                                            <Input
                                                autoFocus
                                                value={editingTabSectionName}
                                                onChange={(e) => setEditingTabSectionName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') { e.preventDefault(); confirmRenameTabSection(); }
                                                    if (e.key === 'Escape') { e.preventDefault(); cancelRenameTabSection(); }
                                                }}
                                                onBlur={confirmRenameTabSection}
                                                className="h-8 w-36 rounded-lg border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest"
                                            />
                                        </div>
                                    );
                                }

                                return (
                                    <DropdownMenu key={section}>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                className={`relative px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${isActive
                                                    ? 'border-primary text-primary'
                                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                                                    }`}
                                            >
                                                {section}
                                                <Badge className={`border-none text-[9px] px-1.5 py-0 ${isActive ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-400'}`}>
                                                    {count}
                                                </Badge>
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-44">
                                            <DropdownMenuItem onClick={() => setActiveSection(section)} className="gap-2 text-xs font-semibold">
                                                <Eye size={13} /> View Questions
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => startRenameTabSection(section)} className="gap-2 text-xs font-semibold">
                                                <Settings2 size={13} /> Rename Section
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                disabled={sections.length <= 1}
                                                onClick={() => removeSection(section)}
                                                className="gap-2 text-xs font-semibold text-red-600 focus:text-red-600 focus:bg-red-50"
                                            >
                                                <Trash2 size={13} /> Delete Section
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                );
                            })}
                        </div>
                        <div className="shrink-0">
                            {!isAddingSection ? (
                                <button
                                    type="button"
                                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-primary px-2 py-1.5 rounded-lg hover:bg-primary/5 transition-all"
                                    onClick={() => setIsAddingSection(true)}
                                >
                                    <Plus size={10} /> Section
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Input
                                        autoFocus
                                        value={newSectionName}
                                        onChange={(e) => setNewSectionName(e.target.value)}
                                        onKeyDown={handleAddSectionKeyDown}
                                        placeholder="Section name"
                                        className="h-7 w-32 rounded-lg border-slate-200 bg-white text-xs font-semibold"
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-7 rounded-lg px-2.5 text-[10px] font-black uppercase tracking-wider"
                                        onClick={confirmAddSection}
                                    >
                                        Add
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 rounded-lg px-2 text-[10px] font-black uppercase tracking-wider"
                                        onClick={cancelAddSection}
                                    >
                                        <X size={12} />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Questions List */}
                    <div className="space-y-4">
                        {filteredQuestions.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 flex items-center justify-center mb-4 shadow-sm">
                                    <ListChecks size={26} className="text-slate-300" />
                                </div>
                                <p className="font-black text-[11px] tracking-widest uppercase text-slate-500">
                                    No questions in this section
                                </p>
                                <p className="text-[11px] font-medium text-slate-400 mt-1.5 max-w-[260px] leading-relaxed">
                                    Start building your exam by adding questions manually or importing from a file.
                                </p>
                                <div className="flex items-center gap-2 mt-4">
                                    <Button
                                        className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white px-5"
                                        onClick={addQuestion}
                                    >
                                        <Plus size={13} className="mr-1.5" /> Add Question
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest border-slate-200 text-slate-500 hover:bg-slate-50 px-5"
                                        onClick={triggerImport}
                                    >
                                        <FileUp size={13} className="mr-1.5" /> Import File
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQuestionDragEnd}>
                                <SortableContext items={filteredQuestions.map((question) => question.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-4">
                                        {filteredQuestions.map((q, index) => (
                                            <SortableQuestionCard
                                                key={q.id}
                                                question={q}
                                                index={index}
                                                totalVisibleQuestions={filteredQuestions.length}
                                                onDuplicateQuestion={duplicateQuestion}
                                                onOpenMoveQuestion={openMoveQuestionDialog}
                                                onDeleteQuestion={deleteQuestion}
                                                onUpdateQuestion={updateQuestion}
                                                onQuestionImageUpload={handleQuestionImageUpload}
                                                onMoveQuestion={moveQuestion}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}

                        {/* Add Question button */}
                        {filteredQuestions.length > 0 && (
                            <button
                                onClick={addQuestion}
                                className="group flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-4 text-slate-400 transition-all hover:border-primary/30 hover:bg-primary/[0.03] hover:text-primary"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-all group-hover:border-primary/30 group-hover:shadow-md group-hover:scale-105">
                                    <Plus size={16} className="text-primary" />
                                </div>
                                <span className="font-black text-[10px] uppercase tracking-widest">Add Question</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════ */}
                {/* RIGHT COLUMN (1/3): Exam Settings                    */}
                {/* ═══════════════════════════════════════════════════════ */}
                <div className="lg:col-span-1 space-y-4 lg:order-2 lg:self-start lg:sticky lg:top-5">

                    {/* ── Card: General ── */}
                    <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="px-5 pt-5 pb-3 border-b border-slate-50">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                                    <Settings2 size={14} className="text-primary" />
                                </div>
                                <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-600">General</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            {/* Title */}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exam Title</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., LET 2024 Comprehensive Mock"
                                    className="h-10 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-semibold text-sm"
                                />
                            </div>

                            {/* Category */}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</Label>
                                <Select value={category} onValueChange={(value) => setCategory(value as CategoryValue)}>
                                    <SelectTrigger className="h-10 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-semibold text-sm">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categoryOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Duration */}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duration</Label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {PRESET_DURATIONS.map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => { setDuration(String(preset)); setIsCustomDuration(false); }}
                                            className={`h-9 rounded-lg text-[10px] font-black border transition-all ${
                                                !isCustomDuration && duration === String(preset)
                                                    ? 'bg-primary text-white border-primary shadow-sm'
                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-primary/30 hover:text-primary'
                                            }`}
                                        >
                                            {preset < 60 ? `${preset}m` : `${preset / 60}h`}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setIsCustomDuration(true); setDuration(''); }}
                                    className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                                        isCustomDuration ? 'text-primary' : 'text-slate-400 hover:text-primary'
                                    }`}
                                >
                                    <Clock size={11} />
                                    Custom
                                </button>
                                {isCustomDuration && (
                                    <div className="relative mt-1">
                                        <Input
                                            type="number"
                                            min={1}
                                            autoFocus
                                            value={duration}
                                            onChange={(e) => setDuration(e.target.value)}
                                            placeholder="e.g. 150"
                                            className="h-9 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-semibold text-sm pr-14"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-wider">min</span>
                                    </div>
                                )}
                            </div>

                            {/* Max Attempts */}
                            {allowMultipleAttemptsConfig && (
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Max Attempts</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            min={1}
                                            step={1}
                                            value={maxAttempts}
                                            onChange={(e) => setMaxAttempts(e.target.value)}
                                            placeholder="e.g. 3"
                                            className="h-10 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-semibold text-sm pr-14 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-wider">tries</span>
                                    </div>
                                    <p className="text-[10px] font-medium text-slate-400">Used when multiple attempts are enabled in System Settings.</p>
                                </div>
                            )}

                            {/* Status (edit only) */}
                            {isEditing && (
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</Label>
                                    <Select value={examStatus} onValueChange={(value) => setExamStatus(value as EditableExamStatus)}>
                                        <SelectTrigger className="h-10 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-semibold text-sm">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {editableStatusOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── Card: Visibility ── */}
                    <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
                        <button
                            type="button"
                            onClick={() => setShowVisibilityCard(!showVisibilityCard)}
                            className="w-full"
                        >
                            <CardHeader className="px-5 py-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                                            <Eye size={14} className="text-primary" />
                                        </div>
                                        <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-600">Visible To</CardTitle>
                                        {selectedPrograms.length > 0 && !selectedPrograms.includes('All Programs') && (
                                            <Badge className="bg-primary/10 text-primary border-none text-[9px] font-bold px-1.5 py-0">
                                                {selectedPrograms.length}
                                            </Badge>
                                        )}
                                    </div>
                                    <ChevronRight size={14} className={`text-slate-300 transition-transform ${showVisibilityCard ? 'rotate-90' : ''}`} />
                                </div>
                            </CardHeader>
                        </button>
                        {showVisibilityCard && (
                            <CardContent className="p-5 space-y-3">
                                <div className="grid grid-cols-1 gap-1.5 max-h-[200px] overflow-y-auto pr-1 scrollbar-hide">
                                    {visiblePrograms.map((program) => (
                                        <div
                                            key={program}
                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all cursor-pointer ${selectedPrograms.includes(program)
                                                ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10'
                                                : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                                                }`}
                                            onClick={() => handleProgramToggle(program)}
                                        >
                                            <Checkbox
                                                id={`vis-${program}`}
                                                checked={selectedPrograms.includes(program)}
                                                className="rounded-md border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-3.5 w-3.5"
                                            />
                                            <Label htmlFor={`vis-${program}`} className="text-xs font-bold leading-none cursor-pointer">
                                                {program}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                                {hasMorePrograms && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAllPrograms(!showAllPrograms)}
                                        className="text-[10px] font-black uppercase tracking-wider text-primary hover:text-primary/80 transition-colors w-full text-center py-1"
                                    >
                                        {showAllPrograms ? 'Show less' : `Show all ${programs.length} programs`}
                                    </button>
                                )}
                            </CardContent>
                        )}
                    </Card>

                    {/* ── Card: Schedule ── */}
                    <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
                        <button
                            type="button"
                            onClick={() => setShowScheduleCard(!showScheduleCard)}
                            className="w-full"
                        >
                            <CardHeader className="px-5 py-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                                            <CalendarClock size={14} className="text-primary" />
                                        </div>
                                        <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-600">Schedule</CardTitle>
                                        {showDeadline && deadline && (
                                            <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-bold px-1.5 py-0">
                                                Set
                                            </Badge>
                                        )}
                                    </div>
                                    <ChevronRight size={14} className={`text-slate-300 transition-transform ${showScheduleCard ? 'rotate-90' : ''}`} />
                                </div>
                            </CardHeader>
                        </button>
                        {showScheduleCard && (
                            <CardContent className="p-5 space-y-3">
                                {!showDeadline ? (
                                    <button
                                        type="button"
                                        onClick={() => { setShowDeadline(true); }}
                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors group"
                                    >
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full border border-dashed border-slate-300 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all">
                                            <Plus size={10} />
                                        </span>
                                        Add Deadline
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        <DateTimePicker
                                            value={deadline}
                                            onChange={setDeadline}
                                            placeholder="Select deadline date & time"
                                            onClear={() => setDeadline('')}
                                        />
                                        <div
                                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${closeOnDeadline ? 'bg-primary/5 border-primary/20' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                            onClick={() => setCloseOnDeadline(!closeOnDeadline)}
                                        >
                                            <Checkbox
                                                id="close-on-deadline"
                                                checked={closeOnDeadline}
                                                onCheckedChange={(checked) => setCloseOnDeadline(Boolean(checked))}
                                                className="rounded-md border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-3.5 w-3.5"
                                            />
                                            <Label htmlFor="close-on-deadline" className="text-[10px] font-bold leading-none cursor-pointer text-slate-600">
                                                Auto-close on deadline
                                            </Label>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowDeadline(false);
                                                setDeadline('');
                                                setCloseOnDeadline(false);
                                            }}
                                            className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                                        >
                                            <X size={10} /> Remove deadline
                                        </button>
                                    </div>
                                )}
                            </CardContent>
                        )}
                    </Card>

                    {/* ── Card: Description ── */}
                    <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
                        <button
                            type="button"
                            onClick={() => setShowDescriptionCard(!showDescriptionCard)}
                            className="w-full"
                        >
                            <CardHeader className="px-5 py-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                                            <FileText size={14} className="text-primary" />
                                        </div>
                                        <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-600">Description</CardTitle>
                                        {description && !showDescriptionCard && (
                                            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                                        )}
                                    </div>
                                    <ChevronRight size={14} className={`text-slate-300 transition-transform ${showDescriptionCard ? 'rotate-90' : ''}`} />
                                </div>
                            </CardHeader>
                        </button>
                        {showDescriptionCard && (
                            <CardContent className="p-5">
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide instructions or context for students..."
                                    className="min-h-24 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-medium text-sm leading-relaxed resize-none"
                                />
                            </CardContent>
                        )}
                    </Card>

                </div>
            </div>

            {/* ── Import Preview Dialog ── */}
            <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
                <DialogContent className="max-w-4xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Review Imported Questions</DialogTitle>
                        <DialogDescription>
                            {importPreviewQuestions.length} parsed questions found. Review, edit, and upload images here before adding them to {getImportTargetSection() ? `${getImportTargetSection()}.` : 'the full exam.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                        {importPreviewQuestions.map((question, index) => (
                            <div key={question.id} className="border border-gray-100 rounded-xl p-4 space-y-4 bg-white">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-black text-gray-600 uppercase tracking-widest">Question {index + 1}</p>
                                    {normalizeSectionValue(question.section) && (
                                        <Badge variant="outline" className="text-[10px]">{normalizeSectionValue(question.section)}</Badge>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Question</Label>
                                    <AutoGrowTextarea
                                        value={question.text}
                                        onChange={(event) => updateImportPreviewQuestion(question.id, { text: event.target.value })}
                                        placeholder="Enter your question here..."
                                        className="min-h-14 resize-none rounded-xl border-slate-100 px-3 py-2 text-sm font-semibold leading-relaxed shadow-none focus:ring-primary/20"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                        Image <span className="lowercase font-medium text-slate-300">(optional)</span>
                                    </Label>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <label className={`flex items-center gap-2 h-9 px-3 rounded-xl border cursor-pointer transition-all text-[10px] font-black uppercase tracking-wider ${question.imageUrl ? 'border-slate-200 bg-white text-slate-500 hover:border-slate-300' : 'border-dashed border-slate-200 bg-slate-50/50 text-slate-400 hover:bg-slate-50 hover:border-slate-300'}`}>
                                            <ImagePlus size={13} />
                                            {question.imageUrl ? 'Replace' : 'Upload Image'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(event) => { void handleImportPreviewImageUpload(question.id, event); }}
                                                className="hidden"
                                            />
                                        </label>
                                        {question.imageUrl && (
                                            <button
                                                type="button"
                                                className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
                                                onClick={() => updateImportPreviewQuestion(question.id, { imageUrl: '' })}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    {question.imageUrl && (
                                        <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-2">
                                            <img
                                                src={question.imageUrl}
                                                alt="Imported question attachment"
                                                className="max-h-48 w-auto max-w-full rounded-lg border border-slate-100 object-contain bg-white"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Options</Label>
                                    </div>
                                    <RadioGroup
                                        value={question.correctOption.toString()}
                                        onValueChange={(value) => updateImportPreviewQuestion(question.id, { correctOption: parseInt(value) })}
                                        className="grid grid-cols-1 md:grid-cols-2 gap-2"
                                    >
                                        {OPTION_DISPLAY_ORDER.map((optionIndex) => (
                                            <div
                                                key={`${question.id}-${optionIndex}`}
                                                className={`flex items-start gap-2.5 rounded-xl border p-2.5 transition-all ${question.correctOption === optionIndex
                                                    ? 'bg-emerald-50/60 border-emerald-200 ring-1 ring-emerald-100'
                                                    : 'bg-white border-slate-100 hover:border-primary/20'
                                                    }`}
                                            >
                                                <RadioGroupItem
                                                    value={optionIndex.toString()}
                                                    id={`import-q-${question.id}-opt-${optionIndex}`}
                                                    className="mt-1 shrink-0 border-slate-300 text-emerald-500 focus:ring-emerald-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <label
                                                        htmlFor={`import-q-${question.id}-opt-${optionIndex}`}
                                                        className={`text-[9px] font-black uppercase tracking-widest block mb-0.5 ${question.correctOption === optionIndex ? 'text-emerald-600' : 'text-slate-300'}`}
                                                    >
                                                        {String.fromCharCode(65 + optionIndex)}{question.correctOption === optionIndex && ' · Correct'}
                                                    </label>
                                                    <AutoGrowTextarea
                                                        value={question.options[optionIndex] || ''}
                                                        rows={1}
                                                        onChange={(event) => {
                                                            const nextOptions = [...question.options];
                                                            nextOptions[optionIndex] = event.target.value;
                                                            updateImportPreviewQuestion(question.id, { options: nextOptions });
                                                        }}
                                                        placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                                        className={`min-h-0 w-full resize-none border-none bg-transparent p-0 text-sm font-semibold leading-5 focus:ring-0 ${question.correctOption === optionIndex ? 'text-slate-900' : 'text-slate-500'}`}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Rationale <span className="lowercase font-medium text-slate-300">(optional)</span></Label>
                                    <AutoGrowTextarea
                                        value={question.rationale}
                                        onChange={(event) => updateImportPreviewQuestion(question.id, { rationale: event.target.value })}
                                        placeholder="Explain why this is the correct answer..."
                                        className="min-h-12 resize-none rounded-xl border-slate-100 bg-slate-50/40 px-3 py-2 text-xs font-medium leading-relaxed shadow-none focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsImportPreviewOpen(false);
                                setImportPreviewQuestions([]);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="button" onClick={applyImportedQuestions}>
                            Add to Current Section
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Move Question Dialog ── */}
            <Dialog open={Boolean(moveQuestionTarget)} onOpenChange={(open) => { if (!open) closeMoveQuestionDialog(); }}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Move Question</DialogTitle>
                        <DialogDescription>
                            Choose where to place this question, or create a new section for it.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Existing Section</Label>
                            <Select value={moveTargetSection} onValueChange={setMoveTargetSection}>
                                <SelectTrigger className="h-10 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 text-sm font-semibold">
                                    <SelectValue placeholder="Choose section" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sections.map((section) => (
                                        <SelectItem key={section} value={section}>{section}</SelectItem>
                                    ))}
                                    <SelectItem value={NEW_SECTION_OPTION}>Create a new section below</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Or Add New Section</Label>
                            <Input
                                value={moveTargetNewSection}
                                onChange={(e) => setMoveTargetNewSection(e.target.value)}
                                placeholder="Type a new section name"
                                className="h-10 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-semibold text-sm"
                            />
                            <p className="text-[10px] font-medium text-slate-400">
                                Rename the default Main section anytime, or type a new section name here to create one and move this question there.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={closeMoveQuestionDialog}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={confirmMoveQuestion}>
                            Move Question
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation ── */}
            <ConfirmDialog
                open={deleteQuestionId !== null}
                onOpenChange={(open) => { if (!open) setDeleteQuestionId(null); }}
                title="Delete Question"
                description="Are you sure you want to delete this question? This action cannot be undone."
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={confirmDeleteQuestion}
            />

            {/* ── Publish Confirmation ── */}
            <ConfirmDialog
                open={publishConfirmOpen}
                onOpenChange={setPublishConfirmOpen}
                title="Publish Exam"
                description="Once published, this exam can no longer be edited. Do you want to continue?"
                confirmLabel="Publish"
                cancelLabel="Cancel"
                variant="default"
                isLoading={isSubmitting}
                onConfirm={() => {
                    setPublishConfirmOpen(false);
                    void doSubmit(true);
                }}
            />
        </div>
    );
};

export default CreateExamPage;
