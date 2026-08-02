import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileJson, FileUp, Plus, Settings2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { CategorySelect } from '@/components/CategorySelect';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { arrayMove } from '@dnd-kit/sortable';
import { EditorShell, FieldLabel, SettingsCard, SettingsSection } from '@/components/editor/EditorShell';
import { QuestionListEditor } from '@/components/editor/QuestionListEditor';
import { QuestionRow } from '@/components/editor/QuestionRow';
import { PublishReadiness } from '@/components/editor/PublishReadiness';
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
import { uploadImageToCloudinary } from '@/lib/upload';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TrackOption {
    id: string;
    name: string;
    code?: string | null;
}

interface ExamQuestionApi {
    id: string;
    orderNo?: number;
    sectionId?: string;
    section?: { id?: string; title?: string };
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
    categoryCode?: string | null;
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

const EDITABLE_STATUS_OPTIONS: Array<{ value: EditableExamStatus; label: string }> = [
    { value: 'LIVE', label: 'Live' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'CLOSED', label: 'Closed' },
    { value: 'ARCHIVED', label: 'Archived' },
];

const DEFAULT_SECTION_TITLE = 'Main section';
const NEW_SECTION_OPTION = '__NEW_SECTION_OPTION__';
const PRESET_DURATIONS = [30, 60, 90, 120, 180, 240];

const normalizeSectionValue = (value?: string | null) => value?.trim() || DEFAULT_SECTION_TITLE;

const ExcelTemplateIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
        <rect x="3" y="4" width="8" height="16" rx="1.5" fill="#107C41" />
        <path d="M6.2 9L7.9 12L6.2 15H7.8L8.8 13.1L9.8 15H11.4L9.7 12L11.4 9H9.8L8.8 10.9L7.8 9H6.2Z" fill="white" />
        <path d="M10 6.5C10 5.67157 10.6716 5 11.5 5H18.5C19.3284 5 20 5.67157 20 6.5V17.5C20 18.3284 19.3284 19 18.5 19H11.5C10.6716 19 10 18.3284 10 17.5V6.5Z" fill="#33C481" />
        <path d="M12.5 8H17.5M12.5 11H17.5M12.5 14H17.5M12.5 17H17.5" stroke="white" strokeWidth="1.25" strokeLinecap="round" opacity="0.95" />
    </svg>
);

const CreateExamPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);
    const { user } = useAuth();

    // Form state
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState('');
    const [maxAttempts, setMaxAttempts] = useState('3');
    const [isCustomDuration, setIsCustomDuration] = useState(false);
    const [deadline, setDeadline] = useState('');
    const [showDeadline, setShowDeadline] = useState(false);
    const [closeOnDeadline, setCloseOnDeadline] = useState(false);
    const [examStatus, setExamStatus] = useState<EditableExamStatus>('DRAFT');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
    const [tracks, setTracks] = useState<TrackOption[]>([]);
    const [programs, setPrograms] = useState<string[]>(['All Programs']);
    const [allowMultipleAttemptsConfig, setAllowMultipleAttemptsConfig] = useState(false);

    // Sections
    const [sections, setSections] = useState<string[]>([DEFAULT_SECTION_TITLE]);
    const [activeSection, setActiveSection] = useState(DEFAULT_SECTION_TITLE);
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [renamingSection, setRenamingSection] = useState<string | null>(null);
    const [renamingSectionName, setRenamingSectionName] = useState('');

    // Questions
    const [questions, setQuestions] = useState<EditableQuestion[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
    const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
    const [moveQuestionTarget, setMoveQuestionTarget] = useState<EditableQuestion | null>(null);
    const [moveTargetSection, setMoveTargetSection] = useState<string>(DEFAULT_SECTION_TITLE);
    const [moveTargetNewSection, setMoveTargetNewSection] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingExam, setIsLoadingExam] = useState(Boolean(id));
    const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);

    const importFileRef = useRef<HTMLInputElement | null>(null);
    const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
    const [importPreview, setImportPreview] = useState<EditableQuestion[]>([]);
    const [importExpandedId, setImportExpandedId] = useState<string | null>(null);

    // ── Dirty tracking ───────────────────────────────────────────────────────
    const snapshot = useMemo(
        () =>
            JSON.stringify({
                title,
                duration,
                maxAttempts,
                deadline,
                closeOnDeadline,
                examStatus,
                description,
                category,
                selectedPrograms,
                sections,
                questions,
            }),
        [
            title,
            duration,
            maxAttempts,
            deadline,
            closeOnDeadline,
            examStatus,
            description,
            category,
            selectedPrograms,
            sections,
            questions,
        ],
    );
    const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
    const isDirty = savedSnapshot !== null && snapshot !== savedSnapshot;

    // Capture the clean baseline the moment loading settles — during render, so the
    // form is never briefly reported as dirty before the effect would have run.
    if (!isLoadingExam && savedSnapshot === null) {
        setSavedSnapshot(snapshot);
    }

    // ── Data loading ─────────────────────────────────────────────────────────
    useEffect(() => {
        api.get('/tracks')
            .then((response) => {
                const items = (response.data?.data || []) as TrackOption[];
                setTracks(items);
                setPrograms(['All Programs', ...items.map((track) => track.name)]);
            })
            .catch((error) => console.error('Failed to load tracks', error));
    }, []);

    useEffect(() => {
        api.get('/settings/system')
            .then((response) =>
                setAllowMultipleAttemptsConfig(Boolean(response.data?.data?.allowMultipleAttempts)),
            )
            .catch((error) => {
                console.error('Failed to load system settings', error);
                setAllowMultipleAttemptsConfig(false);
            });
    }, []);

    useEffect(() => {
        if (!isEditing || !id) return;

        const fetchExam = async () => {
            setIsLoadingExam(true);
            try {
                const response = await api.get(`/exams/${id}?questions=true`);
                const exam = response.data?.data as ExamApi;

                const loadedStatus = exam.status === 'PUBLISHED' ? 'LIVE' : exam.status;
                if (loadedStatus === 'LIVE') {
                    toast.error('Published exams cannot be edited.');
                    navigate(`/manage-exams/${id}/view`);
                    return;
                }

                setTitle(exam.title || '');
                setDescription(exam.description || '');
                setCategory(exam.categoryCode || null);

                const loadedDuration = String(exam.timeLimit || exam.timeLimitMinutes || 120);
                setDuration(loadedDuration);
                if (!PRESET_DURATIONS.includes(Number(loadedDuration))) setIsCustomDuration(true);

                setMaxAttempts(String(exam.maxAttempts ?? 3));
                setCloseOnDeadline(Boolean(exam.closeOnDeadline));

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
                    setQuestions(
                        apiQuestions
                            .slice()
                            .sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
                            .map((question, index) => {
                                const correctIndex = OPTION_LETTERS.indexOf(
                                    (question.correctChoice || 'A').toUpperCase(),
                                );
                                const resolvedSectionId = question.sectionId || question.section?.id || '';
                                const resolvedSectionTitle =
                                    question.section?.title || sectionMap.get(resolvedSectionId) || '';

                                return {
                                    id: question.id || `${Date.now()}-${index}`,
                                    text: question.questionText || '',
                                    imageUrl: question.imageUrl || '',
                                    options: [
                                        question.choiceA || '',
                                        question.choiceB || '',
                                        question.choiceC || '',
                                        question.choiceD || '',
                                    ],
                                    correctOption: correctIndex >= 0 ? correctIndex : 0,
                                    rationale: question.rationalization || '',
                                    section: normalizeSectionValue(resolvedSectionTitle),
                                } satisfies EditableQuestion;
                            }),
                    );
                }

                const fetchedSections = (exam.sections || [])
                    .slice()
                    .sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
                    .map((section) => normalizeSectionValue(section.title))
                    .filter(Boolean);

                const derivedSections = Array.from(
                    new Set(
                        apiQuestions.map((question) =>
                            normalizeSectionValue(
                                question.section?.title
                                || sectionMap.get(question.sectionId || question.section?.id || '')
                                || '',
                            ),
                        ),
                    ),
                ).filter(Boolean);

                const nextSections = fetchedSections.length > 0 ? fetchedSections : derivedSections;
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

        void fetchExam();
    }, [isEditing, id, navigate]);

    // ── Sections ─────────────────────────────────────────────────────────────
    const confirmAddSection = () => {
        const value = newSectionName.trim();
        if (!value) return;
        if (!sections.includes(value)) setSections((prev) => [...prev, value]);
        setActiveSection(value);
        setNewSectionName('');
        setIsAddingSection(false);
    };

    const removeSection = (section: string) => {
        if (sections.length <= 1) {
            toast.error('The exam must keep at least one section.');
            return;
        }
        const remaining = sections.filter((candidate) => candidate !== section);
        setSections(remaining);
        setQuestions((prev) =>
            prev.map((question) =>
                normalizeSectionValue(question.section) === section
                    ? { ...question, section: remaining[0] || DEFAULT_SECTION_TITLE }
                    : question,
            ),
        );
        if (activeSection === section) setActiveSection(remaining[0] || DEFAULT_SECTION_TITLE);
    };

    const confirmRenameSection = () => {
        if (!renamingSection) return;
        const nextName = renamingSectionName.trim();
        if (!nextName) {
            toast.error('Section name is required.');
            return;
        }
        if (nextName !== renamingSection && sections.includes(nextName)) {
            toast.error('That section name already exists.');
            return;
        }
        setSections((prev) => prev.map((section) => (section === renamingSection ? nextName : section)));
        setQuestions((prev) =>
            prev.map((question) =>
                normalizeSectionValue(question.section) === renamingSection
                    ? { ...question, section: nextName }
                    : question,
            ),
        );
        if (activeSection === renamingSection) setActiveSection(nextName);
        if (moveTargetSection === renamingSection) setMoveTargetSection(nextName);
        setRenamingSection(null);
        setRenamingSectionName('');
    };

    // ── Question operations ──────────────────────────────────────────────────
    const updateQuestion = useCallback((questionId: string, updates: Partial<EditableQuestion>) => {
        setQuestions((prev) =>
            prev.map((question) => (question.id === questionId ? { ...question, ...updates } : question)),
        );
    }, []);

    const addQuestion = useCallback(() => {
        const newQuestion = createEmptyQuestion(
            `${Date.now()}`,
            normalizeSectionValue(activeSection || sections[0]),
        );
        setQuestions((prev) => [...prev, newQuestion]);
        setExpandedId(newQuestion.id);
        setShowOnlyIncomplete(false);
    }, [activeSection, sections]);

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

    const confirmDeleteQuestion = () => {
        if (!deleteQuestionId) return;
        setQuestions((prev) => prev.filter((question) => question.id !== deleteQuestionId));
        setExpandedId((current) => (current === deleteQuestionId ? null : current));
        setDeleteQuestionId(null);
    };

    /**
     * Reorders only the rows currently on screen, leaving questions in other
     * sections (or hidden by the incomplete filter) untouched.
     */
    const reorderWithinVisible = useCallback(
        (all: EditableQuestion[], visibleIds: string[], fromIndex: number, toIndex: number) => {
            const visibleSet = new Set(visibleIds);
            const visible = all.filter((question) => visibleSet.has(question.id));
            const reordered = arrayMove(visible, fromIndex, toIndex);
            let cursor = 0;
            return all.map((question) =>
                visibleSet.has(question.id) ? reordered[cursor++] : question,
            );
        },
        [],
    );

    const visibleQuestions = useMemo(() => {
        if (showOnlyIncomplete) return getIncompleteQuestions(questions);
        return questions.filter(
            (question) =>
                normalizeSectionValue(question.section)
                === normalizeSectionValue(activeSection || sections[0]),
        );
    }, [questions, showOnlyIncomplete, activeSection, sections]);

    const visibleIds = useMemo(() => visibleQuestions.map((q) => q.id), [visibleQuestions]);

    const moveQuestion = useCallback(
        (questionId: string, direction: 'up' | 'down') => {
            setQuestions((prev) => {
                const currentIndex = visibleIds.indexOf(questionId);
                if (currentIndex < 0) return prev;
                const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
                if (targetIndex < 0 || targetIndex >= visibleIds.length) return prev;
                return reorderWithinVisible(prev, visibleIds, currentIndex, targetIndex);
            });
        },
        [visibleIds, reorderWithinVisible],
    );

    const reorderQuestions = useCallback(
        (activeId: string, overId: string) => {
            setQuestions((prev) => {
                const fromIndex = visibleIds.indexOf(activeId);
                const toIndex = visibleIds.indexOf(overId);
                if (fromIndex < 0 || toIndex < 0) return prev;
                return reorderWithinVisible(prev, visibleIds, fromIndex, toIndex);
            });
        },
        [visibleIds, reorderWithinVisible],
    );

    const confirmMoveQuestion = () => {
        if (!moveQuestionTarget) return;

        const trimmedNewSection = moveTargetNewSection.trim();
        if (!trimmedNewSection && moveTargetSection === NEW_SECTION_OPTION) {
            toast.error('Type a new section name to create it.');
            return;
        }

        const nextSection = normalizeSectionValue(
            trimmedNewSection || (moveTargetSection === NEW_SECTION_OPTION ? '' : moveTargetSection),
        );

        if (trimmedNewSection && !sections.includes(trimmedNewSection)) {
            setSections((prev) => [...prev, trimmedNewSection]);
        }

        setQuestions((prev) =>
            prev.map((question) =>
                question.id === moveQuestionTarget.id ? { ...question, section: nextSection } : question,
            ),
        );
        setActiveSection(nextSection);
        setMoveQuestionTarget(null);
        setMoveTargetNewSection('');
    };

    // ── Images ───────────────────────────────────────────────────────────────
    const validateImageFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file.');
            return false;
        }
        if (file.size > 3 * 1024 * 1024) {
            toast.error('Image must be 3MB or smaller.');
            return false;
        }
        return true;
    };

    const handleQuestionImageUpload = useCallback(
        async (questionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file || !validateImageFile(file)) return;

            try {
                const secureUrl = await uploadImageToCloudinary(file, 'question-images');
                updateQuestion(questionId, { imageUrl: secureUrl });
                toast.success('Image attached successfully.');
            } catch (error) {
                console.error('Failed to attach question image', error);
                toast.error('Failed to attach image. Please try again.');
            }
        },
        [updateQuestion],
    );

    const handleImportPreviewImageUpload = useCallback(
        async (questionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file || !validateImageFile(file)) return;

            try {
                const secureUrl = await uploadImageToCloudinary(file, 'question-images');
                setImportPreview((prev) =>
                    prev.map((question) =>
                        question.id === questionId ? { ...question, imageUrl: secureUrl } : question,
                    ),
                );
                toast.success('Image attached to imported question.');
            } catch (error) {
                console.error('Failed to attach imported question image', error);
                toast.error('Failed to attach image. Please try again.');
            }
        },
        [],
    );

    // ── Import ───────────────────────────────────────────────────────────────
    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        try {
            const parsed = await parseQuestionFile(file, {
                section: normalizeSectionValue(activeSection || sections[0]),
            });
            setImportPreview(parsed);
            setImportExpandedId(null);
            setIsImportPreviewOpen(true);
        } catch (error) {
            if (error instanceof QuestionImportError) {
                toast.error(error.message);
                return;
            }
            console.error('Failed to import questions', error);
            toast.error('Failed to import file. Please check the template and try again.');
        }
    };

    /** Keeps questions grouped by section in the order the section tabs appear. */
    const orderBySections = useCallback(
        (items: EditableQuestion[], sectionOrder: string[]) => {
            const sectionIndex = new Map(
                sectionOrder.map((section, index) => [section.trim().toLowerCase(), index]),
            );
            return items
                .map((question, index) => ({ question, index }))
                .sort((left, right) => {
                    const leftRank =
                        sectionIndex.get(normalizeSectionValue(left.question.section).trim().toLowerCase())
                        ?? Number.MAX_SAFE_INTEGER;
                    const rightRank =
                        sectionIndex.get(normalizeSectionValue(right.question.section).trim().toLowerCase())
                        ?? Number.MAX_SAFE_INTEGER;
                    if (leftRank !== rightRank) return leftRank - rightRank;
                    return left.index - right.index;
                })
                .map((entry) => entry.question);
        },
        [],
    );

    const applyImportedQuestions = () => {
        if (importPreview.length === 0) {
            setIsImportPreviewOpen(false);
            return;
        }
        setQuestions((prev) => orderBySections([...prev, ...importPreview], sections));
        setIsImportPreviewOpen(false);
        toast.success('Imported questions added successfully.');
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
        if (!title.trim()) list.push('Exam title is required');
        if (!duration.trim()) list.push('Duration is required');
        if (allowMultipleAttemptsConfig) {
            const parsed = Number(maxAttempts);
            if (!maxAttempts.trim() || !Number.isInteger(parsed) || parsed < 1) {
                list.push('Max attempts must be a whole number of at least 1');
            }
        }
        if (questionsWithContent.length === 0) list.push('Add at least one question');
        if (incompleteQuestions.length > 0) {
            list.push(
                `${incompleteQuestions.length} question${incompleteQuestions.length === 1 ? '' : 's'} incomplete`,
            );
        }
        if (closeOnDeadline && !deadline) list.push('Close on deadline needs a deadline');
        return list;
    }, [
        title,
        duration,
        allowMultipleAttemptsConfig,
        maxAttempts,
        questionsWithContent.length,
        incompleteQuestions.length,
        closeOnDeadline,
        deadline,
    ]);

    // ── Submit ───────────────────────────────────────────────────────────────
    const doSubmit = async (publish: boolean) => {
        if (isEditing && examStatus === 'LIVE') {
            toast.error('Published exams cannot be edited.');
            navigate(id ? `/manage-exams/${id}/view` : '/manage-exams');
            return;
        }

        if (blockers.length > 0) {
            toast.error(blockers[0]);
            if (incompleteQuestions.length > 0) setShowOnlyIncomplete(true);
            return;
        }

        const selectedProgramNames = selectedPrograms.filter((program) => program !== 'All Programs');
        const selectedTrackIds = tracks
            .filter((track) => selectedProgramNames.includes(track.name))
            .map((track) => track.id);

        const preparedQuestions = questionsWithContent.map((question) => ({
            text: question.text.trim(),
            imageUrl: question.imageUrl?.trim() || undefined,
            choices: question.options.map((option) => option.trim()),
            correctAnswer: OPTION_LETTERS[question.correctOption],
            explanation: question.rationale.trim() || undefined,
            section: normalizeSectionValue(question.section),
        }));

        const normalizedSectionList = Array.from(
            new Set(
                [
                    ...sections.map((section) => section.trim()),
                    ...preparedQuestions.map((question) => question.section.trim()),
                ].filter(Boolean),
            ),
        );

        const payload = {
            title: title.trim(),
            subject: normalizedSectionList[0] || title.trim(),
            categoryId: category,
            trackIds: selectedTrackIds,
            timeLimit: Number(duration),
            maxAttempts: allowMultipleAttemptsConfig ? Number(maxAttempts) : 1,
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
                toast.success(publish ? 'Exam updated and published.' : 'Exam draft updated.');
            } else {
                await api.post('/exams', payload);
                toast.success(publish ? 'Exam published successfully.' : 'Exam saved as draft.');
            }
            setSavedSnapshot(snapshot);
            navigate('/manage-exams');
        } catch (error: any) {
            console.error('Failed to submit exam', error);
            toast.error(error.response?.data?.message || 'Failed to save exam.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleProgramToggle = (program: string) => {
        if (program === 'All Programs') {
            setSelectedPrograms(['All Programs']);
            return;
        }
        const next = selectedPrograms.includes(program)
            ? selectedPrograms.filter((candidate) => candidate !== program)
            : [...selectedPrograms.filter((candidate) => candidate !== 'All Programs'), program];
        setSelectedPrograms(next.length === 0 ? ['All Programs'] : next);
    };

    if (isLoadingExam) {
        return (
            <div className="flex min-h-60 items-center justify-center font-lexend">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-[12px] text-slate-500">Loading exam details…</p>
                </div>
            </div>
        );
    }

    const sectionTabs = (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-px">
            {sections.map((section) => {
                const count = questions.filter(
                    (question) => normalizeSectionValue(question.section) === section,
                ).length;
                const isActive = !showOnlyIncomplete && activeSection === section;

                if (renamingSection === section) {
                    return (
                        <Input
                            key={section}
                            autoFocus
                            aria-label="Section name"
                            value={renamingSectionName}
                            onChange={(event) => setRenamingSectionName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    confirmRenameSection();
                                }
                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    setRenamingSection(null);
                                }
                            }}
                            onBlur={confirmRenameSection}
                            className="h-7 w-36 rounded-lg border-slate-200 text-[12px]"
                        />
                    );
                }

                return (
                    <DropdownMenu key={section}>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className={cn(
                                    'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                                    isActive
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-slate-500 hover:text-slate-800',
                                )}
                            >
                                {section}
                                <span
                                    className={cn(
                                        'rounded px-1 text-[11px] tabular-nums',
                                        isActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400',
                                    )}
                                >
                                    {count}
                                </span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44 rounded-lg">
                            <DropdownMenuItem
                                onClick={() => {
                                    setShowOnlyIncomplete(false);
                                    setActiveSection(section);
                                }}
                                className="gap-2 text-[12px] font-semibold"
                            >
                                View questions
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => {
                                    setRenamingSection(section);
                                    setRenamingSectionName(section);
                                }}
                                className="gap-2 text-[12px] font-semibold"
                            >
                                <Settings2 size={13} aria-hidden="true" /> Rename section
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                disabled={sections.length <= 1}
                                onClick={() => removeSection(section)}
                                className="gap-2 text-[12px] font-semibold text-red-600 focus:bg-red-50 focus:text-red-600"
                            >
                                <Trash2 size={13} aria-hidden="true" /> Delete section
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            })}

            <div className="ml-auto shrink-0 pl-2">
                {isAddingSection ? (
                    <div className="flex items-center gap-1">
                        <Input
                            autoFocus
                            aria-label="New section name"
                            value={newSectionName}
                            onChange={(event) => setNewSectionName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    confirmAddSection();
                                }
                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    setIsAddingSection(false);
                                    setNewSectionName('');
                                }
                            }}
                            placeholder="Section name"
                            className="h-7 w-32 rounded-lg border-slate-200 text-[12px]"
                        />
                        <Button
                            size="sm"
                            className="h-7 rounded-lg px-2 text-[12px] font-semibold"
                            onClick={confirmAddSection}
                        >
                            Add
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 rounded-lg p-0"
                            aria-label="Cancel adding section"
                            onClick={() => {
                                setIsAddingSection(false);
                                setNewSectionName('');
                            }}
                        >
                            <X size={12} aria-hidden="true" />
                        </Button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsAddingSection(true)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-[12px] font-semibold text-slate-400 transition-colors hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <Plus size={11} aria-hidden="true" /> Section
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <>
            <EditorShell
                breadcrumbLabel="Exams"
                breadcrumbTo="/manage-exams"
                currentLabel={isEditing ? 'Edit exam' : 'New exam'}
                title={isEditing ? 'Edit mock exam' : 'Create mock exam'}
                description="Build and publish a mock exam for your reviewees."
                isDirty={isDirty}
                isSubmitting={isSubmitting}
                onDiscard={() => navigate('/manage-exams')}
                onSaveDraft={() => void doSubmit(false)}
                onPublish={() => setPublishConfirmOpen(true)}
                publishLabel="Publish"
                publishBlockedReason={blockers.length > 0 ? blockers.join('. ') : null}
                notice={
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                        Once published, this exam can no longer be edited.
                    </p>
                }
                settings={
                    <div className="space-y-3">
                        <SettingsCard title="Exam settings">
                            <SettingsSection>
                                <div className="space-y-1.5">
                                    <FieldLabel htmlFor="exam-title">Exam title</FieldLabel>
                                    <Input
                                        id="exam-title"
                                        value={title}
                                        onChange={(event) => setTitle(event.target.value)}
                                        placeholder="e.g. LET 2024 comprehensive mock"
                                        className="h-9 rounded-lg border-slate-200 text-[13px] shadow-none focus:ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <FieldLabel>Category</FieldLabel>
                                    <CategorySelect value={category} onChange={setCategory} />
                                </div>
                                <div className="space-y-1.5">
                                    <FieldLabel>Duration</FieldLabel>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {PRESET_DURATIONS.map((preset) => {
                                            const isActive = !isCustomDuration && duration === String(preset);
                                            return (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    aria-pressed={isActive}
                                                    onClick={() => {
                                                        setDuration(String(preset));
                                                        setIsCustomDuration(false);
                                                    }}
                                                    className={cn(
                                                        'h-8 rounded-lg border text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                                                        isActive
                                                            ? 'border-primary bg-primary text-white'
                                                            : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary',
                                                    )}
                                                >
                                                    {preset < 60 ? `${preset}m` : `${preset / 60}h`}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {isCustomDuration ? (
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                min={1}
                                                aria-label="Custom duration in minutes"
                                                value={duration}
                                                onChange={(event) => setDuration(event.target.value)}
                                                placeholder="e.g. 150"
                                                className="h-8 rounded-lg border-slate-200 pr-12 text-[13px] shadow-none focus:ring-primary/20"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                                                min
                                            </span>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCustomDuration(true);
                                                setDuration('');
                                            }}
                                            className="rounded text-[12px] font-semibold text-slate-400 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                        >
                                            Use a custom duration
                                        </button>
                                    )}
                                </div>
                                {allowMultipleAttemptsConfig && (
                                    <div className="space-y-1.5">
                                        <FieldLabel htmlFor="exam-attempts">Max attempts</FieldLabel>
                                        <Input
                                            id="exam-attempts"
                                            type="number"
                                            min={1}
                                            step={1}
                                            value={maxAttempts}
                                            onChange={(event) => setMaxAttempts(event.target.value)}
                                            placeholder="e.g. 3"
                                            className="h-9 rounded-lg border-slate-200 text-[13px] shadow-none focus:ring-primary/20"
                                        />
                                    </div>
                                )}
                                {isEditing && (
                                    <div className="space-y-1.5">
                                        <FieldLabel>Status</FieldLabel>
                                        <Select
                                            value={examStatus}
                                            onValueChange={(value) => setExamStatus(value as EditableExamStatus)}
                                        >
                                            <SelectTrigger
                                                className="h-9 rounded-lg border-slate-200 text-[13px]"
                                                aria-label="Exam status"
                                            >
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {EDITABLE_STATUS_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </SettingsSection>

                            <SettingsSection label="Visible to">
                                <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                                    {programs.map((program) => (
                                        <label
                                            key={program}
                                            className={cn(
                                                'flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors',
                                                selectedPrograms.includes(program)
                                                    ? 'border-primary/30 bg-primary/5'
                                                    : 'border-slate-200 bg-white hover:bg-slate-50',
                                            )}
                                        >
                                            <Checkbox
                                                checked={selectedPrograms.includes(program)}
                                                onCheckedChange={() => handleProgramToggle(program)}
                                                className="h-3.5 w-3.5 rounded border-slate-300 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                                            />
                                            <span className="text-[12px] font-medium text-slate-700">{program}</span>
                                        </label>
                                    ))}
                                </div>
                            </SettingsSection>

                            <SettingsSection label="Schedule">
                                {!showDeadline ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeadline(true)}
                                        className="flex items-center gap-1.5 rounded text-[12px] font-semibold text-slate-400 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                    >
                                        <Plus size={12} aria-hidden="true" /> Add deadline
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        <DateTimePicker
                                            value={deadline}
                                            onChange={setDeadline}
                                            placeholder="Select deadline date & time"
                                            onClear={() => setDeadline('')}
                                        />
                                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 transition-colors hover:bg-slate-50">
                                            <Checkbox
                                                checked={closeOnDeadline}
                                                onCheckedChange={(checked) => setCloseOnDeadline(Boolean(checked))}
                                                className="h-3.5 w-3.5 rounded border-slate-300 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                                            />
                                            <span className="text-[12px] font-medium text-slate-700">
                                                Close exam automatically on the deadline
                                            </span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowDeadline(false);
                                                setDeadline('');
                                                setCloseOnDeadline(false);
                                            }}
                                            className="flex items-center gap-1 rounded text-[12px] font-semibold text-slate-400 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                        >
                                            <X size={11} aria-hidden="true" /> Remove deadline
                                        </button>
                                    </div>
                                )}
                            </SettingsSection>

                            <SettingsSection label="Description">
                                <Textarea
                                    aria-label="Exam description"
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                    placeholder="What does this exam cover?"
                                    className="min-h-16 resize-none rounded-lg border-slate-200 text-[13px] leading-relaxed shadow-none focus:ring-primary/20"
                                />
                            </SettingsSection>
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
                    onDelete={setDeleteQuestionId}
                    onDuplicate={duplicateQuestion}
                    onMove={moveQuestion}
                    onMoveToSection={(question) => {
                        setMoveQuestionTarget(question);
                        setMoveTargetSection(normalizeSectionValue(question.section));
                        setMoveTargetNewSection('');
                    }}
                    onImageUpload={handleQuestionImageUpload}
                    onAdd={addQuestion}
                    onReorder={reorderQuestions}
                    sectionTabs={sectionTabs}
                    emptyTitle="No questions in this section"
                    emptyDescription="Add questions manually or import them from a file."
                    toolbarActions={
                        <>
                            <input
                                ref={importFileRef}
                                type="file"
                                accept=".csv,.json,application/json,text/csv"
                                onChange={handleFileImport}
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
                                onClick={() => downloadQuestionTemplate('csv', 'exam-import-template')}
                            >
                                <ExcelTemplateIcon /> Template
                            </Button>
                            {user?.role === 'ADMIN' && (
                                <Button
                                    variant="outline"
                                    className="h-7 w-8 rounded-lg border-slate-200 bg-white px-0"
                                    aria-label="Download JSON template"
                                    onClick={() => downloadQuestionTemplate('json', 'exam-import-template')}
                                >
                                    <FileJson size={13} aria-hidden="true" />
                                </Button>
                            )}
                        </>
                    }
                />
            </EditorShell>

            {/* Import preview */}
            <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
                <DialogContent className="max-w-3xl rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-[15px]">Review imported questions</DialogTitle>
                        <DialogDescription className="text-[12px]">
                            {importPreview.length} question{importPreview.length === 1 ? '' : 's'} parsed into{' '}
                            {normalizeSectionValue(activeSection || sections[0])}. Review and edit before adding.
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
                                    setImportPreview((prev) => prev.filter((c) => c.id !== questionId))
                                }
                                onMove={(questionId, direction) =>
                                    setImportPreview((prev) => {
                                        const currentIndex = prev.findIndex((c) => c.id === questionId);
                                        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
                                        if (targetIndex < 0 || targetIndex >= prev.length) return prev;
                                        return arrayMove(prev, currentIndex, targetIndex);
                                    })
                                }
                                onImageUpload={handleImportPreviewImageUpload}
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

            {/* Move to section */}
            <Dialog
                open={moveQuestionTarget !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setMoveQuestionTarget(null);
                        setMoveTargetNewSection('');
                    }
                }}
            >
                <DialogContent className="max-w-sm rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-[15px]">Move question to section</DialogTitle>
                        <DialogDescription className="text-[12px]">
                            Choose an existing section or create a new one.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <FieldLabel>Existing section</FieldLabel>
                            <Select value={moveTargetSection} onValueChange={setMoveTargetSection}>
                                <SelectTrigger className="h-9 text-[13px]" aria-label="Target section">
                                    <SelectValue placeholder="Select section" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sections.map((section) => (
                                        <SelectItem key={section} value={section}>
                                            {section}
                                        </SelectItem>
                                    ))}
                                    <SelectItem value={NEW_SECTION_OPTION}>Create a new section…</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <FieldLabel htmlFor="move-new-section">Or add a new section</FieldLabel>
                            <Input
                                id="move-new-section"
                                value={moveTargetNewSection}
                                onChange={(event) => setMoveTargetNewSection(event.target.value)}
                                placeholder="New section name"
                                className="h-9 rounded-lg border-slate-200 text-[13px]"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            className="h-8 rounded-lg border-slate-200 text-[12px] font-semibold"
                            onClick={() => setMoveQuestionTarget(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="h-8 rounded-lg text-[12px] font-semibold"
                            onClick={confirmMoveQuestion}
                        >
                            Move question
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteQuestionId !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteQuestionId(null);
                }}
                title="Delete question"
                description="Are you sure you want to delete this question? This action cannot be undone."
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={confirmDeleteQuestion}
            />

            <ConfirmDialog
                open={publishConfirmOpen}
                onOpenChange={setPublishConfirmOpen}
                title="Publish exam"
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
        </>
    );
};

export default CreateExamPage;
