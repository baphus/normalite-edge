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
    Download,
    FileJson,
    FileSpreadsheet,
    ImagePlus,
} from 'lucide-react';
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

    // Form State
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState('');
    const [deadline, setDeadline] = useState('');
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
    const importFileRef = useRef<HTMLInputElement | null>(null);
    const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
    const [importPreviewQuestions, setImportPreviewQuestions] = useState<Question[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);

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
        if (!isEditing || !id) return;

        const fetchExam = async () => {
            setIsLoadingExam(true);
            try {
                const response = await api.get(`/exams/${id}?questions=true`);
                const exam = response.data?.data as ExamApi;

                setTitle(exam.title || '');
                setDescription(exam.description || '');
                setCategory((exam.categoryCode as CategoryValue) || 'NONE');
                setDuration(String(exam.timeLimit || exam.timeLimitMinutes || 120));
                setCloseOnDeadline(Boolean(exam.closeOnDeadline));
                const loadedStatus = exam.status === 'PUBLISHED' ? 'LIVE' : exam.status;
                if (loadedStatus && ['LIVE', 'DRAFT', 'CLOSED', 'ARCHIVED'].includes(loadedStatus)) {
                    setExamStatus(loadedStatus as EditableExamStatus);
                }
                if (exam.deadline) {
                    const deadlineDate = new Date(exam.deadline);
                    const offset = deadlineDate.getTimezoneOffset();
                    const localDate = new Date(deadlineDate.getTime() - offset * 60_000);
                    setDeadline(localDate.toISOString().slice(0, 16));
                } else {
                    setDeadline('');
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
                alert('Failed to load exam details.');
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
        if (window.confirm('Delete this question?')) {
            setQuestions(questions.filter(q => q.id !== id));
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
            alert('Please select a valid image file.');
            return;
        }

        const maxFileSizeInBytes = 3 * 1024 * 1024;
        if (file.size > maxFileSizeInBytes) {
            alert('Image must be 3MB or smaller.');
            return;
        }

        try {
            const secureUrl = await uploadImageToCloudinary(file, 'question-images');
            updateQuestion(questionId, { imageUrl: secureUrl });
        } catch (error) {
            console.error('Failed to attach question image', error);
            alert('Failed to attach image. Please try again.');
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

    const processImportedRecords = (records: Array<Record<string, any>>) => {
        if (records.length === 0) {
            alert('No valid question rows found in the import file.');
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
            alert('No valid questions were parsed from the import file.');
            return;
        }

        setImportPreviewQuestions(mappedQuestions);
        setIsImportPreviewOpen(true);
    };

    const applyImportedQuestions = () => {
        if (importPreviewQuestions.length === 0) {
            setIsImportPreviewOpen(false);
            return;
        }

        const importedSections = Array.from(new Set(importPreviewQuestions.map((question) => question.section)));
        setSections((prev) => Array.from(new Set([...prev, ...importedSections])));
        setQuestions((prev) => [...prev, ...importPreviewQuestions]);
        setIsImportPreviewOpen(false);
        setImportPreviewQuestions([]);
        alert('Imported questions added successfully.');
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        const lowerName = file.name.toLowerCase();
        if (!lowerName.endsWith('.csv') && !lowerName.endsWith('.json')) {
            alert('Unsupported file type. Please upload a CSV or JSON file.');
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
                alert('CSV file has no data rows.');
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
            alert('Failed to import file. Please check the template and try again.');
        }
    };

    const submitExam = async (publish: boolean) => {
        if (!title.trim()) {
            alert('Please enter an exam title.');
            return;
        }

        if (!duration.trim()) {
            alert('Please enter the exam duration in minutes.');
            return;
        }

        const preparedQuestions = questions
            .map((q) => ({
                text: q.text.trim(),
                imageUrl: q.imageUrl?.trim() || undefined,
                choices: q.options.map((option) => option.trim()),
                correctAnswer: ['A', 'B', 'C', 'D'][q.correctOption],
                explanation: q.rationale.trim() || undefined,
                section: q.section?.trim() || 'General Section',
            }))
            .filter((q) => q.text.length > 0);

        if (preparedQuestions.length === 0) {
            alert('Please add at least one question.');
            return;
        }

        const hasInvalidQuestion = preparedQuestions.some((q) => q.choices.some((choice) => choice.length === 0));
        if (hasInvalidQuestion) {
            alert('Please complete all four options for each question.');
            return;
        }

        if (closeOnDeadline && !deadline) {
            alert('Please set a deadline when enabling close on deadline.');
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
                alert(publish ? 'Exam updated and published successfully!' : 'Exam draft updated successfully!');
            } else {
                await api.post('/exams', payload);
                alert(publish ? 'Exam published successfully!' : 'Exam saved as draft!');
            }
            navigate('/manage-exams');
        } catch (error: any) {
            console.error('Failed to submit exam', error);
            const message = error.response?.data?.message || 'Failed to save exam.';
            alert(message);
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
            <header className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-2">
                            <Link to="/manage-exams" className="hover:text-primary transition-colors">Exams</Link>
                            <ChevronRight size={12} />
                            <span className="text-primary">{isEditing ? 'Edit Exam' : 'Create New'}</span>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            {isEditing ? 'Edit Mock Exam' : 'Admin Mock Exam Creator'}
                        </h1>
                        <p className="text-sm text-slate-500 font-medium mt-1.5">
                            Design and publish comprehensive mock exams for students.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            className="h-10 rounded-xl px-5 font-black border-gray-100 hover:bg-gray-50"
                            onClick={() => navigate('/manage-exams')}
                        >
                            Discard
                        </Button>
                        <Button
                            variant="outline"
                            className="h-10 rounded-xl px-5 font-black border-gray-100 bg-gray-50/50 hover:bg-gray-100"
                            onClick={() => submitExam(false)}
                            disabled={isSubmitting}
                        >
                            <Save size={18} className="mr-2" /> Save Draft
                        </Button>
                        <Button
                            className="h-10 rounded-xl px-6 bg-primary hover:bg-primary/95 text-white font-black"
                            onClick={() => submitExam(true)}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Publish Exam'}
                        </Button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left Column - General Info */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="p-5 pb-1">
                            <div className="flex items-center gap-3 text-primary mb-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-[10px] font-black">1</span>
                                <CardTitle className="text-sm font-black uppercase tracking-widest">General Information</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 pt-2 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Exam Title</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., LET 2024 Comprehensive Mock"
                                    className="h-11 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-semibold"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Duration (Minutes)</Label>
                                <div className="relative">
                                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                    <Input
                                        type="number"
                                        min={1}
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        className="pl-10 h-11 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-semibold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Deadline</Label>
                                <Input
                                    type="datetime-local"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className="h-11 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-semibold"
                                />
                            </div>

                            <div className="flex items-center space-x-3 p-2.5 rounded-xl border bg-gray-50/50 border-transparent">
                                <Checkbox
                                    id="close-on-deadline"
                                    checked={closeOnDeadline}
                                    onCheckedChange={(checked) => setCloseOnDeadline(Boolean(checked))}
                                    className="rounded-md border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <Label htmlFor="close-on-deadline" className="text-xs font-bold leading-none cursor-pointer">
                                    Automatically close exam on deadline
                                </Label>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Category</Label>
                                <Select value={category} onValueChange={(value) => setCategory(value as CategoryValue)}>
                                    <SelectTrigger className="h-11 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-semibold">
                                        <SelectValue placeholder="Select category" />
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

                            {isEditing && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Status</Label>
                                    <Select value={examStatus} onValueChange={(value) => setExamStatus(value as EditableExamStatus)}>
                                        <SelectTrigger className="h-11 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-semibold">
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

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Visible To</Label>
                                <div className="grid grid-cols-1 gap-2 max-h-[240px] overflow-y-auto pr-2 scrollbar-hide">
                                    {programs.map((program) => (
                                        <div
                                            key={program}
                                            className={`flex items-center space-x-3 p-2.5 rounded-xl border transition-all cursor-pointer ${selectedPrograms.includes(program)
                                                ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10'
                                                : 'bg-gray-50/50 border-transparent hover:bg-gray-100/50'
                                                }`}
                                            onClick={() => handleProgramToggle(program)}
                                        >
                                            <Checkbox
                                                id={program}
                                                checked={selectedPrograms.includes(program)}
                                                className="rounded-md border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                            <Label htmlFor={program} className="text-xs font-bold leading-none cursor-pointer">
                                                {program}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Exam Sections</Label>
                                <div className="flex flex-wrap gap-2 p-2.5 rounded-xl border border-dashed border-gray-200 bg-gray-50/30">
                                    {sections.map((section) => (
                                        <Badge
                                            key={section}
                                            className="bg-white text-gray-700 border-gray-100 font-bold text-[10px] px-3 py-1.5 rounded-xl flex items-center gap-2 group hover:border-red-100 hover:text-red-500 transition-all cursor-default shadow-sm"
                                        >
                                            {section}
                                            <button onClick={() => removeSection(section)} className="hover:text-red-600">
                                                <X size={12} />
                                            </button>
                                        </Badge>
                                    ))}
                                    {!isAddingSection ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-8 rounded-lg border-gray-200 bg-white text-[10px] font-black uppercase tracking-wider px-2.5"
                                            onClick={() => setIsAddingSection(true)}
                                        >
                                            <Plus size={12} className="mr-1" /> Add Section
                                        </Button>
                                    ) : (
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                                            Adding section in Question Management...
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide instructions for the students..."
                                    className="min-h-[96px] rounded-xl border-gray-100 shadow-none focus:ring-primary/20 font-medium text-sm leading-relaxed"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Question Management */}
                <div className="lg:col-span-2 space-y-5">
                    <div className="flex flex-col gap-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 text-primary">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-[10px] font-black">2</span>
                                <h3 className="text-sm font-black uppercase tracking-widest">Question Management</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    ref={importFileRef}
                                    type="file"
                                    accept=".csv,.json,application/json,text/csv"
                                    onChange={handleFileImport}
                                    className="hidden"
                                />
                                <Button variant="outline" className="h-9 rounded-lg border-gray-200 bg-white font-bold text-xs gap-2" onClick={triggerImport}>
                                    <FileUp size={14} /> Import CSV/JSON
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-9 w-16 rounded-lg border-gray-200 bg-white font-bold text-xs gap-1 px-2"
                                    onClick={() => downloadTemplate('csv')}
                                    title="Download CSV template"
                                >
                                    <FileSpreadsheet size={14} />
                                    <Download size={12} />
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-9 w-16 rounded-lg border-gray-200 bg-white font-bold text-xs gap-1 px-2"
                                    onClick={() => downloadTemplate('json')}
                                    title="Download JSON template"
                                >
                                    <FileJson size={14} />
                                    <Download size={12} />
                                </Button>
                                <Badge className="bg-gray-100 text-gray-500 border-none font-black text-[10px] px-3 py-1.5 rounded-lg">
                                    Total: {questions.length} Items
                                </Badge>
                            </div>
                        </div>

                        <p className="text-[11px] font-medium text-gray-500">
                            Import tip: <span className="font-bold">correctAnswer</span> can be <span className="font-bold">A/B/C/D</span>, <span className="font-bold">1/2/3/4</span>, <span className="font-bold">0/1/2/3</span>, or the exact option text.
                        </p>

                        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">Import Instructions</p>
                            <p className="text-[11px] text-gray-700 font-medium">1) One row/object = one question.</p>
                            <p className="text-[11px] text-gray-700 font-medium">2) Required fields: questionText, choiceA, choiceB, choiceC, choiceD, correctAnswer.</p>
                            <p className="text-[11px] text-gray-700 font-medium">3) Optional fields: imageUrl, rationalization, section.</p>
                            <p className="text-[11px] text-gray-500 font-medium">Edited headers still work (for example: "Correct Answer" or "choice a").</p>
                        </div>

                        {/* Section Tabs */}
                        <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-px">
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                                {[...sections, 'Uncategorized'].map((section) => (
                                    <button
                                        key={section}
                                        onClick={() => setActiveSection(section)}
                                        className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${activeSection === section
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        {section}
                                        <Badge className={`border-none ${activeSection === section ? 'bg-primary/10 text-primary' : 'bg-gray-50 text-gray-400'} text-[9px] px-1.5 py-0`}>
                                            {questions.filter(q => q.section === section).length}
                                        </Badge>
                                    </button>
                                ))}
                            </div>
                            <div className="shrink-0">
                                {!isAddingSection ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-8 rounded-lg border-gray-200 bg-white text-[10px] font-black uppercase tracking-wider px-2.5"
                                        onClick={() => setIsAddingSection(true)}
                                    >
                                        <Plus size={12} className="mr-1" /> Add Section
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            autoFocus
                                            value={newSectionName}
                                            onChange={(e) => setNewSectionName(e.target.value)}
                                            onKeyDown={handleAddSectionKeyDown}
                                            placeholder="Section name"
                                            className="h-8 w-36 rounded-lg border-gray-200 bg-white text-xs font-semibold"
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="h-8 rounded-lg px-2.5 text-[10px] font-black uppercase tracking-wider"
                                            onClick={confirmAddSection}
                                        >
                                            Add
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 rounded-lg px-2 text-[10px] font-black uppercase tracking-wider"
                                            onClick={cancelAddSection}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Questions List */}
                        <div className="space-y-5">
                            {filteredQuestions.length === 0 ? (
                                <div className="py-20 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/20">
                                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                                        <Library size={32} className="opacity-20 text-gray-900" />
                                    </div>
                                    <p className="font-bold text-sm tracking-tight text-gray-500 uppercase tracking-widest">No questions in this section yet</p>
                                    <Button
                                        variant="link"
                                        className="text-primary font-black uppercase tracking-widest text-xs mt-2"
                                        onClick={addQuestion}
                                    >
                                        Add the first question
                                    </Button>
                                </div>
                            ) : (
                                filteredQuestions.map((q, index) => (
                                    <Card key={q.id} className="rounded-2xl border-gray-100 shadow-sm overflow-hidden bg-white">
                                        <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-50 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-widest px-3 py-1">
                                                    Q#{index + 1}
                                                </Badge>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    {q.section}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    className="p-2 text-gray-300 hover:text-primary transition-colors hover:bg-white rounded-xl"
                                                    onClick={() => duplicateQuestion(q)}
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button
                                                    className="p-2 text-gray-300 hover:text-red-500 transition-colors hover:bg-white rounded-xl"
                                                    onClick={() => deleteQuestion(q.id)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <CardContent className="p-5 space-y-5">
                                            {/* Question Text */}
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center justify-between">
                                                    Question Text
                                                </Label>
                                                <Textarea
                                                    value={q.text}
                                                    onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                                                    placeholder="Enter your question here..."
                                                    className="min-h-[84px] rounded-xl border-gray-100 shadow-none focus:ring-primary/20 font-bold text-sm leading-relaxed"
                                                />
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    Question Image (Optional)
                                                </Label>
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(event) => {
                                                            void handleQuestionImageUpload(q.id, event);
                                                        }}
                                                        className="h-10 rounded-xl border-gray-100 shadow-none focus:ring-primary/20 text-xs font-semibold file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:text-primary"
                                                    />
                                                    {q.imageUrl && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className="h-10 rounded-xl border-gray-200 text-xs font-black uppercase tracking-widest"
                                                            onClick={() => updateQuestion(q.id, { imageUrl: '' })}
                                                        >
                                                            Remove Image
                                                        </Button>
                                                    )}
                                                </div>
                                                {q.imageUrl && (
                                                    <div className="rounded-2xl border border-gray-100 bg-gray-50/30 p-3">
                                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                                            <ImagePlus size={12} /> Image Preview
                                                        </div>
                                                        <img
                                                            src={q.imageUrl}
                                                            alt="Question attachment preview"
                                                            className="max-h-72 w-auto max-w-full rounded-xl border border-gray-100 object-contain bg-white"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Options */}
                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center justify-between">
                                                    Options
                                                    <span className="font-bold text-emerald-500 lowercase opacity-60">Select the correct answer</span>
                                                </Label>
                                                <RadioGroup
                                                    value={q.correctOption.toString()}
                                                    onValueChange={(val) => updateQuestion(q.id, { correctOption: parseInt(val) })}
                                                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                                >
                                                    {q.options.map((opt, optIdx) => (
                                                        <div
                                                            key={optIdx}
                                                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${q.correctOption === optIdx
                                                                ? 'bg-emerald-50/50 border-emerald-200 ring-1 ring-emerald-100'
                                                                : 'bg-white border-gray-100 hover:border-primary/20 group'
                                                                }`}
                                                        >
                                                            <div className="flex items-center pt-1">
                                                                <RadioGroupItem
                                                                    value={optIdx.toString()}
                                                                    id={`q-${q.id}-opt-${optIdx}`}
                                                                    className="border-gray-300 text-emerald-500 focus:ring-emerald-500"
                                                                />
                                                            </div>
                                                            <div className="flex-1 space-y-1">
                                                                <Label
                                                                    htmlFor={`q-${q.id}-opt-${optIdx}`}
                                                                    className={`text-[9px] font-black uppercase tracking-widest ${q.correctOption === optIdx ? 'text-emerald-600' : 'text-gray-400'
                                                                        }`}
                                                                >
                                                                    Option {String.fromCharCode(65 + optIdx)} {q.correctOption === optIdx && '(Correct Answer)'}
                                                                </Label>
                                                                <input
                                                                    type="text"
                                                                    value={opt}
                                                                    onChange={(e) => {
                                                                        const newOpts = [...q.options];
                                                                        newOpts[optIdx] = e.target.value;
                                                                        updateQuestion(q.id, { options: newOpts });
                                                                    }}
                                                                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                                                    className={`w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 ${q.correctOption === optIdx ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'
                                                                        }`}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            </div>

                                            {/* Rationale */}
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Rationale / Explanation</Label>
                                                <Textarea
                                                    value={q.rationale}
                                                    onChange={(e) => updateQuestion(q.id, { rationale: e.target.value })}
                                                    placeholder="Explain why this is the correct answer..."
                                                    className="min-h-[72px] rounded-xl border-gray-100 shadow-none focus:ring-primary/20 font-medium text-xs leading-relaxed bg-gray-50/30"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}

                            <div className="grid grid-cols-1 gap-4 mt-3">
                                <button
                                    onClick={addQuestion}
                                    className="py-8 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:text-primary hover:border-primary/30 hover:bg-primary/[0.01] transition-all group"
                                >
                                    <div className="bg-white p-4 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                        <Plus size={24} className="text-primary" />
                                    </div>
                                    <span className="font-black text-xs uppercase tracking-widest">Add New Question</span>
                                </button>
                            </div>
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
        </div>
    );
};

export default CreateExamPage;
