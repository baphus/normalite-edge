import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import {
    ChevronRight,
    ChevronUp,
    ChevronDown,
    GripVertical,
    Plus,
    Trash2,
    FileUp,
    FileJson,
    Save,
    ImagePlus,
    Library,
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
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import { parseCsvRecords } from '@/lib/parseCsvRecords';
import { readUploadedText } from '@/lib/readUploadedText';
import { uploadImageToCloudinary } from '@/lib/upload';
import { toast } from 'sonner';

interface CardItem {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    imageUrl?: string;
}

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
    categoryCode?: 'GENERAL_EDUCATION' | 'PROFESSIONAL_EDUCATION' | 'SPECIALIZATION' | null;
    trackIds?: string[];
    visibility?: 'DRAFT' | 'PUBLISHED';
    questions?: DeckQuestionApi[];
}

const categoryOptions = [
    { value: 'NONE', label: 'No Category' },
    { value: 'GENERAL_EDUCATION', label: 'General Education' },
    { value: 'PROFESSIONAL_EDUCATION', label: 'Professional Education' },
    { value: 'SPECIALIZATION', label: 'Specialization' },
] as const;

type CategoryValue = (typeof categoryOptions)[number]['value'];

const OPTION_DISPLAY_ORDER = [0, 2, 1, 3];

const ExcelTemplateIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
        <rect x="3" y="4" width="8" height="16" rx="1.5" fill="#107C41" />
        <path d="M6.2 9L7.9 12L6.2 15H7.8L8.8 13.1L9.8 15H11.4L9.7 12L11.4 9H9.8L8.8 10.9L7.8 9H6.2Z" fill="white" />
        <path d="M10 6.5C10 5.67157 10.6716 5 11.5 5H18.5C19.3284 5 20 5.67157 20 6.5V17.5C20 18.3284 19.3284 19 18.5 19H11.5C10.6716 19 10 18.3284 10 17.5V6.5Z" fill="#33C481" />
        <path d="M12.5 8H17.5M12.5 11H17.5M12.5 14H17.5M12.5 17H17.5" stroke="white" strokeWidth="1.25" strokeLinecap="round" opacity="0.95" />
    </svg>
);

