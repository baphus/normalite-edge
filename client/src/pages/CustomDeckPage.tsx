import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Upload,
    Download,
    Save,
    X,
    Layers,
    Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import { parseCsvRecords } from '@/lib/parseCsvRecords';
import { readUploadedText } from '@/lib/readUploadedText';
import { toast } from 'sonner';

interface CardItem {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

interface TrackOption {
    id: string;
    name: string;
    code?: string | null;
}

const categoryOptions = [
    { value: 'NONE', label: 'No Category' },
    { value: 'GENERAL_EDUCATION', label: 'General Education' },
    { value: 'PROFESSIONAL_EDUCATION', label: 'Professional Education' },
    { value: 'SPECIALIZATION', label: 'Specialization' },
] as const;

const CustomDeckPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdminOrReviewer = user?.role === 'ADMIN' || user?.role === 'REVIEWER';

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<(typeof categoryOptions)[number]['value']>('NONE');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [tracks, setTracks] = useState<TrackOption[]>([]);
    const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
    const [cards, setCards] = useState<CardItem[]>([
        { id: '1', question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' }
    ]);

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

            setCards((prev) => [...prev, ...importedCards]);
            toast.success(`Successfully imported ${importedCards.length} question(s) from ${file.name}.`);
        } catch (err) {
            console.error('Failed to parse import file', err);
            toast.error('Error parsing file. Please check the template format and try again.');
        }
    };

    const downloadTemplate = (type: 'json' | 'csv') => {
        const content = type === 'json'
            ? JSON.stringify({
                _comment: 'Use correctAnswer as A/B/C/D, 1/2/3/4, 0/1/2/3, or the exact option text.',
                cards: [
                    {
                        question: 'What is 2 + 2?',
                        option1: '1',
                        option2: '2',
                        option3: '3',
                        option4: '4',
                        correctAnswer: 'D',
                        explanation: '4 is the correct sum.',
                    },
                ],
            }, null, 2)
            : '# correctAnswer accepts A/B/C/D, 1/2/3/4, 0/1/2/3, or exact option text\nquestion,option1,option2,option3,option4,correctAnswer,explanation\n"What is 2 + 2?","1","2","3","4","D","4 is the correct sum."';

        const blob = new Blob([content], { type: type === 'json' ? 'application/json' : 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `template.${type}`;
        a.click();
    };

    const addTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const addCard = () => {
        setCards([...cards, {
            id: Date.now().toString(),
            question: '',
            options: ['', '', '', ''],
            correctIndex: 0,
            explanation: ''
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

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error('Please enter a deck title.');
            return;
        }

        try {
            const payload = {
                title,
                description: description || undefined,
                subject: tags[0] || 'General',
                category: category === 'NONE' ? null : category,
                visibility: isAdminOrReviewer ? 'PUBLISHED' : 'DRAFT',
                trackIds: selectedTrackIds,
                questions: cards.map(c => {
                    const filledChoices = c.options.map((opt, i) => opt.trim() || `Option ${i + 1}`);
                    return {
                        questionText: c.question.trim() || 'Empty Question',
                        choiceA: filledChoices[0],
                        choiceB: filledChoices[1],
                        choiceC: filledChoices[2],
                        choiceD: filledChoices[3],
                        correctChoice: ['A', 'B', 'C', 'D'][c.correctIndex],
                        rationalization: c.explanation || undefined,
                    };
                })
            };

            await api.post('/decks', payload);
            toast.success('Deck created successfully!');
            navigate('/study');
        } catch (error: any) {
            console.error('Failed to save deck:', error);
            const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            toast.error(`Failed to create deck: ${detail}`);
        }
    };

    return (
        <div className="flex flex-col gap-8 font-lexend pb-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/study')}
                        className="rounded-full hover:bg-white hover:shadow-md transition-all"
                    >
                        <ArrowLeft size={20} />
                    </Button>
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Create Study Material</h1>
                        <p className="text-sm text-gray-500 font-medium tracking-tight">Input your questions and answers to build your personal study material.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => navigate('/study')} className="h-11 rounded-2xl px-6 font-black border-gray-100 uppercase tracking-widest text-[10px]">
                        Discard
                    </Button>
                    <Button onClick={handleSave} className="h-11 rounded-2xl px-6 bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/20 gap-2 uppercase tracking-widest text-[10px]">
                        <Save size={16} /> Create Deck
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Deck Info */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="rounded-[2.5rem] border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden bg-white">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black flex items-center gap-2 text-gray-900">
                                <Info size={20} className="text-primary" /> Deck Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Deck Title</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., LET Review - English Terminology"
                                    className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20 font-bold"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Description</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What is this deck about?"
                                    className="min-h-[100px] rounded-2xl border-gray-100 shadow-none focus:ring-primary/20 font-medium py-4"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Category</Label>
                                <Select value={category} onValueChange={(value) => setCategory(value as (typeof categoryOptions)[number]['value'])}>
                                    <SelectTrigger className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20 font-bold">
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
                                {category === 'NONE' ? (
                                    <p className="text-[11px] text-gray-500 font-medium">
                                        No Category selected. This deck will stay uncategorized.
                                    </p>
                                ) : null}
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Tags</Label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {tags.map(tag => (
                                        <Badge key={tag} className="bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 rounded-xl px-3 py-1.5 font-bold text-[10px] uppercase tracking-widest group">
                                            {tag}
                                            <button onClick={() => removeTag(tag)} className="ml-2 hover:text-red-500 opacity-50 group-hover:opacity-100">
                                                <X size={10} />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addTag()}
                                        placeholder="Add tag..."
                                        className="h-10 rounded-xl border-gray-100 shadow-none focus:ring-primary/20 font-bold text-xs"
                                    />
                                    <Button size="icon" variant="outline" onClick={addTag} className="rounded-xl shrink-0 h-10 w-10 border-gray-100">
                                        <Plus size={16} />
                                    </Button>
                                </div>
                            </div>

                            {isAdminOrReviewer && (
                                <div className="space-y-4 pt-4 border-t border-gray-50">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Visibility Settings</Label>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/50 border border-transparent hover:border-primary/10 transition-colors cursor-pointer" onClick={() => setSelectedTrackIds([])}>
                                            <Checkbox checked={selectedTrackIds.length === 0} onCheckedChange={() => setSelectedTrackIds([])} />
                                            <span className="text-xs font-bold text-gray-700">All Programs</span>
                                        </div>
                                        <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2 scrollbar-hide">
                                            {tracks.map(track => (
                                                <div key={track.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toggleTrack(track.id)}>
                                                    <Checkbox checked={selectedTrackIds.includes(track.id)} onCheckedChange={() => toggleTrack(track.id)} />
                                                    <span className="text-[11px] font-semibold text-gray-700 tracking-tight">
                                                        {track.name}
                                                        {track.code ? <span className="text-gray-400 ml-1">({track.code})</span> : null}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2.5rem] bg-primary/5 border-primary/10 shadow-none overflow-hidden">
                        <CardContent className="p-8 space-y-4">
                            <h3 className="font-black text-primary text-sm uppercase tracking-widest">Import Data</h3>
                            <p className="text-xs font-medium text-gray-600 italic leading-relaxed">Want to speed things up? Import your questions from a JSON or CSV file using our templates.</p>
                            <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                                For <span className="font-bold">correctAnswer</span>, users may type <span className="font-bold">A/B/C/D</span>, <span className="font-bold">1/2/3/4</span>, <span className="font-bold">0/1/2/3</span>, or the exact option text.
                            </p>
                            <div className="rounded-xl border border-primary/20 bg-white/80 p-3 space-y-1.5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">How to fill the file</p>
                                <p className="text-[11px] text-gray-700 font-medium">1) One row/object = one question.</p>
                                <p className="text-[11px] text-gray-700 font-medium">2) Required: question, option1, option2, option3, option4, correctAnswer.</p>
                                <p className="text-[11px] text-gray-700 font-medium">3) Optional: explanation.</p>
                                <p className="text-[11px] text-gray-500 font-medium">You can rename headers (ex: "Correct Answer"), and upload still works.</p>
                            </div>
                            <div className="flex flex-col gap-2 pt-2">
                                <div className="relative">
                                    <Input
                                        type="file"
                                        accept=".json,.csv"
                                        onChange={handleImport}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <Button variant="outline" className="w-full justify-start gap-3 h-11 rounded-2xl border-primary/20 text-primary font-black uppercase tracking-widest text-[10px] hover:bg-primary/10 bg-white shadow-sm shadow-primary/5 pointer-events-none">
                                        <Upload size={16} /> Import JSON/CSV
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" onClick={() => downloadTemplate('csv')} className="flex-1 gap-2 h-10 rounded-xl text-gray-500 font-black uppercase tracking-widest text-[9px] hover:bg-white transition-colors">
                                        <Download size={14} /> .CSV
                                    </Button>
                                    <Button variant="ghost" onClick={() => downloadTemplate('json')} className="flex-1 gap-2 h-10 rounded-xl text-gray-500 font-black uppercase tracking-widest text-[9px] hover:bg-white transition-colors">
                                        <Download size={14} /> .JSON
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Questions */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                            <Layers size={24} className="text-primary" />
                            Questions & Answers
                            <Badge className="bg-gray-100 text-gray-500 rounded-full font-black ml-2 px-3 py-1 text-[10px] border-none shadow-inner">
                                {cards.length}
                            </Badge>
                        </h2>
                        <Button onClick={addCard} className="rounded-2xl bg-white border-2 border-primary/20 text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-[10px] px-6 shadow-sm shadow-primary/5">
                            <Plus size={16} className="mr-2" /> Add Card
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {cards.map((card, index) => (
                            <Card key={card.id} className="rounded-[2.5rem] border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden bg-white group animate-in slide-in-from-bottom-5 duration-500">
                                <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between space-y-0">
                                    <Badge className="bg-gray-100/50 text-gray-400 font-black px-4 py-1.5 rounded-xl text-[10px] uppercase tracking-widest border-none">
                                        Card #{index + 1}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeCard(card.id)}
                                        className="text-gray-300 hover:text-red-500 hover:bg-red-50 lg:opacity-0 group-hover:opacity-100 transition-all rounded-xl"
                                    >
                                        <Trash2 size={18} />
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-8 pt-4 space-y-8">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Question / Front of Card</Label>
                                        <Textarea
                                            value={card.question}
                                            onChange={(e) => updateCard(card.id, 'question', e.target.value)}
                                            placeholder="Enter your question here..."
                                            className="min-h-[80px] rounded-2xl border-gray-100 shadow-none focus:ring-primary/20 font-bold py-4 resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                        <div className="flex items-center justify-between md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Options & Correct Answer</Label>
                                            <span className="text-[9px] font-bold text-gray-400 italic uppercase">Select the radio button for the correct one</span>
                                        </div>
                                        {['A', 'B', 'C', 'D'].map((letter, i) => (
                                            <div key={letter} className={`flex items-center gap-3 p-1.5 rounded-2xl transition-all ${card.correctIndex === i ? 'bg-primary/5 ring-1 ring-primary/10 shadow-sm' : 'bg-gray-50/30'}`}>
                                                <div className="relative flex items-center justify-center pl-2">
                                                    <input
                                                        type="radio"
                                                        name={`correct-${card.id}`}
                                                        checked={card.correctIndex === i}
                                                        onChange={() => updateCard(card.id, 'correctIndex', i)}
                                                        className="w-5 h-5 text-primary focus:ring-primary border-gray-200 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="flex-1 flex gap-2 items-center">
                                                    <span className={`font-black text-xs ${card.correctIndex === i ? 'text-primary' : 'text-gray-300'}`}>{letter}</span>
                                                    <Input
                                                        value={card.options[i]}
                                                        onChange={(e) => updateOption(card.id, i, e.target.value)}
                                                        placeholder={`Option ${letter}`}
                                                        className={`h-11 rounded-1.5xl border-transparent shadow-none focus:ring-primary/20 font-bold text-sm ${card.correctIndex === i ? 'bg-white border-primary/10' : 'bg-transparent border-gray-100/50'}`}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Rationalization (Optional explanation)</Label>
                                        <Textarea
                                            value={card.explanation}
                                            onChange={(e) => updateCard(card.id, 'explanation', e.target.value)}
                                            placeholder="Why is this answer correct?"
                                            className="min-h-[60px] rounded-2xl border-gray-100 shadow-none focus:ring-primary/20 font-medium py-3 text-sm resize-none"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Button onClick={addCard} variant="outline" className="w-full py-12 rounded-[2.5rem] border-2 border-dashed border-gray-100 hover:border-primary/30 hover:bg-primary/[0.01] hover:text-primary transition-all group">
                        <div className="flex flex-col items-center gap-2">
                            <Plus size={24} className="text-gray-300 group-hover:text-primary group-hover:scale-110 transition-all" />
                            <span className="font-black uppercase tracking-widest text-xs">Add Another Question</span>
                        </div>
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CustomDeckPage;
