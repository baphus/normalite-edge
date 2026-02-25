import React, { useState } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';

interface CardItem {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

const CustomDeckPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdminOrReviewer = user?.role === 'ADMIN' || user?.role === 'REVIEWER';

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [visiblePrograms, setVisiblePrograms] = useState<string[]>(['All Programs']);
    const [cards, setCards] = useState<CardItem[]>([
        { id: '1', question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' }
    ]);

    const programs = [
        "BSEd - Mathematics", "BSEd - Science", "BSEd - English", "BSEd - Filipino",
        "BSEd - Social Studies", "BSEd - Values Education", "BTLEd - Home Economics",
        "Bachelor of Physical Education", "Bachelor of Culture & Arts Education",
        "Bachelor of Elementary Education", "Bachelor of Early Childhood Education",
        "Bachelor of Special Needs Education", "Diploma in Professional Education"
    ];

    const toggleProgram = (program: string) => {
        if (program === 'All Programs') {
            setVisiblePrograms(['All Programs']);
            return;
        }

        let newSelection = visiblePrograms.filter(p => p !== 'All Programs');
        if (newSelection.includes(program)) {
            newSelection = newSelection.filter(p => p !== program);
        } else {
            newSelection = [...newSelection, program];
        }

        if (newSelection.length === 0) newSelection = ['All Programs'];
        setVisiblePrograms(newSelection);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(content);
                    const importedCards = (Array.isArray(data) ? data : data.cards || []).map((c: any) => ({
                        id: Date.now().toString() + Math.random(),
                        question: c.question || c.front || '',
                        options: c.options || ['', '', '', ''],
                        correctIndex: c.correct_answer_index ?? c.answer ?? 0,
                        explanation: c.explanation || c.rationalization || ''
                    }));
                    setCards([...cards, ...importedCards]);
                } else {
                    console.log("CSV parsing not implemented");
                }
                alert(`Successfully imported ${file.name}`);
            } catch (err) {
                alert("Error parsing file.");
            }
        };
        reader.readAsText(file);
    };

    const downloadTemplate = (type: 'json' | 'csv') => {
        const content = type === 'json' ?
            JSON.stringify([{ question: 'Sample?', options: ['A', 'B', 'C', 'D'], correct_answer_index: 0, explanation: 'Why' }], null, 2) :
            'question,option1,option2,option3,option4,correct_answer_index,explanation\n"Sample?","A","B","C","D",0,"Why"';

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
                subject: description || 'Custom Deck',
                program: tags.length > 0 ? tags.join(', ') : 'General',
                timeLimit: 60,
                isPublished: false,
                questions: cards.map(c => {
                    const filledChoices = c.options.map((opt, i) => opt.trim() || `Option ${i + 1}`);
                    return {
                        text: c.question.trim() || 'Empty Question',
                        choices: filledChoices,
                        correctAnswer: filledChoices[c.correctIndex],
                        explanation: c.explanation || undefined
                    };
                })
            };

            await api.post('/exams', payload);
            alert('Deck created successfully!');
            navigate('/study');
        } catch (error: any) {
            console.error('Failed to save deck:', error);
            const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            alert(`Failed to create deck: ${detail}`);
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
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Create Custom Deck</h1>
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
                                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/50 border border-transparent hover:border-primary/10 transition-colors cursor-pointer" onClick={() => toggleProgram('All Programs')}>
                                            <Checkbox checked={visiblePrograms.includes('All Programs')} onCheckedChange={() => toggleProgram('All Programs')} />
                                            <span className="text-xs font-bold text-gray-700">All Programs</span>
                                        </div>
                                        <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2 scrollbar-hide">
                                            {programs.map(prog => (
                                                <div key={prog} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toggleProgram(prog)}>
                                                    <Checkbox checked={visiblePrograms.includes(prog)} onCheckedChange={() => toggleProgram(prog)} />
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{prog}</span>
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
