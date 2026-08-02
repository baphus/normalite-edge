import React, { useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Copy,
    GripVertical,
    ImagePlus,
    MessageSquarePlus,
    MoreHorizontal,
    MoveRight,
    Trash2,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AutoGrowTextarea } from './AutoGrowTextarea';
import { getQuestionIssues, OPTION_LETTERS, type EditableQuestion } from './types';
import { cn } from '@/lib/utils';

export interface QuestionRowProps {
    question: EditableQuestion;
    /** Position within the currently visible list, used for the Q-number. */
    index: number;
    total: number;
    expanded: boolean;
    onToggleExpand: () => void;
    onUpdate: (questionId: string, updates: Partial<EditableQuestion>) => void;
    onDelete: (questionId: string) => void;
    onDuplicate?: (question: EditableQuestion) => void;
    onMove: (questionId: string, direction: 'up' | 'down') => void;
    onMoveToSection?: (question: EditableQuestion) => void;
    onImageUpload: (questionId: string, event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export const QuestionRow: React.FC<QuestionRowProps> = ({
    question,
    index,
    total,
    expanded,
    onToggleExpand,
    onUpdate,
    onDelete,
    onDuplicate,
    onMove,
    onMoveToSection,
    onImageUpload,
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: question.id,
    });
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const [showRationale, setShowRationale] = useState(Boolean(question.rationale));

    const issues = getQuestionIssues(question);
    const isComplete = issues.length === 0;
    const correctLetter = OPTION_LETTERS[question.correctOption] ?? '—';
    const summaryText = question.text.trim() || 'Untitled question';

    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <li
            ref={setNodeRef}
            style={style}
            className={cn(
                'overflow-hidden rounded-lg border bg-white transition-colors',
                isDragging ? 'border-primary/40 opacity-70 shadow-lg' : 'border-slate-200',
                expanded && 'border-primary/30',
            )}
        >
            {/* Collapsed summary — always visible, doubles as the expand control */}
            <div className="flex items-center gap-2 px-2 py-1.5">
                <button
                    type="button"
                    className="cursor-grab touch-none rounded p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:cursor-grabbing"
                    aria-label={`Reorder question ${index + 1}`}
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical size={14} aria-hidden="true" />
                </button>

                <button
                    type="button"
                    onClick={onToggleExpand}
                    aria-expanded={expanded}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded py-0.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                    <span className="inline-flex h-5 min-w-[1.75rem] shrink-0 items-center justify-center rounded bg-slate-100 px-1 text-[11px] font-semibold tabular-nums text-slate-500">
                        {index + 1}
                    </span>
                    <span
                        className={cn(
                            'min-w-0 flex-1 truncate text-[13px]',
                            question.text.trim() ? 'text-slate-700' : 'italic text-slate-400',
                        )}
                    >
                        {summaryText}
                    </span>
                    <span className="shrink-0 text-[12px] font-semibold tabular-nums text-slate-500">
                        {isComplete ? correctLetter : '—'}
                    </span>
                    {isComplete ? (
                        <CheckCircle2 size={14} className="shrink-0 text-emerald-500" aria-label="Complete" />
                    ) : (
                        <span
                            className="inline-flex shrink-0 items-center gap-1 text-amber-600"
                            title={issues.map((issue) => issue.message).join('; ')}
                        >
                            <AlertCircle size={14} aria-hidden="true" />
                            <span className="sr-only">Incomplete: {issues.map((i) => i.message).join('; ')}</span>
                        </span>
                    )}
                    <ChevronDown
                        size={14}
                        aria-hidden="true"
                        className={cn('shrink-0 text-slate-300 transition-transform', expanded && 'rotate-180')}
                    />
                </button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 rounded text-slate-400 hover:text-slate-700"
                            aria-label={`Actions for question ${index + 1}`}
                        >
                            <MoreHorizontal size={15} aria-hidden="true" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-lg">
                        <DropdownMenuItem
                            disabled={index === 0}
                            onClick={() => onMove(question.id, 'up')}
                            className="gap-2 text-[12px] font-semibold"
                        >
                            <ChevronUp size={13} aria-hidden="true" /> Move up
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            disabled={index === total - 1}
                            onClick={() => onMove(question.id, 'down')}
                            className="gap-2 text-[12px] font-semibold"
                        >
                            <ChevronDown size={13} aria-hidden="true" /> Move down
                        </DropdownMenuItem>
                        {onDuplicate && (
                            <DropdownMenuItem
                                onClick={() => onDuplicate(question)}
                                className="gap-2 text-[12px] font-semibold"
                            >
                                <Copy size={13} aria-hidden="true" /> Duplicate
                            </DropdownMenuItem>
                        )}
                        {onMoveToSection && (
                            <DropdownMenuItem
                                onClick={() => onMoveToSection(question)}
                                className="gap-2 text-[12px] font-semibold"
                            >
                                <MoveRight size={13} aria-hidden="true" /> Move to section
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => onDelete(question.id)}
                            className="gap-2 text-[12px] font-semibold text-red-600 focus:bg-red-50 focus:text-red-600"
                        >
                            <Trash2 size={13} aria-hidden="true" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Expanded editor */}
            {expanded && (
                <div className="space-y-3 border-t border-slate-100 px-3 py-3">
                    <div className="space-y-1.5">
                        <label
                            htmlFor={`question-${question.id}-text`}
                            className="block text-[12px] font-medium text-slate-600"
                        >
                            Question
                        </label>
                        <AutoGrowTextarea
                            id={`question-${question.id}-text`}
                            value={question.text}
                            onChange={(event) => onUpdate(question.id, { text: event.target.value })}
                            placeholder="Enter your question here…"
                            className="min-h-[3rem] resize-none rounded-lg border-slate-200 bg-white px-3 py-2 text-[13px] leading-relaxed shadow-none focus:border-primary/30 focus:ring-primary/20"
                        />
                    </div>

                    <fieldset className="space-y-1.5">
                        <legend className="mb-1.5 text-[12px] font-medium text-slate-600">
                            Answer choices{' '}
                            <span className="font-normal text-slate-400">— select the correct one</span>
                        </legend>
                        <RadioGroup
                            value={String(question.correctOption)}
                            onValueChange={(value) => onUpdate(question.id, { correctOption: parseInt(value, 10) })}
                            className="space-y-1.5"
                        >
                            {question.options.map((option, optionIndex) => {
                                const isCorrect = question.correctOption === optionIndex;
                                return (
                                    <div
                                        key={optionIndex}
                                        className={cn(
                                            'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors',
                                            isCorrect
                                                ? 'border-emerald-200 bg-emerald-50/50'
                                                : 'border-slate-200 bg-white hover:border-slate-300',
                                        )}
                                    >
                                        <RadioGroupItem
                                            value={String(optionIndex)}
                                            id={`question-${question.id}-option-${optionIndex}`}
                                            aria-label={`Mark option ${OPTION_LETTERS[optionIndex]} as correct`}
                                            className={cn(
                                                'shrink-0',
                                                isCorrect
                                                    ? 'border-emerald-500 text-emerald-600'
                                                    : 'border-slate-300 text-slate-300',
                                            )}
                                        />
                                        <span
                                            className={cn(
                                                'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-semibold',
                                                isCorrect
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-slate-100 text-slate-400',
                                            )}
                                            aria-hidden="true"
                                        >
                                            {OPTION_LETTERS[optionIndex]}
                                        </span>
                                        <AutoGrowTextarea
                                            rows={1}
                                            value={option}
                                            aria-label={`Option ${OPTION_LETTERS[optionIndex]}`}
                                            onChange={(event) => {
                                                const nextOptions = [...question.options];
                                                nextOptions[optionIndex] = event.target.value;
                                                onUpdate(question.id, { options: nextOptions });
                                            }}
                                            placeholder={`Option ${OPTION_LETTERS[optionIndex]}`}
                                            className="min-h-0 w-full resize-none border-none bg-transparent p-0 text-[13px] leading-5 shadow-none focus:ring-0"
                                        />
                                    </div>
                                );
                            })}
                        </RadioGroup>
                    </fieldset>

                    {/* Image — only rendered once asked for, instead of a permanent dropzone */}
                    {question.imageUrl ? (
                        <div className="space-y-1.5">
                            <span className="block text-[12px] font-medium text-slate-600">Image</span>
                            <div className="relative rounded-lg border border-slate-200 bg-slate-50/50 p-2">
                                <img
                                    src={question.imageUrl}
                                    alt="Question attachment"
                                    className="mx-auto max-h-40 w-auto max-w-full rounded object-contain"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    aria-label="Remove image"
                                    className="absolute right-2 top-2 h-6 w-6 rounded border-slate-200 bg-white text-slate-400 hover:text-red-600"
                                    onClick={() => onUpdate(question.id, { imageUrl: '' })}
                                >
                                    <X size={12} aria-hidden="true" />
                                </Button>
                            </div>
                        </div>
                    ) : null}

                    {showRationale && (
                        <div className="space-y-1.5">
                            <label
                                htmlFor={`question-${question.id}-rationale`}
                                className="block text-[12px] font-medium text-slate-600"
                            >
                                Rationale <span className="font-normal text-slate-400">(optional)</span>
                            </label>
                            <AutoGrowTextarea
                                id={`question-${question.id}-rationale`}
                                value={question.rationale}
                                onChange={(event) => onUpdate(question.id, { rationale: event.target.value })}
                                placeholder="Explain why this answer is correct…"
                                className="min-h-[2.5rem] resize-none rounded-lg border-slate-200 bg-white px-3 py-2 text-[13px] leading-relaxed shadow-none focus:border-primary/30 focus:ring-primary/20"
                            />
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                                void onImageUpload(question.id, event);
                            }}
                        />
                        {!question.imageUrl && (
                            <Button
                                type="button"
                                variant="outline"
                                className="h-7 gap-1.5 rounded-lg border-slate-200 px-2.5 text-[12px] font-medium text-slate-500"
                                onClick={() => imageInputRef.current?.click()}
                            >
                                <ImagePlus size={12} aria-hidden="true" /> Add image
                            </Button>
                        )}
                        {!showRationale && (
                            <Button
                                type="button"
                                variant="outline"
                                className="h-7 gap-1.5 rounded-lg border-slate-200 px-2.5 text-[12px] font-medium text-slate-500"
                                onClick={() => setShowRationale(true)}
                            >
                                <MessageSquarePlus size={12} aria-hidden="true" /> Add rationale
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </li>
    );
};

export default QuestionRow;
