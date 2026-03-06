import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    ChevronRight,
    Save,
    Plus,
    X,
    Trash2,
    Copy,
    Library,
    Clock,
    FileUp,
    FileJson,
    FileSpreadsheet,
    ImagePlus,
    CalendarClock,
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
import api from '@/lib/axios';
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

const CreateExamPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;

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
    const [sections, setSections] = useState<string[]>([]);
    const [activeSection, setActiveSection] = useState('General Section');
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [programs, setPrograms] = useState<string[]>(['All Programs']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingExam, setIsLoadingExam] = useState(false);
    const [allowMultipleAttemptsConfig, setAllowMultipleAttemptsConfig] = useState(false);
    const importFileRef = useRef<HTMLInputElement | null>(null);
    const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
    const [importPreviewQuestions, setImportPreviewQuestions] = useState<Question[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
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
                                section: resolvedSectionTitle || 'General Section',
                            };
                        });
                    setQuestions(mapped);
                }

                const fetchedSections = (exam.sections || [])
                    .slice()
                    .sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
                    .map((section) => section.title?.trim())
                    .filter((section): section is string => Boolean(section));
                const inferredSection = (exam.subject || '').trim() || 'General Section';
                const nextSections = fetchedSections.length > 0
                    ? fetchedSections
                    : Array.from(new Set(
                        apiQuestions
                            .map((q) => q.section?.title || sectionMap.get(q.sectionId || q.section?.id || '') || '')
                            .filter(Boolean)
                    ));
                const safeSections = nextSections.length > 0 ? nextSections : [inferredSection];
                setSections(safeSections);
                setActiveSection(safeSections[0]);
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
        const remainingSections = sections.filter((s) => s !== section);
        setSections(remainingSections);
        if (activeSection === section) {
            setActiveSection(remainingSections[0] || 'General Section');
        }
    };

    const addQuestion = () => {
        const newQuestion: Question = {
            id: Date.now().toString(),
            text: '',
            imageUrl: '',
            options: ['', '', '', ''],
            correctOption: 0,
            rationale: '',
            section: activeSection || sections[0] || 'General Section'
        };
        setQuestions([...questions, newQuestion]);
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

    const handleQuestionImageUpload = async (questionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file.');
            return;
        }

        const maxFileSizeInBytes = 3 * 1024 * 1024;
        if (file.size > maxFileSizeInBytes) {
            toast.error('Image must be 3MB or smaller.');
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

    const downloadTemplate = (format: 'csv' | 'json') => {
        const csvTemplate = [
            '# correctAnswer supports A/B/C/D, 1/2/3/4, 0/1/2/3, or exact option text',
            'questionText,imageUrl,choiceA,choiceB,choiceC,choiceD,correctAnswer,rationalization,section',
            'What is 2 + 2?,https://example.com/question-image.png,2,3,4,5,C,4 is the correct sum,General Education',
        ].join('\n');

        const jsonTemplate = JSON.stringify({
            _comment: 'correctAnswer supports A/B/C/D, 1/2/3/4, 0/1/2/3, or exact option text',
            questions: [
                {
                    questionText: 'What is 2 + 2?',
                    imageUrl: 'https://example.com/question-image.png',
                    choiceA: '2',
                    choiceB: '3',
                    choiceC: '4',
                    choiceD: '5',
                    correctAnswer: 'C',
                    rationalization: '4 is the correct sum',
                    section: 'General Education',
                },
            ],
        }, null, 2);

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

    const parseCsvLine = (line: string) => {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let index = 0; index < line.length; index += 1) {
            const char = line[index];

            if (char === '"') {
                if (inQuotes && line[index + 1] === '"') {
                    current += '"';
                    index += 1;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
                continue;
            }

            current += char;
        }

        values.push(current.trim());
        return values;
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

        const getSectionValue = (record: Record<string, any>) => {
            const explicitSection = pickImportValue(record, [
                'section',
                'sectionName',
                'section_name',
                'sectionTitle',
                'section_title',
            ]);

            if (explicitSection !== undefined && explicitSection !== null && String(explicitSection).trim().length > 0) {
                return String(explicitSection).trim();
            }

            const dynamicSectionEntry = Object.entries(toNormalizedRecord(record)).find(([key, value]) => {
                const normalizedKey = key.replace(/\s+/g, '').toLowerCase();
                return normalizedKey.includes('section') && value !== undefined && value !== null && String(value).trim().length > 0;
            });

            if (dynamicSectionEntry) {
                return String(dynamicSectionEntry[1]).trim();
            }

            return '';
        };

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
                const section = getSectionValue(record)
                    || activeSection
                    || sections[0]
                    || 'General Section';

                return {
                    id: `${Date.now()}-${index}`,
                    text,
                    imageUrl: String(
                        pickImportValue(record, ['imageUrl', 'image_url', 'image', 'questionImage']) ?? ''
                    ).trim(),
                    options,
                    correctOption,
                    rationale: String(
                        pickImportValue(record, ['rationalization', 'explanation', 'rationale']) ?? ''
                    ).trim(),
                    section,
                } as Question;
            })
            .filter((item): item is Question => !!item);

        if (mappedQuestions.length === 0) {
            toast.error('No valid questions were parsed from the import file.');
            return;
        }

        const importSectionOrder = Array.from(
            new Set(mappedQuestions.map((question) => question.section).filter(Boolean))
        );
        const previewSectionOrder = Array.from(new Set([...sections, ...importSectionOrder]));

        const orderedMappedQuestions = orderQuestionsBySections(mappedQuestions, previewSectionOrder);

        setImportPreviewQuestions(orderedMappedQuestions);
        setIsImportPreviewOpen(true);
    };

    const applyImportedQuestions = () => {
        if (importPreviewQuestions.length === 0) {
            setIsImportPreviewOpen(false);
            return;
        }

        const importedSections = Array.from(new Set(importPreviewQuestions.map((question) => question.section).filter(Boolean)));
        const mergedSections = Array.from(new Set([...sections, ...importedSections]));

        setSections(mergedSections);
        setQuestions((prev) => orderQuestionsBySections([...prev, ...importPreviewQuestions], mergedSections));
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
            const content = (await file.text()).replace(/^\uFEFF/, '');

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

            const lines = content
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => line.length > 0 && !line.startsWith('#'));

            if (lines.length < 2) {
                toast.error('CSV file has no data rows.');
                return;
            }

            const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^\uFEFF/, '').trim());
            const rows = lines.slice(1).map((line) => {
                const values = parseCsvLine(line);
                return headers.reduce<Record<string, string>>((acc, header, index) => {
                    acc[header] = values[index] || '';
                    return acc;
                }, {});
            });

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
                section: question.section?.trim() || 'General Section',
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
            ...preparedQuestions.map((question) => question.section.trim()),
        ].filter(Boolean)));

        const payload = {
            title: title.trim(),
            subject: normalizedSectionList[0] || 'General Education',
            category: category === 'NONE' ? null : category,
            trackIds: selectedTrackIds,
            timeLimit: Number(duration),
            maxAttempts: parsedMaxAttempts,
            deadline: deadline ? new Date(deadline).toISOString() : undefined,
            closeOnDeadline: closeOnDeadline && Boolean(deadline),
            isPublished: publish,
            status: isEditing ? examStatus : undefined,
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

    const filteredQuestions = questions.filter(q => q.section === activeSection);

    if (isLoadingExam) {
        return <div className="p-6 font-lexend">Loading exam details...</div>;
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
                            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Publish'}
                        </Button>
                    </div>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-amber-700">
                    Warning: Once published, this exam can no longer be edited.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left Column - General Info */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="px-5 pt-5 pb-3 border-b border-slate-50">
                            <div className="flex items-center gap-2.5 text-primary">
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-[9px] font-black">1</span>
                                <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-600">General Information</CardTitle>
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

                            {/* Duration + Category row */}
                            <div className={`grid grid-cols-1 ${allowMultipleAttemptsConfig ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3`}>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duration</Label>
                                    <div className="grid grid-cols-3 gap-1">
                                        {PRESET_DURATIONS.map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => { setDuration(String(preset)); setIsCustomDuration(false); }}
                                                className={`h-8 rounded-lg text-[10px] font-black border transition-all ${
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
                                        <div className="relative">
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
                            </div>

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

                            {/* Deadline section */}
                            <div className="space-y-2">
                                {!showDeadline ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeadline(true)}
                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors group"
                                    >
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full border border-dashed border-slate-300 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all">
                                            <Plus size={10} />
                                        </span>
                                        Add Deadline
                                    </button>
                                ) : (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CalendarClock size={13} className="text-primary" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Deadline</span>
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
                                                <X size={10} /> Remove
                                            </button>
                                        </div>
                                        <DateTimePicker
                                            value={deadline}
                                            onChange={setDeadline}
                                            placeholder="Select deadline date & time"
                                            onClear={() => setDeadline('')}
                                        />
                                        <div
                                            className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${closeOnDeadline ? 'bg-primary/5 border-primary/20' : 'bg-white border-slate-200 hover:border-slate-300'}`}
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
                                    </div>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-100" />

                            {/* Visible To */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Visible To</Label>
                                <div className="grid grid-cols-1 gap-1.5 max-h-50 overflow-y-auto pr-1 scrollbar-hide">
                                    {programs.map((program) => (
                                        <div
                                            key={program}
                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all cursor-pointer ${selectedPrograms.includes(program)
                                                ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10'
                                                : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                                                }`}
                                            onClick={() => handleProgramToggle(program)}
                                        >
                                            <Checkbox
                                                id={program}
                                                checked={selectedPrograms.includes(program)}
                                                className="rounded-md border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-3.5 w-3.5"
                                            />
                                            <Label htmlFor={program} className="text-xs font-bold leading-none cursor-pointer">
                                                {program}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-100" />

                            {/* Exam Sections */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Exam Sections</Label>
                                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/30 min-h-11">
                                    {sections.map((section) => (
                                        <Badge
                                            key={section}
                                            className="bg-white text-slate-600 border border-slate-200 font-bold text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 hover:border-red-100 hover:text-red-500 transition-all cursor-default shadow-none"
                                        >
                                            {section}
                                            <button onClick={() => removeSection(section)} className="hover:text-red-600 opacity-60 hover:opacity-100">
                                                <X size={10} />
                                            </button>
                                        </Badge>
                                    ))}
                                    {!isAddingSection ? (
                                        <button
                                            type="button"
                                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-primary px-2 py-1 rounded-lg hover:bg-primary/5 transition-all"
                                            onClick={() => setIsAddingSection(true)}
                                        >
                                            <Plus size={10} /> Section
                                        </button>
                                    ) : (
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1 italic">
                                            Adding in editor...
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description <span className="lowercase text-slate-300 font-medium">(optional)</span></Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide instructions or context for students..."
                                    className="min-h-20 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-medium text-sm leading-relaxed resize-none"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Question Management */}
                <div className="lg:col-span-2 space-y-5">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 text-primary">
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-[9px] font-black">2</span>
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600">Question Management</h3>
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
                                    className="h-8 w-9 rounded-lg border-slate-200 bg-white font-bold text-[10px] gap-1 px-2"
                                    onClick={() => downloadTemplate('csv')}
                                    title="Download CSV template"
                                >
                                    <FileSpreadsheet size={13} />
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-8 w-9 rounded-lg border-slate-200 bg-white font-bold text-[10px] gap-1 px-2"
                                    onClick={() => downloadTemplate('json')}
                                    title="Download JSON template"
                                >
                                    <FileJson size={13} />
                                </Button>
                            </div>
                        </div>

                        <p className="text-[10px] font-medium text-slate-400 -mt-1">
                            Import tip: <span className="font-bold text-slate-500">correctAnswer</span> can be <span className="font-bold text-slate-500">A/B/C/D</span>, <span className="font-bold text-slate-500">1–4</span>, or the exact option text. Optional: <span className="font-bold text-slate-500">imageUrl</span>, <span className="font-bold text-slate-500">rationalization</span>, <span className="font-bold text-slate-500">section</span>.
                        </p>

                        {/* Section Tabs */}
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-px">
                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                                {[...sections, 'Uncategorized'].map((section) => (
                                    <button
                                        key={section}
                                        onClick={() => setActiveSection(section)}
                                        className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${activeSection === section
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        {section}
                                        <Badge className={`border-none text-[9px] px-1.5 py-0 ${activeSection === section ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-400'}`}>
                                            {questions.filter(q => q.section === section).length}
                                        </Badge>
                                    </button>
                                ))}
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
                                <div className="py-16 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30">
                                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center mb-3">
                                        <Library size={20} className="opacity-40 text-slate-600" />
                                    </div>
                                    <p className="font-black text-[10px] tracking-widest uppercase text-slate-400">No questions yet</p>
                                    <p className="text-[11px] font-medium text-slate-400 mt-1">Add questions manually or import a file</p>
                                    <Button
                                        variant="outline"
                                        className="mt-3 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest border-slate-200 text-primary hover:bg-primary/5"
                                        onClick={addQuestion}
                                    >
                                        <Plus size={12} className="mr-1" /> Add Question
                                    </Button>
                                </div>
                            ) : (
                                filteredQuestions.map((q, index) => (
                                    <Card key={q.id} className="rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white">
                                        <div className="bg-slate-50/60 px-4 py-2.5 border-b border-slate-100 flex justify-between items-center">
                                            <div className="flex items-center gap-2.5">
                                                <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase tracking-widest px-2 py-1">
                                                    Q{index + 1}
                                                </Badge>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    {q.section}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    className="p-1.5 text-slate-300 hover:text-primary transition-colors hover:bg-white rounded-lg"
                                                    onClick={() => duplicateQuestion(q)}
                                                    title="Duplicate"
                                                >
                                                    <Copy size={13} />
                                                </button>
                                                <button
                                                    className="p-1.5 text-slate-300 hover:text-red-500 transition-colors hover:bg-white rounded-lg"
                                                    onClick={() => deleteQuestion(q.id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                        <CardContent className="p-4 space-y-4">
                                            {/* Question Text */}
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                    Question
                                                </Label>
                                                <Textarea
                                                    value={q.text}
                                                    onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                                                    placeholder="Enter your question here..."
                                                    className="min-h-18 rounded-xl border-slate-100 shadow-none focus:ring-primary/20 font-semibold text-sm leading-relaxed resize-none"
                                                />
                                            </div>

                                            {/* Question Image */}
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                    Image <span className="lowercase font-medium text-slate-300">(optional)</span>
                                                </Label>
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                    <label className={`flex items-center gap-2 h-9 px-3 rounded-xl border cursor-pointer transition-all text-[10px] font-black uppercase tracking-wider ${q.imageUrl ? 'border-slate-200 bg-white text-slate-500 hover:border-slate-300' : 'border-dashed border-slate-200 bg-slate-50/50 text-slate-400 hover:bg-slate-50 hover:border-slate-300'}`}>
                                                        <ImagePlus size={13} />
                                                        {q.imageUrl ? 'Replace' : 'Upload Image'}
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(event) => { void handleQuestionImageUpload(q.id, event); }}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                    {q.imageUrl && (
                                                        <button
                                                            type="button"
                                                            className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
                                                            onClick={() => updateQuestion(q.id, { imageUrl: '' })}
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                                {q.imageUrl && (
                                                    <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-2">
                                                        <img
                                                            src={q.imageUrl}
                                                            alt="Question attachment"
                                                            className="max-h-48 w-auto max-w-full rounded-lg border border-slate-100 object-contain bg-white"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Options */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                        Options
                                                    </Label>
                                                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest opacity-70">Click radio to set correct</span>
                                                </div>
                                                <RadioGroup
                                                    value={q.correctOption.toString()}
                                                    onValueChange={(val) => updateQuestion(q.id, { correctOption: parseInt(val) })}
                                                    className="grid grid-cols-1 md:grid-cols-2 gap-2"
                                                >
                                                    {q.options.map((opt, optIdx) => (
                                                        <div
                                                            key={optIdx}
                                                            className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${q.correctOption === optIdx
                                                                ? 'bg-emerald-50/60 border-emerald-200 ring-1 ring-emerald-100'
                                                                : 'bg-white border-slate-100 hover:border-primary/20'
                                                                }`}
                                                        >
                                                            <RadioGroupItem
                                                                value={optIdx.toString()}
                                                                id={`q-${q.id}-opt-${optIdx}`}
                                                                className="border-slate-300 text-emerald-500 focus:ring-emerald-500 shrink-0"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <label
                                                                    htmlFor={`q-${q.id}-opt-${optIdx}`}
                                                                    className={`text-[9px] font-black uppercase tracking-widest block mb-0.5 ${q.correctOption === optIdx ? 'text-emerald-600' : 'text-slate-300'}`}
                                                                >
                                                                    {String.fromCharCode(65 + optIdx)}{q.correctOption === optIdx && ' · Correct'}
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={opt}
                                                                    onChange={(e) => {
                                                                        const newOpts = [...q.options];
                                                                        newOpts[optIdx] = e.target.value;
                                                                        updateQuestion(q.id, { options: newOpts });
                                                                    }}
                                                                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                                                    className={`w-full bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 outline-none ${q.correctOption === optIdx ? 'text-slate-900' : 'text-slate-500'}`}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            </div>

                                            {/* Rationale */}
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Rationale <span className="lowercase font-medium text-slate-300">(optional)</span></Label>
                                                <Textarea
                                                    value={q.rationale}
                                                    onChange={(e) => updateQuestion(q.id, { rationale: e.target.value })}
                                                    placeholder="Explain why this is the correct answer..."
                                                    className="min-h-15 rounded-xl border-slate-100 shadow-none focus:ring-primary/20 font-medium text-xs leading-relaxed bg-slate-50/40 resize-none"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}

                            <button
                                onClick={addQuestion}
                                className="w-full py-5 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:text-primary hover:border-primary/25 hover:bg-primary/1.5 transition-all group"
                            >
                                <div className="bg-white w-7 h-7 rounded-full shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform border border-slate-100">
                                    <Plus size={14} className="text-primary" />
                                </div>
                                <span className="font-black text-[10px] uppercase tracking-widest">Add Question</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
                <DialogContent className="max-w-4xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Review Imported Questions</DialogTitle>
                        <DialogDescription>
                            {importPreviewQuestions.length} parsed questions found. Review before adding to this exam.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                        {importPreviewQuestions.map((question, index) => (
                            <div key={question.id} className="border border-gray-100 rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-black text-gray-600 uppercase tracking-widest">Question {index + 1}</p>
                                    <Badge variant="outline" className="text-[10px]">{question.section}</Badge>
                                </div>
                                <p className="text-sm font-semibold text-gray-900">{question.text}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {question.options.map((option, optionIndex) => (
                                        <div
                                            key={`${question.id}-${optionIndex}`}
                                            className={`text-xs rounded-lg px-2.5 py-2 border ${question.correctOption === optionIndex ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
                                        >
                                            <span className="font-black mr-1">{String.fromCharCode(65 + optionIndex)}.</span>
                                            {option || '(empty)'}
                                        </div>
                                    ))}
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
                            Add Imported Questions
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteQuestionId !== null}
                onOpenChange={(open) => { if (!open) setDeleteQuestionId(null); }}
                title="Delete Question"
                description="Are you sure you want to delete this question? This action cannot be undone."
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={confirmDeleteQuestion}
            />

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