interface SortableDeckCardProps {
    card: CardItem;
    index: number;
    totalCards: number;
    onRemoveCard: (id: string) => void;
    onUpdateCard: (id: string, field: keyof CardItem, value: any) => void;
    onUpdateOption: (cardId: string, optionIndex: number, value: string) => void;
    onCardImageUpload: (cardId: string, event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    onMoveCard: (cardId: string, direction: 'up' | 'down') => void;
}

const SortableDeckCard: React.FC<SortableDeckCardProps> = ({
    card,
    index,
    totalCards,
    onRemoveCard,
    onUpdateCard,
    onUpdateOption,
    onCardImageUpload,
    onMoveCard,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: card.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className={`rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white ${isDragging ? 'opacity-70 shadow-lg ring-2 ring-primary/20' : ''}`}
        >
            <div className="bg-slate-50/60 px-4 py-2.5 border-b border-slate-100 flex justify-between items-center gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <button
                        type="button"
                        className="p-1.5 text-slate-300 hover:text-primary transition-colors hover:bg-white rounded-lg cursor-grab active:cursor-grabbing"
                        {...attributes}
                        {...listeners}
                        title="Drag to reorder"
                    >
                        <GripVertical size={14} />
                    </button>
                    <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase tracking-widest px-2 py-1">
                        Q{index + 1}
                    </Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        className="p-1.5 text-slate-300 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-white rounded-lg"
                        onClick={() => onMoveCard(card.id, 'up')}
                        disabled={index === 0}
                        title="Move up"
                    >
                        <ChevronUp size={13} />
                    </button>
                    <button
                        type="button"
                        className="p-1.5 text-slate-300 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-white rounded-lg"
                        onClick={() => onMoveCard(card.id, 'down')}
                        disabled={index === totalCards - 1}
                        title="Move down"
                    >
                        <ChevronDown size={13} />
                    </button>
                    <button
                        onClick={() => onRemoveCard(card.id)}
                        disabled={totalCards <= 1}
                        className="p-1.5 text-slate-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-white rounded-lg"
                        title="Delete"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>
            <CardContent className="p-4 space-y-4">
                <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Question</Label>
                    <Textarea
                        value={card.question}
                        onChange={(e) => onUpdateCard(card.id, 'question', e.target.value)}
                        placeholder="Enter your question here..."
                        className="min-h-18 rounded-xl border-slate-100 shadow-none focus:ring-primary/20 font-semibold text-sm leading-relaxed resize-none"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Image <span className="lowercase font-medium text-slate-300">(optional)</span></Label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label className={`flex items-center gap-2 h-9 px-3 rounded-xl border cursor-pointer transition-all text-[10px] font-black uppercase tracking-wider ${card.imageUrl ? 'border-slate-200 bg-white text-slate-500 hover:border-slate-300' : 'border-dashed border-slate-200 bg-slate-50/50 text-slate-400 hover:bg-slate-50 hover:border-slate-300'}`}>
                            <ImagePlus size={13} />
                            {card.imageUrl ? 'Replace' : 'Upload Image'}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(event) => { void onCardImageUpload(card.id, event); }}
                                className="hidden"
                            />
                        </label>
                        {card.imageUrl && (
                            <button
                                type="button"
                                className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
                                onClick={() => onUpdateCard(card.id, 'imageUrl', '')}
                            >
                                Remove
                            </button>
                        )}
                    </div>
                    {card.imageUrl && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-2">
                            <img
                                src={card.imageUrl}
                                alt="Card attachment"
                                className="max-h-48 w-auto max-w-full rounded-lg border border-slate-100 object-contain bg-white"
                            />
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Options</Label>
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest opacity-70">Click radio to set correct</span>
                    </div>
                    <RadioGroup
                        value={card.correctIndex.toString()}
                        onValueChange={(val) => onUpdateCard(card.id, 'correctIndex', parseInt(val))}
                        className="grid grid-cols-1 md:grid-cols-2 gap-2"
                    >
                        {OPTION_DISPLAY_ORDER.map((i) => (
                            <div
                                key={i}
                                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                                    card.correctIndex === i
                                        ? 'bg-emerald-50/60 border-emerald-200 ring-1 ring-emerald-100'
                                        : 'bg-white border-slate-100 hover:border-primary/20'
                                }`}
                            >
                                <RadioGroupItem
                                    value={i.toString()}
                                    id={`card-${card.id}-opt-${i}`}
                                    className="border-slate-300 text-emerald-500 focus:ring-emerald-500 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <label
                                        htmlFor={`card-${card.id}-opt-${i}`}
                                        className={`text-[9px] font-black uppercase tracking-widest block mb-0.5 ${
                                            card.correctIndex === i ? 'text-emerald-600' : 'text-slate-300'
                                        }`}
                                    >
                                        {String.fromCharCode(65 + i)}{card.correctIndex === i && ' · Correct'}
                                    </label>
                                    <input
                                        type="text"
                                        value={card.options[i] || ''}
                                        onChange={(e) => onUpdateOption(card.id, i, e.target.value)}
                                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                        className={`w-full bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 outline-none ${
                                            card.correctIndex === i ? 'text-slate-900' : 'text-slate-500'
                                        }`}
                                    />
                                </div>
                            </div>
                        ))}
                    </RadioGroup>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Explanation <span className="lowercase font-medium text-slate-300">(optional)</span></Label>
                    <Textarea
                        value={card.explanation}
                        onChange={(e) => onUpdateCard(card.id, 'explanation', e.target.value)}
                        placeholder="Why is this answer correct?"
                        className="min-h-15 rounded-xl border-slate-100 shadow-none focus:ring-primary/20 font-medium text-xs leading-relaxed bg-slate-50/40 resize-none"
                    />
                </div>
            </CardContent>
        </Card>
    );
};

const StudyMaterialEditorPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);
    const { user } = useAuth();
    const isAdminOrReviewer = user?.role === 'ADMIN' || user?.role === 'REVIEWER';

    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<CategoryValue>('NONE');
    const [tracks, setTracks] = useState<TrackOption[]>([]);
    const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
    const [deckVisibility, setDeckVisibility] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingDeck, setIsLoadingDeck] = useState(false);
    const importFileRef = useRef<HTMLInputElement | null>(null);
    const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
    const [importPreviewCards, setImportPreviewCards] = useState<CardItem[]>([]);
    const [cards, setCards] = useState<CardItem[]>([
        { id: '1', question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', imageUrl: '' }
    ]);
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8,
        },
    }));

    useEffect(() => {
        const fetchTracks = async () => {
            try {
                const response = await api.get('/tracks');
                const items = response.data?.data || [];
                setTracks(items);
            } catch (error) {
                console.error('Failed to load tracks', error);
            }
        };

        fetchTracks();
    }, []);

    useEffect(() => {
        if (!isEditing || !id) {
            return;
        }

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
                setCategory((deck.categoryCode as CategoryValue) || 'NONE');
                setSelectedTrackIds(deck.trackIds || []);
                setDeckVisibility(deck.visibility === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT');

                const mappedCards = (deck.questions || [])
                    .slice()
                    .sort((first, second) => (first.orderNo || 0) - (second.orderNo || 0))
                    .map((question, index) => {
                        const letters = ['A', 'B', 'C', 'D'];
                        const resolvedCorrectChoice = (question.correctChoice || 'A').toUpperCase();
                        const correctIndex = letters.indexOf(resolvedCorrectChoice);

                        return {
                            id: question.id || `${Date.now()}-${index}`,
                            question: question.questionText || '',
                            options: [
                                question.choiceA || '',
                                question.choiceB || '',
                                question.choiceC || '',
                                question.choiceD || '',
                            ],
                            correctIndex: correctIndex >= 0 ? correctIndex : 0,
                            explanation: question.rationalization || '',
                            imageUrl: question.imageUrl || '',
                        };
                    });

                setCards(
                    mappedCards.length > 0
                        ? mappedCards
                        : [{ id: '1', question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', imageUrl: '' }]
                );
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

    const toggleTrack = (trackId: string) => {
        setSelectedTrackIds((prev) =>
            prev.includes(trackId)
                ? prev.filter((id) => id !== trackId)
                : [...prev, trackId]
        );
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

    const resolveCorrectIndex = (rawValue: unknown, options: string[]) => {
        if (rawValue === null || rawValue === undefined) return 0;

        const normalized = String(rawValue).trim();
        if (!normalized) return 0;

        const upper = normalized.toUpperCase();

        if (['A', 'B', 'C', 'D'].includes(upper)) {
            return ['A', 'B', 'C', 'D'].indexOf(upper);
        }

        const asNumber = Number(normalized);
        if (!Number.isNaN(asNumber)) {
            if (asNumber >= 1 && asNumber <= 4) return asNumber - 1;
            if (asNumber >= 0 && asNumber <= 3) return asNumber;
        }

        const matchedIndex = options.findIndex(
            (option) => option.trim().toLowerCase() === normalized.toLowerCase()
        );

        return matchedIndex >= 0 ? matchedIndex : 0;
    };

    const mapRecordToCard = (record: Record<string, any>, index: number): CardItem | null => {
        const question = String(
            pickImportValue(record, ['question', 'questionText', 'front', 'prompt']) ?? ''
        ).trim();

        if (!question) return null;

        const optionsValue = pickImportValue(record, ['options']);
        const mappedOptions = Array.isArray(optionsValue)
            ? optionsValue
            : typeof optionsValue === 'string' && optionsValue.includes('|')
                ? optionsValue.split('|').map((item) => item.trim())
            : [
                pickImportValue(record, ['option1', 'choiceA', 'optionA', 'a']) ?? '',
                pickImportValue(record, ['option2', 'choiceB', 'optionB', 'b']) ?? '',
                pickImportValue(record, ['option3', 'choiceC', 'optionC', 'c']) ?? '',
                pickImportValue(record, ['option4', 'choiceD', 'optionD', 'd']) ?? '',
            ];

        const options = [0, 1, 2, 3].map((optionIndex) =>
            String(mappedOptions[optionIndex] ?? '').trim()
        );

        const correctValue =
            pickImportValue(record, [
                'correctAnswer',
                'correct_answer',
                'correctOption',
                'correct_choice',
                'correct_answer_index',
                'answer',
            ]);

        const correctIndex = resolveCorrectIndex(correctValue, options);

        return {
            id: `${Date.now()}-${index}-${Math.random()}`,
            question,
            options,
            correctIndex,
            explanation: String(
                pickImportValue(record, ['explanation', 'rationalization', 'rationale']) ?? ''
            ).trim(),
            imageUrl: '',
        };
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        try {
            const content = await readUploadedText(file);
            const lowerFileName = file.name.toLowerCase();

            let records: Array<Record<string, any>> = [];
            if (lowerFileName.endsWith('.json')) {
                const parsed = JSON.parse(content);
                records = Array.isArray(parsed)
                    ? parsed
                    : Array.isArray(parsed?.cards)
                        ? parsed.cards
                        : [];
            } else if (lowerFileName.endsWith('.csv')) {
                records = parseCsvRecords(content);
            } else {
                toast.error('Unsupported file type. Please upload a JSON or CSV file.');
                return;
            }

            const importedCards = records
                .map((record, idx) => mapRecordToCard(record, idx))
                .filter((item): item is CardItem => !!item);

            if (importedCards.length === 0) {
                toast.error('No valid questions found in the uploaded file. Please use the template.');
                return;
            }

            setImportPreviewCards(importedCards);
            setIsImportPreviewOpen(true);
        } catch (err) {
            console.error('Failed to parse import file', err);
            toast.error('Error parsing file. Please check the template format and try again.');
        }
    };

    const triggerImport = () => {
        importFileRef.current?.click();
    };

    const downloadTemplate = (type: 'json' | 'csv') => {
        const content = type === 'json'
            ? JSON.stringify([
                {
                    question: 'What is 2 + 2?',
                    option1: '1',
                    option2: '2',
                    option3: '3',
                    option4: '4',
                    correctAnswer: 'D',
                    explanation: '4 is the correct sum.',
                },
            ], null, 2)
            : 'question,option1,option2,option3,option4,correctAnswer,explanation\n"What is 2 + 2?","1","2","3","4","D","4 is the correct sum."';

        const blob = new Blob([content], { type: type === 'json' ? 'application/json' : 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `study-material-template.${type}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const addCard = () => {
        setCards([...cards, {
            id: Date.now().toString(),
            question: '',
            options: ['', '', '', ''],
            correctIndex: 0,
            explanation: '',
            imageUrl: ''
        }]);
    };

    const removeCard = (id: string) => {
        if (cards.length > 1) {
            setCards(cards.filter(card => card.id !== id));
        }
    };

    const updateCard = (id: string, field: keyof CardItem, value: any) => {
        setCards(cards.map(card => card.id === id ? { ...card, [field]: value } : card));
    };

    const updateOption = (cardId: string, optionIndex: number, value: string) => {
        setCards(cards.map(card => {
            if (card.id === cardId) {
                const newOptions = [...card.options];
                newOptions[optionIndex] = value;
                return { ...card, options: newOptions };
            }
            return card;
        }));
    };

    const moveCard = (cardId: string, direction: 'up' | 'down') => {
        setCards((prev) => {
            const currentIndex = prev.findIndex((card) => card.id === cardId);
            if (currentIndex < 0) {
                return prev;
            }

            const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
            if (targetIndex < 0 || targetIndex >= prev.length) {
                return prev;
            }

            return arrayMove(prev, currentIndex, targetIndex);
        });
    };

    const handleCardDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        setCards((prev) => {
            const currentIndex = prev.findIndex((card) => card.id === String(active.id));
            const targetIndex = prev.findIndex((card) => card.id === String(over.id));

            if (currentIndex < 0 || targetIndex < 0) {
                return prev;
            }

            return arrayMove(prev, currentIndex, targetIndex);
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

    const handleCardImageUpload = async (cardId: string, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (!validateImageFile(file)) {
            return;
        }

        try {
            const secureUrl = await uploadImageToCloudinary(file, 'question-images');
            updateCard(cardId, 'imageUrl', secureUrl);
            toast.success('Image attached successfully.');
        } catch (error) {
            console.error('Failed to attach card image', error);
            toast.error('Failed to attach image. Please try again.');
        }
    };

    const updateImportPreviewCard = (cardId: string, updates: Partial<CardItem>) => {
        setImportPreviewCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, ...updates } : card)));
    };

    const updateImportPreviewOption = (cardId: string, optionIndex: number, value: string) => {
        setImportPreviewCards((prev) => prev.map((card) => {
            if (card.id !== cardId) {
                return card;
            }

            const nextOptions = [...card.options];
            nextOptions[optionIndex] = value;
            return { ...card, options: nextOptions };
        }));
    };

    const handleImportPreviewImageUpload = async (cardId: string, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (!validateImageFile(file)) {
            return;
        }

        try {
            const secureUrl = await uploadImageToCloudinary(file, 'question-images');
            updateImportPreviewCard(cardId, { imageUrl: secureUrl });
            toast.success('Image attached to imported question.');
        } catch (error) {
            console.error('Failed to attach imported card image', error);
            toast.error('Failed to attach image. Please try again.');
        }
    };

    const applyImportedCards = () => {
        if (importPreviewCards.length === 0) {
            setIsImportPreviewOpen(false);
            return;
        }

        setCards((prev) => [...prev, ...importPreviewCards]);
        setIsImportPreviewOpen(false);
        setImportPreviewCards([]);
        toast.success(`Successfully imported ${importPreviewCards.length} question(s).`);
    };

    const doSubmit = async (publish: boolean) => {
        if (!title.trim()) {
            toast.error('Please enter a deck title.');
            return;
        }

        const preparedCards = cards.map((card) => {
            const questionText = card.question.trim();
            const choices = card.options.map((option) => option.trim());
            const rationalization = card.explanation.trim();
            const imageUrl = card.imageUrl?.trim() || undefined;

            return {
                questionText,
                choices,
                correctChoice: ['A', 'B', 'C', 'D'][card.correctIndex],
                rationalization: rationalization || undefined,
                imageUrl,
                hasAnyContent:
                    questionText.length > 0
                    || Boolean(imageUrl)
                    || choices.some((choice) => choice.length > 0)
                    || rationalization.length > 0,
            };
        });

        const cardsWithContent = preparedCards.filter((card) => card.hasAnyContent);

        if (cardsWithContent.length === 0) {
            toast.error('Please add at least one question to the deck.');
            return;
        }

        if (cardsWithContent.some((card) => card.questionText.length === 0)) {
            toast.error('Please complete or remove deck items without a question.');
            return;
        }

        if (cardsWithContent.some((card) => card.choices.some((choice) => choice.length === 0))) {
            toast.error('Please complete all four options for each deck question.');
            return;
        }

        const nextVisibility: 'DRAFT' | 'PUBLISHED' = publish ? 'PUBLISHED' : 'DRAFT';

        const payload = {
            title: title.trim(),
            subject: subject.trim() || undefined,
            description: description.trim() || undefined,
            category: category === 'NONE' ? null : category,
            visibility: nextVisibility,
            trackIds: selectedTrackIds,
            questions: cardsWithContent.map((card, index) => {
                return {
                    orderNo: index + 1,
                    questionText: card.questionText,
                    imageUrl: card.imageUrl,
                    choiceA: card.choices[0],
                    choiceB: card.choices[1],
                    choiceC: card.choices[2],
                    choiceD: card.choices[3],
                    correctChoice: card.correctChoice,
                    rationalization: card.rationalization,
                };
            })
        };

        setIsSubmitting(true);
        try {
            if (isEditing && id) {
                await api.put(`/decks/${id}`, payload);
                setDeckVisibility(nextVisibility);
                toast.success(nextVisibility === 'PUBLISHED' ? 'Study material updated and published.' : 'Study material draft updated.');
            } else {
                await api.post('/decks', payload);
                toast.success(nextVisibility === 'PUBLISHED' ? 'Study material published successfully.' : 'Study material saved as draft.');
            }
            navigate('/materials');
        } catch (error: any) {
            console.error('Failed to save deck:', error);
            const message = error.response?.data?.message || 'Failed to save study material.';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitIntent = (publish: boolean) => {
        void doSubmit(publish);
    };

    if (isLoadingDeck) {
        return <div className="p-6 font-lexend">Loading study material details...</div>;
    }

    return (
        <div className="flex flex-col gap-5 font-lexend pb-8">
            <header className="bg-white rounded-2xl px-5 py-4 md:px-6 border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                            <Link to="/materials" className="hover:text-primary transition-colors">Materials</Link>
                            <ChevronRight size={11} />
                            <span className="text-primary">{isEditing ? 'Edit Deck' : 'New Deck'}</span>
                        </div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">
                            {isEditing ? 'Edit Study Material' : 'Create Study Material'}
                        </h1>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                            Design and publish question decks using the same focused workflow as exam creation.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="ghost"
                            className="h-9 rounded-xl px-4 font-black text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                            onClick={() => navigate('/materials')}
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
                            className="h-9 rounded-xl px-5 bg-primary hover:bg-primary/90 text-white font-black text-xs gap-1.5"
                            onClick={() => handleSubmitIntent(true)}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : isEditing ? 'Save & Publish' : 'Publish'}
                        </Button>
                    </div>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-slate-500">
                    Draft materials stay hidden from reviewees until published.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5 lg:order-1">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 text-primary">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600">Question Management</h3>
                                <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[9px] px-2 py-1 rounded-md">
                                    {cards.length} {cards.length === 1 ? 'item' : 'items'}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    ref={importFileRef}
                                    type="file"
                                    accept=".csv,.json,application/json,text/csv"
                                    onChange={handleImport}
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
                                    <ExcelTemplateIcon /> Download Template
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

                        <div className="space-y-3">
                            {cards.length === 0 ? (
                                <div className="py-16 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30">
                                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center mb-3">
                                        <Library size={20} className="opacity-40 text-slate-600" />
                                    </div>
                                    <p className="font-black text-[10px] tracking-widest uppercase text-slate-400">No questions yet</p>
                                    <p className="text-[11px] font-medium text-slate-400 mt-1">Add questions manually or import a file</p>
                                    <Button
                                        variant="outline"
                                        className="mt-3 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest border-slate-200 text-primary hover:bg-primary/5"
                                        onClick={addCard}
                                    >
                                        <Plus size={12} className="mr-1" /> Add Question
                                    </Button>
                                </div>
                            ) : (
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCardDragEnd}>
                                    <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-3">
                                            {cards.map((card, index) => (
                                                <SortableDeckCard
                                                    key={card.id}
                                                    card={card}
                                                    index={index}
                                                    totalCards={cards.length}
                                                    onRemoveCard={removeCard}
                                                    onUpdateCard={updateCard}
                                                    onUpdateOption={updateOption}
                                                    onCardImageUpload={handleCardImageUpload}
                                                    onMoveCard={moveCard}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            )}

                            <button
                                onClick={addCard}
                                className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-100 py-3.5 text-slate-400 transition-all hover:border-primary/25 hover:bg-primary/1.5 hover:text-primary"
                            >
                                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-100 bg-white shadow-sm transition-transform group-hover:scale-110">
                                    <Plus size={14} className="text-primary" />
                                </div>
                                <span className="font-black text-[10px] uppercase tracking-widest">Add Question</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6 lg:order-2 lg:self-start lg:sticky lg:top-5">
                    <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="px-5 pt-5 pb-3 border-b border-slate-50">
                            <div className="flex items-center gap-2.5 text-primary">
                                <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-600">General Information</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Material Title</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., LET Review – English Terminology"
                                    className="h-10 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-semibold text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject</Label>
                                <Input
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="e.g., English"
                                    className="h-10 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-semibold text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</Label>
                                <Select value={category} onValueChange={(value) => setCategory(value as CategoryValue)}>
                                    <SelectTrigger className="h-10 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-semibold text-sm">
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
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Visibility</Label>
                                    <Badge
                                        className={`border font-black text-[10px] uppercase tracking-widest w-fit ${deckVisibility === 'PUBLISHED'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-amber-200 bg-amber-50 text-amber-700'
                                            }`}
                                    >
                                        {deckVisibility}
                                    </Badge>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description <span className="lowercase text-slate-300 font-medium">(optional)</span></Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What is this deck about?"
                                    className="min-h-20 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-medium text-sm leading-relaxed resize-none"
                                />
                            </div>

                            {isAdminOrReviewer && (
                                <>
                                    <div className="border-t border-slate-100" />
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Visible To</Label>
                                        <div className="grid grid-cols-1 gap-1.5 max-h-50 overflow-y-auto pr-1 scrollbar-hide">
                                            <div
                                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                                                    selectedTrackIds.length === 0
                                                        ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10'
                                                        : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                                                }`}
                                                onClick={() => setSelectedTrackIds([])}
                                            >
                                                <Checkbox
                                                    checked={selectedTrackIds.length === 0}
                                                    onCheckedChange={() => setSelectedTrackIds([])}
                                                    className="rounded-md border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-3.5 w-3.5"
                                                />
                                                <Label className="text-xs font-bold leading-none cursor-pointer">All Programs</Label>
                                            </div>
                                            {tracks.map(track => (
                                                <div
                                                    key={track.id}
                                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                                                        selectedTrackIds.includes(track.id)
                                                            ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10'
                                                            : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                                                    }`}
                                                    onClick={() => toggleTrack(track.id)}
                                                >
                                                    <Checkbox
                                                        checked={selectedTrackIds.includes(track.id)}
                                                        onCheckedChange={() => toggleTrack(track.id)}
                                                        className="rounded-md border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-3.5 w-3.5"
                                                    />
                                                    <Label className="text-xs font-semibold leading-none cursor-pointer">
                                                        {track.name}
                                                        {track.code ? <span className="text-slate-400 ml-1 font-normal">({track.code})</span> : null}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
                <DialogContent className="max-w-4xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Review Imported Questions</DialogTitle>
                        <DialogDescription>
                            {importPreviewCards.length} parsed questions found. Review, edit, and upload images here before adding them to this study material.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                        {importPreviewCards.map((card, index) => (
                            <div key={card.id} className="border border-gray-100 rounded-xl p-4 space-y-4 bg-white">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-black text-gray-600 uppercase tracking-widest">Question {index + 1}</p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Question</Label>
                                    <Textarea
                                        value={card.question}
                                        onChange={(event) => updateImportPreviewCard(card.id, { question: event.target.value })}
                                        placeholder="Enter your question here..."
                                        className="min-h-18 rounded-xl border-slate-100 shadow-none focus:ring-primary/20 font-semibold text-sm leading-relaxed resize-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Image <span className="lowercase font-medium text-slate-300">(optional)</span></Label>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <label className={`flex items-center gap-2 h-9 px-3 rounded-xl border cursor-pointer transition-all text-[10px] font-black uppercase tracking-wider ${card.imageUrl ? 'border-slate-200 bg-white text-slate-500 hover:border-slate-300' : 'border-dashed border-slate-200 bg-slate-50/50 text-slate-400 hover:bg-slate-50 hover:border-slate-300'}`}>
                                            <ImagePlus size={13} />
                                            {card.imageUrl ? 'Replace' : 'Upload Image'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(event) => { void handleImportPreviewImageUpload(card.id, event); }}
                                                className="hidden"
                                            />
                                        </label>
                                        {card.imageUrl && (
                                            <button
                                                type="button"
                                                className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
                                                onClick={() => updateImportPreviewCard(card.id, { imageUrl: '' })}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    {card.imageUrl && (
                                        <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-2">
                                            <img
                                                src={card.imageUrl}
                                                alt="Imported card attachment"
                                                className="max-h-48 w-auto max-w-full rounded-lg border border-slate-100 object-contain bg-white"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Options</Label>
                                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest opacity-70">Click radio to set correct</span>
                                    </div>
                                    <RadioGroup
                                        value={card.correctIndex.toString()}
                                        onValueChange={(value) => updateImportPreviewCard(card.id, { correctIndex: parseInt(value) })}
                                        className="grid grid-cols-1 md:grid-cols-2 gap-2"
                                    >
                                        {OPTION_DISPLAY_ORDER.map((optionIndex) => (
                                            <div
                                                key={`${card.id}-${optionIndex}`}
                                                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${card.correctIndex === optionIndex
                                                    ? 'bg-emerald-50/60 border-emerald-200 ring-1 ring-emerald-100'
                                                    : 'bg-white border-slate-100 hover:border-primary/20'
                                                    }`}
                                            >
                                                <RadioGroupItem
                                                    value={optionIndex.toString()}
                                                    id={`import-card-${card.id}-opt-${optionIndex}`}
                                                    className="border-slate-300 text-emerald-500 focus:ring-emerald-500 shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <label
                                                        htmlFor={`import-card-${card.id}-opt-${optionIndex}`}
                                                        className={`text-[9px] font-black uppercase tracking-widest block mb-0.5 ${card.correctIndex === optionIndex ? 'text-emerald-600' : 'text-slate-300'}`}
                                                    >
                                                        {String.fromCharCode(65 + optionIndex)}{card.correctIndex === optionIndex && ' · Correct'}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={card.options[optionIndex] || ''}
                                                        onChange={(event) => updateImportPreviewOption(card.id, optionIndex, event.target.value)}
                                                        placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                                        className={`w-full bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 outline-none ${card.correctIndex === optionIndex ? 'text-slate-900' : 'text-slate-500'}`}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Explanation <span className="lowercase font-medium text-slate-300">(optional)</span></Label>
                                    <Textarea
                                        value={card.explanation}
                                        onChange={(event) => updateImportPreviewCard(card.id, { explanation: event.target.value })}
                                        placeholder="Why is this answer correct?"
                                        className="min-h-15 rounded-xl border-slate-100 shadow-none focus:ring-primary/20 font-medium text-xs leading-relaxed bg-slate-50/40 resize-none"
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
                                setImportPreviewCards([]);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="button" onClick={applyImportedCards}>
                            Add Imported Questions
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default StudyMaterialEditorPage;
