import React from 'react';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { AlertCircle, ListChecks, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionRow } from './QuestionRow';
import type { EditableQuestion } from './types';

interface QuestionListEditorProps {
    /** The questions currently visible — the parent owns section/incomplete filtering. */
    questions: EditableQuestion[];
    totalCount: number;
    incompleteCount: number;

    showOnlyIncomplete: boolean;
    onToggleShowOnlyIncomplete: (value: boolean) => void;

    expandedId: string | null;
    onExpandedChange: (questionId: string | null) => void;

    onUpdate: (questionId: string, updates: Partial<EditableQuestion>) => void;
    onDelete: (questionId: string) => void;
    onDuplicate?: (question: EditableQuestion) => void;
    onMove: (questionId: string, direction: 'up' | 'down') => void;
    onMoveToSection?: (question: EditableQuestion) => void;
    onImageUpload: (questionId: string, event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    onAdd: () => void;
    onReorder: (activeId: string, overId: string) => void;

    /** Import / template controls, owned by the page. */
    toolbarActions?: React.ReactNode;
    /** Section tab strip, exam editor only. */
    sectionTabs?: React.ReactNode;

    emptyTitle: string;
    emptyDescription: string;
}

export const QuestionListEditor: React.FC<QuestionListEditorProps> = ({
    questions,
    totalCount,
    incompleteCount,
    showOnlyIncomplete,
    onToggleShowOnlyIncomplete,
    expandedId,
    onExpandedChange,
    onUpdate,
    onDelete,
    onDuplicate,
    onMove,
    onMoveToSection,
    onImageUpload,
    onAdd,
    onReorder,
    toolbarActions,
    sectionTabs,
    emptyTitle,
    emptyDescription,
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            onReorder(String(active.id), String(over.id));
        }
    };

    return (
        <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                        Questions
                    </h2>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-500">
                        {totalCount}
                    </span>
                    {incompleteCount > 0 && (
                        <button
                            type="button"
                            aria-pressed={showOnlyIncomplete}
                            onClick={() => onToggleShowOnlyIncomplete(!showOnlyIncomplete)}
                            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                showOnlyIncomplete
                                    ? 'border-amber-300 bg-amber-100 text-amber-800'
                                    : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            }`}
                        >
                            <AlertCircle size={11} aria-hidden="true" />
                            {incompleteCount} incomplete
                        </button>
                    )}
                </div>
                {toolbarActions && <div className="flex items-center gap-1.5">{toolbarActions}</div>}
            </div>

            {sectionTabs}

            {questions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/40 px-6 py-10 text-center">
                    <ListChecks size={20} className="mx-auto mb-2 text-slate-300" aria-hidden="true" />
                    <p className="text-[13px] font-semibold text-slate-700">
                        {showOnlyIncomplete ? 'No incomplete questions' : emptyTitle}
                    </p>
                    <p className="mt-1 text-[12px] text-slate-500">
                        {showOnlyIncomplete
                            ? 'Every question in this view is complete.'
                            : emptyDescription}
                    </p>
                    {showOnlyIncomplete ? (
                        <Button
                            variant="outline"
                            className="mt-3 h-8 rounded-lg border-slate-200 text-[12px] font-semibold"
                            onClick={() => onToggleShowOnlyIncomplete(false)}
                        >
                            Show all questions
                        </Button>
                    ) : (
                        <Button
                            className="mt-3 h-8 gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary/90"
                            onClick={onAdd}
                        >
                            <Plus size={13} aria-hidden="true" /> Add question
                        </Button>
                    )}
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext
                        items={questions.map((question) => question.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <ul className="space-y-1.5">
                            {questions.map((question, index) => (
                                <QuestionRow
                                    key={question.id}
                                    question={question}
                                    index={index}
                                    total={questions.length}
                                    expanded={expandedId === question.id}
                                    onToggleExpand={() =>
                                        onExpandedChange(expandedId === question.id ? null : question.id)
                                    }
                                    onUpdate={onUpdate}
                                    onDelete={onDelete}
                                    onDuplicate={onDuplicate}
                                    onMove={onMove}
                                    onMoveToSection={onMoveToSection}
                                    onImageUpload={onImageUpload}
                                />
                            ))}
                        </ul>
                    </SortableContext>
                </DndContext>
            )}

            {questions.length > 0 && (
                <button
                    type="button"
                    onClick={onAdd}
                    className="group flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 py-2.5 text-slate-400 transition-colors hover:border-primary/40 hover:bg-primary/[0.03] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                    <Plus size={14} aria-hidden="true" />
                    <span className="text-[12px] font-semibold">Add question</span>
                </button>
            )}
        </div>
    );
};

export default QuestionListEditor;
