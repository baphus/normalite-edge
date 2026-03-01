import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    ChevronRight,
    Plus,
    Trash2,
    Upload,
    Download,
    Save,
    X,
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
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';

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

const StudyMaterialEditorPage: React.FC = () => {
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

    const parseCsvRecords = (content: string) => {
        const rows = content
            .replace(/^\uFEFF/, '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0 && !line.startsWith('#'));

        if (rows.length < 2) return [] as Array<Record<string, string>>;

        const headers = parseCsvLine(rows[0]);
        return rows.slice(1).map((line) => {
            const values = parseCsvLine(line);
            return headers.reduce<Record<string, string>>((acc, header, idx) => {
                acc[header] = values[idx] || '';
                return acc;
            }, {});
        });
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        try {
            const content = await file.text();
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
                alert('Unsupported file type. Please upload a JSON or CSV file.');
                return;
            }

            const importedCards = records
                .map((record, idx) => mapRecordToCard(record, idx))
                .filter((item): item is CardItem => !!item);

            if (importedCards.length === 0) {
                alert('No valid questions found in the uploaded file. Please use the template.');
                return;
            }

            setCards((prev) => [...prev, ...importedCards]);
            alert(`Successfully imported ${importedCards.length} question(s) from ${file.name}.`);
        } catch (err) {
            console.error('Failed to parse import file', err);
            alert('Error parsing file. Please check the template format and try again.');
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
            alert('Please enter a deck title');
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
            alert('Deck created successfully!');
            navigate('/study');
        } catch (error: any) {
            console.error('Failed to save deck:', error);
            const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            alert(`Failed to create deck: ${detail}`);
        }
    };

    return (
        <div className="flex flex-col gap-5 font-lexend pb-8">
            {/* Header */}
            <header className="bg-white rounded-2xl px-5 py-4 md:px-6 border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                            <Link to="/study" className="hover:text-primary transition-colors">Study Hub</Link>
                            <ChevronRight size={11} />
                            <span className="text-primary">New Deck</span>
                        </div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">Create Study Material</h1>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">Build a deck of questions and answers for your review.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="ghost"
                            className="h-9 rounded-xl px-4 font-black text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                            onClick={() => navigate('/study')}
                        >
                            Discard
                        </Button>
                        <Button
                            className="h-9 rounded-xl px-5 bg-primary hover:bg-primary/90 text-white font-black text-xs gap-1.5"
                            onClick={handleSave}
                        >
                            <Save size={14} /> Create Deck
                        </Button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left Column: Deck Info */}
                <div className="lg:col-span-1 flex flex-col gap-5">
                    <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="px-5 pt-5 pb-3 border-b border-slate-50">
                            <div className="flex items-center gap-2.5 text-primary">
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-[9px] font-black">1</span>
                                <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-600">Deck Details</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Title</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., LET Review – English Terminology"
                                    className="h-10 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-semibold text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</Label>
                                <Select value={category} onValueChange={(value) => setCategory(value as (typeof categoryOptions)[number]['value'])}>
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

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description <span className="lowercase text-slate-300 font-medium">(optional)</span></Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What is this deck about?"
                                    className="min-h-20 rounded-xl border-slate-200 shadow-none focus:ring-primary/20 font-medium text-sm leading-relaxed resize-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tags</Label>
                                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/30 min-h-11">
                                    {tags.map(tag => (
                                        <Badge
                                            key={tag}
                                            className="bg-white text-slate-600 border border-slate-200 font-bold text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 hover:border-red-100 hover:text-red-500 transition-all cursor-default shadow-none"
                                        >
                                            {tag}
                                            <button onClick={() => removeTag(tag)} className="hover:text-red-600 opacity-60 hover:opacity-100">
                                                <X size={10} />
                                            </button>
                                        </Badge>
                                    ))}
                                    <div className="flex items-center gap-1">
                                        <input
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addTag()}
                                            placeholder="Add tag..."
                                            className="h-7 min-w-0 w-24 bg-transparent border-none text-[11px] font-semibold placeholder:text-slate-300 focus:outline-none"
                                        />
                                        <button
                                            onClick={addTag}
                                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-primary px-2 py-1 rounded-lg hover:bg-primary/5 transition-all"
                                        >
                                            <Plus size={10} /> Add
                                        </button>
                                    </div>
                                </div>
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

                    {/* Import card */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Import Data</p>
                        <p className="text-[10px] font-medium text-slate-400">
                            Import tip: <span className="font-bold text-slate-500">correctAnswer</span> can be <span className="font-bold text-slate-500">A/B/C/D</span>, <span className="font-bold text-slate-500">1–4</span>, or exact option text. Optional: <span className="font-bold text-slate-500">explanation</span>.
                        </p>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Input
                                    type="file"
                                    accept=".json,.csv"
                                    onChange={handleImport}
                                    className="absolute inset-0 opacity-0 cursor-pointer h-full"
                                />
                                <Button variant="outline" className="w-full justify-start gap-2 h-8 rounded-lg border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider pointer-events-none">
                                    <Upload size={12} /> Import JSON / CSV
                                </Button>
                            </div>
                            <Button variant="outline" className="h-8 w-9 rounded-lg border-slate-200 bg-white font-bold text-[10px] gap-1 px-2" onClick={() => downloadTemplate('csv')} title="Download CSV template">
                                <Download size={13} />
                            </Button>
                            <Button variant="outline" className="h-8 w-9 rounded-lg border-slate-200 bg-white font-bold text-[10px] gap-1 px-2" onClick={() => downloadTemplate('json')} title="Download JSON template">
                                <Download size={13} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Questions */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-primary">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-[9px] font-black">2</span>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600">Questions & Answers</h3>
                            <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[9px] px-2 py-1 rounded-md">
                                {cards.length} {cards.length === 1 ? 'item' : 'items'}
                            </Badge>
                        </div>
                        <Button onClick={addCard} variant="outline" className="h-8 rounded-lg border-slate-200 bg-white font-bold text-[10px] gap-1.5 px-3 uppercase tracking-wider">
                            <Plus size={12} /> Add Card
                        </Button>
                    </div>

                    <div className="flex flex-col gap-4">
                        {cards.map((card, index) => (
                            <Card key={card.id} className="rounded-2xl border-slate-100 shadow-sm overflow-hidden bg-white">
                                <div className="bg-slate-50/60 px-4 py-2.5 border-b border-slate-100 flex justify-between items-center">
                                    <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase tracking-widest px-2 py-1">
                                        Q{index + 1}
                                    </Badge>
                                    <button
                                        onClick={() => removeCard(card.id)}
                                        disabled={cards.length <= 1}
                                        className="p-1.5 text-slate-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-white rounded-lg"
                                        title="Delete"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                                <CardContent className="p-4 space-y-4">
                                    {/* Question */}
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Question</Label>
                                        <Textarea
                                            value={card.question}
                                            onChange={(e) => updateCard(card.id, 'question', e.target.value)}
                                            placeholder="Enter your question here..."
                                            className="min-h-18 rounded-xl border-slate-100 shadow-none focus:ring-primary/20 font-semibold text-sm leading-relaxed resize-none"
                                        />
                                    </div>

                                    {/* Options */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Options</Label>
                                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest opacity-70">Click radio to set correct</span>
                                        </div>
                                        <RadioGroup
                                            value={card.correctIndex.toString()}
                                            onValueChange={(val) => updateCard(card.id, 'correctIndex', parseInt(val))}
                                            className="grid grid-cols-1 md:grid-cols-2 gap-2"
                                        >
                                            {card.options.map((opt, i) => (
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
                                                            value={opt}
                                                            onChange={(e) => updateOption(card.id, i, e.target.value)}
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

                                    {/* Explanation */}
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Explanation <span className="lowercase font-medium text-slate-300">(optional)</span></Label>
                                        <Textarea
                                            value={card.explanation}
                                            onChange={(e) => updateCard(card.id, 'explanation', e.target.value)}
                                            placeholder="Why is this answer correct?"
                                            className="min-h-15 rounded-xl border-slate-100 shadow-none focus:ring-primary/20 font-medium text-xs leading-relaxed bg-slate-50/40 resize-none"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <button
                        onClick={addCard}
                        className="w-full py-5 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:text-primary hover:border-primary/25 hover:bg-primary/1 transition-all group"
                    >
                        <div className="bg-white w-7 h-7 rounded-full shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform border border-slate-100">
                            <Plus size={14} className="text-primary" />
                        </div>
                        <span className="font-black text-[10px] uppercase tracking-widest">Add Another Card</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudyMaterialEditorPage;
