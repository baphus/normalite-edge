import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileJson, FileUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CategorySelect } from '@/components/CategorySelect';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { arrayMove } from '@dnd-kit/sortable';
import { EditorShell, FieldLabel, SettingsCard, SettingsSection } from '@/components/editor/EditorShell';
import { QuestionListEditor } from '@/components/editor/QuestionListEditor';
import { QuestionRow } from '@/components/editor/QuestionRow';
import { PublishReadiness } from '@/components/editor/PublishReadiness';
import { StatusPill } from '@/components/manage/StatusPill';
import {
    createEmptyQuestion,
    getIncompleteQuestions,
    isQuestionBlank,
    OPTION_LETTERS,
    type EditableQuestion,
} from '@/components/editor/types';
import {
    downloadQuestionTemplate,
    parseQuestionFile,
    QuestionImportError,
} from '@/lib/importQuestions';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import { uploadQuestionImageFromEvent } from '@/lib/questionImage';
import { toast } from 'sonner';

interface TrackOption {
    id: string;
    name: string;
    code?: string | null;
}

interface DeckQuestionApi {
    id: string;
    orderNo?: number;
    questionText?: string;
    imageUrl?: string;
    choiceA?: string;
    choiceB?: string;
    choiceC?: string;
    choiceD?: string;
    correctChoice?: string;
    rationalization?: string;
}

interface DeckApi {
    id: string;
    title: string;
    description?: string | null;
    subject?: string | null;
    categoryCode?: string | null;
    trackIds?: string[];
    visibility?: 'DRAFT' | 'PUBLISHED';
    questions?: DeckQuestionApi[];
}

const ExcelTemplateIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
        <rect x="3" y="4" width="8" height="16" rx="1.5" fill="#107C41" />
        <path d="M6.2 9L7.9 12L6.2 15H7.8L8.8 13.1L9.8 15H11.4L9.7 12L11.4 9H9.8L8.8 10.9L7.8 9H6.2Z" fill="white" />
        <path d="M10 6.5C10 5.67157 10.6716 5 11.5 5H18.5C19.3284 5 20 5.67157 20 6.5V17.5C20 18.3284 19.3284 19 18.5 19H11.5C10.6716 19 10 18.3284 10 17.5V6.5Z" fill="#33C481" />
        <path d="M12.5 8H17.5M12.5 11H17.5M12.5 14H17.5M12.5 17H17.5" stroke="white" strokeWidth="1.25" strokeLinecap="round" opacity="0.95" />
    </svg>
);

const DeckEditorPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);
    const { user } = useAuth();
    const isAdminOrReviewer = user?.role === 'ADMIN' || user?.role === 'REVIEWER';

    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const [tracks, setTracks] = useState<TrackOption[]>([]);
    const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
    const [deckVisibility, setDeckVisibility] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingDeck, setIsLoadingDeck] = useState(Boolean(id));

    const [questions, setQuestions] = useState<EditableQuestion[]>([createEmptyQuestion('1')]);
    const [expandedId, setExpandedId] = useState<string | null>('1');
    const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);

    const importFileRef = useRef<HTMLInputElement | null>(null);
    const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
    const [importPreview, setImportPreview] = useState<EditableQuestion[]>([]);
    const [importExpandedId, setImportExpandedId] = useState<string | null>(null);

    // ── Dirty tracking ───────────────────────────────────────────────────────
    const snapshot = useMemo(
        () => JSON.stringify({ title, subject, description, category, selectedTrackIds, questions }),
        [title, subject, description, category, selectedTrackIds, questions],
    );
    const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
    const isDirty = savedSnapshot !== null && snapshot !== savedSnapshot;

    // Capture the clean baseline the moment loading settles — during render, so the
    // form is never briefly reported as dirty before the effect would have run.
    if (!isLoadingDeck && savedSnapshot === null) {
        setSavedSnapshot(snapshot);
    }

    useEffect(() => {
        api.get('/tracks')
            .then((response) => setTracks(response.data?.data || []))
            .catch((error) => console.error('Failed to load tracks', error));
    }, []);

    useEffect(() => {
        if (!isEditing || !id) return;

        const fetchDeck = async () => {
            setIsLoadingDeck(true);
            try {
                const response = await api.get(`/decks/${id}?questions=true`);
                const deck = (response.data?.data || null) as DeckApi | null;

                if (!deck) {
                    toast.error('Study material not found.');
                    navigate('/materials');
                    return;
                }

                setTitle(deck.title || '');
                setSubject(deck.subject || '');
                setDescription(deck.description || '');
                setCategory(deck.categoryCode || null);
                setSelectedTrackIds(deck.trackIds || []);
                setDeckVisibility(deck.visibility === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT');

                const mapped = (deck.questions || [])
                    .slice()
                    .sort((first, second) => (first.orderNo || 0) - (second.orderNo || 0))
                    .map((question, index) => {
                        const correctIndex = OPTION_LETTERS.indexOf(
                            (question.correctChoice || 'A').toUpperCase(),
                        );
                        return {
                            id: question.id || `${Date.now()}-${index}`,
                            text: question.questionText || '',
                            options: [
                                question.choiceA || '',
                                question.choiceB || '',
                                question.choiceC || '',
                                question.choiceD || '',
                            ],
                            correctOption: correctIndex >= 0 ? correctIndex : 0,
                            rationale: question.rationalization || '',
                            imageUrl: question.imageUrl || '',
                        } satisfies EditableQuestion;
                    });

                setQuestions(mapped.length > 0 ? mapped : [createEmptyQuestion('1')]);
                setExpandedId(null);
            } catch (error) {
                console.error('Failed to load deck for editing', error);
                toast.error('Failed to load study material details.');
                navigate('/materials');
            } finally {
                setIsLoadingDeck(false);
            }
        };

        void fetchDeck();
    }, [id, isEditing, navigate]);

    // ── Question operations ──────────────────────────────────────────────────
    const updateQuestion = useCallback((questionId: string, updates: Partial<EditableQuestion>) => {
        setQuestions((prev) =>
            prev.map((question) => (question.id === questionId ? { ...question, ...updates } : question)),
        );
    }, []);

    const addQuestion = useCallback(() => {
        const newQuestion = createEmptyQuestion(`${Date.now()}`);
        setQuestions((prev) => [...prev, newQuestion]);
        setExpandedId(newQuestion.id);
        setShowOnlyIncomplete(false);
    }, []);

    const deleteQuestion = useCallback((questionId: string) => {
        setQuestions((prev) => (prev.length > 1 ? prev.filter((q) => q.id !== questionId) : prev));
        setExpandedId((current) => (current === questionId ? null : current));
    }, []);

    const duplicateQuestion = useCallback((question: EditableQuestion) => {
        const copy = { ...question, id: `${Date.now()}` };
        setQuestions((prev) => {
            const index = prev.findIndex((candidate) => candidate.id === question.id);
            const next = [...prev];
            next.splice(index + 1, 0, copy);
            return next;
        });
        setExpandedId(copy.id);
    }, []);

    const moveQuestion = useCallback((questionId: string, direction: 'up' | 'down') => {
        setQuestions((prev) => {
            const currentIndex = prev.findIndex((question) => question.id === questionId);
            if (currentIndex < 0) return prev;
            const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
            if (targetIndex < 0 || targetIndex >= prev.length) return prev;
            return arrayMove(prev, currentIndex, targetIndex);
        });
    }, []);

    const reorderQuestions = useCallback((activeId: string, overId: string) => {
        setQuestions((prev) => {
            const from = prev.findIndex((question) => question.id === activeId);
            const to = prev.findIndex((question) => question.id === overId);
            if (from < 0 || to < 0) return prev;
            return arrayMove(prev, from, to);
        });
    }, []);

    const handleQuestionImageUpload = useCallback(
        async (questionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
            const secureUrl = await uploadQuestionImageFromEvent(event);
            if (secureUrl) updateQuestion(questionId, { imageUrl: secureUrl });
        },
        [updateQuestion],
    );

    const handleImportPreviewImageUpload = useCallback(
        async (questionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
            const secureUrl = await uploadQuestionImageFromEvent(event);
            if (!secureUrl) return;
            setImportPreview((prev) =>
                prev.map((question) =>
                    question.id === questionId ? { ...question, imageUrl: secureUrl } : question,
                ),
            );
        },
        [],
    );

    // ── Import ───────────────────────────────────────────────────────────────
    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        try {
            const parsed = await parseQuestionFile(file);
            setImportPreview(parsed);
            setImportExpandedId(null);
            setIsImportPreviewOpen(true);
        } catch (error) {
            if (error instanceof QuestionImportError) {
                toast.error(error.message);
                return;
            }
            console.error('Failed to parse import file', error);
            toast.error('Error parsing file. Please check the template format and try again.');
        }
    };

    const applyImportedQuestions = () => {
        if (importPreview.length === 0) {
            setIsImportPreviewOpen(false);
            return;
        }
        // Drop the untouched starter row so an import does not leave a blank question behind.
        setQuestions((prev) => {
            const base = prev.length === 1 && isQuestionBlank(prev[0]) ? [] : prev;
            return [...base, ...importPreview];
        });
        setIsImportPreviewOpen(false);
        toast.success(`Successfully imported ${importPreview.length} question(s).`);
        setImportPreview([]);
    };

    // ── Validation ───────────────────────────────────────────────────────────
    const incompleteQuestions = useMemo(() => getIncompleteQuestions(questions), [questions]);
    const questionsWithContent = useMemo(
        () => questions.filter((question) => !isQuestionBlank(question)),
        [questions],
    );

    const blockers = useMemo(() => {
        const list: string[] = [];
        if (!title.trim()) list.push('Material title is required');
        if (questionsWithContent.length === 0) list.push('Add at least one question');
        if (incompleteQuestions.length > 0) {
            list.push(`${incompleteQuestions.length} question${incompleteQuestions.length === 1 ? '' : 's'} incomplete`);
        }
        return list;
    }, [title, questionsWithContent.length, incompleteQuestions.length]);

    // ── Submit ───────────────────────────────────────────────────────────────
    const doSubmit = async (publish: boolean) => {
        if (!title.trim()) {
            toast.error('Please enter a deck title.');
            return;
        }
        if (questionsWithContent.length === 0) {
            toast.error('Please add at least one question to the deck.');
            return;
        }
        if (incompleteQuestions.length > 0) {
            toast.error(
                `${incompleteQuestions.length} question(s) are incomplete. Use the "incomplete" filter to find them.`,
            );
            setShowOnlyIncomplete(true);
            return;
        }

        const nextVisibility: 'DRAFT' | 'PUBLISHED' = publish ? 'PUBLISHED' : 'DRAFT';

        const payload = {
            title: title.trim(),
            subject: subject.trim() || undefined,
            description: description.trim() || undefined,
            categoryId: category,
            visibility: nextVisibility,
            trackIds: selectedTrackIds,
            questions: questionsWithContent.map((question, index) => ({
                orderNo: index + 1,
                questionText: question.text.trim(),
                imageUrl: question.imageUrl?.trim() || undefined,
                choiceA: question.options[0]?.trim(),
                choiceB: question.options[1]?.trim(),
                choiceC: question.options[2]?.trim(),
                choiceD: question.options[3]?.trim(),
                correctChoice: OPTION_LETTERS[question.correctOption],
                rationalization: question.rationale.trim() || undefined,
            })),
        };

        setIsSubmitting(true);
        try {
            if (isEditing && id) {
                await api.put(`/decks/${id}`, payload);
                setDeckVisibility(nextVisibility);
                toast.success(
                    nextVisibility === 'PUBLISHED'
                        ? 'Study material updated and published.'
                        : 'Study material draft updated.',
                );
            } else {
                await api.post('/decks', payload);
                toast.success(
                    nextVisibility === 'PUBLISHED'
                        ? 'Study material published successfully.'
                        : 'Study material saved as draft.',
                );
            }
            setSavedSnapshot(snapshot);
            navigate('/materials');
        } catch (error: any) {
            console.error('Failed to save deck:', error);
            toast.error(error.response?.data?.message || 'Failed to save study material.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleTrack = (trackId: string) => {
        setSelectedTrackIds((prev) =>
            prev.includes(trackId) ? prev.filter((value) => value !== trackId) : [...prev, trackId],
        );
    };

    const visibleQuestions = showOnlyIncomplete ? incompleteQuestions : questions;

    if (isLoadingDeck) {
        return (
            <div className="flex min-h-60 items-center justify-center font-lexend">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-[12px] text-slate-500">Loading study material…</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <EditorShell
                breadcrumbLabel="Materials"
                breadcrumbTo="/materials"
                currentLabel={isEditing ? 'Edit deck' : 'New deck'}
                title={isEditing ? 'Edit study material' : 'Create study material'}
                description="Build a question deck for your reviewees. Drafts stay hidden until published."
                isDirty={isDirty}
                isSubmitting={isSubmitting}
                onDiscard={() => navigate('/materials')}
                onSaveDraft={() => void doSubmit(false)}
                onPublish={() => void doSubmit(true)}
                publishLabel={isEditing ? 'Save & publish' : 'Publish'}
                publishBlockedReason={blockers.length > 0 ? blockers.join('. ') : null}
                settings={
                    <div className="space-y-3">
                        <SettingsCard title="Deck settings">
                            <SettingsSection>
                                <div className="space-y-1.5">
                                    <FieldLabel htmlFor="deck-title">Material title</FieldLabel>
                                    <Input
                                        id="deck-title"
                                        value={title}
                                        onChange={(event) => setTitle(event.target.value)}
                                        placeholder="e.g. LET review — English terminology"
                                        className="h-9 rounded-lg border-slate-200 text-[13px] shadow-none focus:ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <FieldLabel htmlFor="deck-subject">Subject</FieldLabel>
                                    <Input
                                        id="deck-subject"
                                        value={subject}
                                        onChange={(event) => setSubject(event.target.value)}
                                        placeholder="e.g. English"
                                        className="h-9 rounded-lg border-slate-200 text-[13px] shadow-none focus:ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <FieldLabel>Category</FieldLabel>
                                    <CategorySelect value={category} onChange={setCategory} allowCreate />
                                </div>
                                {isEditing && (
                                    <div className="space-y-1.5">
                                        <FieldLabel>Current visibility</FieldLabel>
                                        <StatusPill
                                            tone={deckVisibility === 'PUBLISHED' ? 'live' : 'draft'}
                                            label={deckVisibility === 'PUBLISHED' ? 'Published' : 'Draft'}
                                        />
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <FieldLabel htmlFor="deck-description">
                                        Description <span className="text-slate-400">(optional)</span>
                                    </FieldLabel>
                                    <Textarea
                                        id="deck-description"
                                        value={description}
                                        onChange={(event) => setDescription(event.target.value)}
                                        placeholder="What is this deck about?"
                                        className="min-h-16 resize-none rounded-lg border-slate-200 text-[13px] leading-relaxed shadow-none focus:ring-primary/20"
                                    />
                                </div>
                            </SettingsSection>

                            {isAdminOrReviewer && (
                                <SettingsSection label="Visible to">
                                    <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                                        <label
                                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${
                                                selectedTrackIds.length === 0
                                                    ? 'border-primary/30 bg-primary/5'
                                                    : 'border-slate-200 bg-white hover:bg-slate-50'
                                            }`}
                                        >
                                            <Checkbox
                                                checked={selectedTrackIds.length === 0}
                                                onCheckedChange={() => setSelectedTrackIds([])}
                                                className="h-3.5 w-3.5 rounded border-slate-300 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                                            />
                                            <span className="text-[12px] font-medium text-slate-700">All programs</span>
                                        </label>
                                        {tracks.map((track) => (
                                            <label
                                                key={track.id}
                                                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${
                                                    selectedTrackIds.includes(track.id)
                                                        ? 'border-primary/30 bg-primary/5'
                                                        : 'border-slate-200 bg-white hover:bg-slate-50'
                                                }`}
                                            >
                                                <Checkbox
                                                    checked={selectedTrackIds.includes(track.id)}
                                                    onCheckedChange={() => toggleTrack(track.id)}
                                                    className="h-3.5 w-3.5 rounded border-slate-300 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                                                />
                                                <span className="text-[12px] font-medium text-slate-700">
                                                    {track.name}
                                                    {track.code && (
                                                        <span className="ml-1 font-normal text-slate-400">
                                                            ({track.code})
                                                        </span>
                                                    )}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </SettingsSection>
                            )}
                        </SettingsCard>

                        <PublishReadiness
                            readyCount={questionsWithContent.length - incompleteQuestions.length}
                            totalCount={questionsWithContent.length}
                            blockers={blockers}
                            onShowIncomplete={
                                incompleteQuestions.length > 0 ? () => setShowOnlyIncomplete(true) : undefined
                            }
                        />
                    </div>
                }
            >
                <QuestionListEditor
                    questions={visibleQuestions}
                    totalCount={questions.length}
                    incompleteCount={incompleteQuestions.length}
                    showOnlyIncomplete={showOnlyIncomplete}
                    onToggleShowOnlyIncomplete={setShowOnlyIncomplete}
                    expandedId={expandedId}
                    onExpandedChange={setExpandedId}
                    onUpdate={updateQuestion}
                    onDelete={deleteQuestion}
                    onDuplicate={duplicateQuestion}
                    onMove={moveQuestion}
                    onImageUpload={handleQuestionImageUpload}
                    onAdd={addQuestion}
                    onReorder={reorderQuestions}
                    emptyTitle="No questions yet"
                    emptyDescription="Add questions manually or import them from a file."
                    toolbarActions={
                        <>
                            <input
                                ref={importFileRef}
                                type="file"
                                accept=".csv,.json,application/json,text/csv"
                                onChange={handleImport}
                                className="hidden"
                            />
                            <Button
                                variant="outline"
                                className="h-7 gap-1.5 rounded-lg border-slate-200 bg-white px-2.5 text-[12px] font-medium"
                                onClick={() => importFileRef.current?.click()}
                            >
                                <FileUp size={12} aria-hidden="true" /> Import
                            </Button>
                            <Button
                                variant="outline"
                                className="h-7 gap-1.5 rounded-lg border-slate-200 bg-white px-2.5 text-[12px] font-medium"
                                onClick={() => downloadQuestionTemplate('csv', 'study-material-template')}
                            >
                                <ExcelTemplateIcon /> Template
                            </Button>
                            {user?.role === 'ADMIN' && (
                                <Button
                                    variant="outline"
                                    className="h-7 w-8 rounded-lg border-slate-200 bg-white px-0"
                                    aria-label="Download JSON template"
                                    onClick={() => downloadQuestionTemplate('json', 'study-material-template')}
                                >
                                    <FileJson size={13} aria-hidden="true" />
                                </Button>
                            )}
                        </>
                    }
                />
            </EditorShell>

            <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
                <DialogContent className="max-w-3xl rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-[15px]">Review imported questions</DialogTitle>
                        <DialogDescription className="text-[12px]">
                            {importPreview.length} question{importPreview.length === 1 ? '' : 's'} parsed. Review and
                            edit before adding them to this material.
                        </DialogDescription>
                    </DialogHeader>
                    <ul className="max-h-[55vh] space-y-1.5 overflow-y-auto pr-1">
                        {importPreview.map((question, index) => (
                            <QuestionRow
                                key={question.id}
                                question={question}
                                index={index}
                                total={importPreview.length}
                                expanded={importExpandedId === question.id}
                                onToggleExpand={() =>
                                    setImportExpandedId(importExpandedId === question.id ? null : question.id)
                                }
                                onUpdate={(questionId, updates) =>
                                    setImportPreview((prev) =>
                                        prev.map((candidate) =>
                                            candidate.id === questionId ? { ...candidate, ...updates } : candidate,
                                        ),
                                    )
                                }
                                onDelete={(questionId) =>
                                    setImportPreview((prev) => prev.filter((candidate) => candidate.id !== questionId))
                                }
                                onMove={(questionId, direction) =>
                                    setImportPreview((prev) => {
                                        const currentIndex = prev.findIndex((c) => c.id === questionId);
                                        const targetIndex =
                                            direction === 'up' ? currentIndex - 1 : currentIndex + 1;
                                        if (targetIndex < 0 || targetIndex >= prev.length) return prev;
                                        return arrayMove(prev, currentIndex, targetIndex);
                                    })
                                }
                                onImageUpload={handleImportPreviewImageUpload}
                                sortable={false}
                            />
                        ))}
                    </ul>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            className="h-8 rounded-lg border-slate-200 text-[12px] font-semibold"
                            onClick={() => setIsImportPreviewOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="h-8 gap-1.5 rounded-lg bg-primary text-[12px] font-semibold text-white hover:bg-primary/90"
                            onClick={applyImportedQuestions}
                            disabled={importPreview.length === 0}
                        >
                            <Plus size={13} aria-hidden="true" /> Add {importPreview.length} question
                            {importPreview.length === 1 ? '' : 's'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default DeckEditorPage;
