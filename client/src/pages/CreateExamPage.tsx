import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    ChevronRight,
    Save,
    Plus,
    X,
    Trash2,
    Copy,
    ChevronUp,
    Library,
    Bold,
    Italic,
    Underline,
    Image as ImageIcon,
    Clock,
    FileUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Question {
    id: string;
    text: string;
    options: string[];
    correctOption: number;
    rationale: string;
    section: string;
}

const CreateExamPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;

    // Form State
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState('120');
    const [description, setDescription] = useState('');
    const [selectedPrograms, setSelectedPrograms] = useState<string[]>(['All Programs']);
    const [sections, setSections] = useState<string[]>(['General Education', 'Professional Education']);
    const [activeSection, setActiveSection] = useState('General Education');
    const [questions, setQuestions] = useState<Question[]>([
        {
            id: '1',
            text: 'Identify the learning theory that emphasizes the active role of the learner in building understanding and making sense of information.',
            options: ['Behaviorism', 'Constructivism', 'Cognitivism', 'Humanism'],
            correctOption: 1,
            rationale: 'Constructivism posits that learners construct knowledge through their experiences and interactions with the environment.',
            section: 'General Education'
        }
    ]);

    const programs = [
        'All Programs',
        'BSEd - Mathematics',
        'BSEd - Science',
        'BSEd - English',
        'BSEd - Filipino',
        'BSEd - Social Studies',
        'BSEd - Values Education',
        'BTLEd - Home Economics',
        'Bachelor of Physical Education',
        'Bachelor of Culture & Arts Education',
        'Bachelor of Elementary Education',
        'Bachelor of Early Childhood Education',
        'Bachelor of Special Needs Education',
        'Diploma in Professional Education'
    ];

    useEffect(() => {
        if (isEditing) {
            // Fetch real data logic here
        }
    }, [isEditing]);

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

    const addSection = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = e.currentTarget.value.trim();
            if (value && !sections.includes(value)) {
                setSections([...sections, value]);
                e.currentTarget.value = '';
            }
        }
    };

    const removeSection = (section: string) => {
        setSections(sections.filter(s => s !== section));
        if (activeSection === section) {
            setActiveSection(sections[0] || 'Uncategorized');
        }
    };

    const addQuestion = () => {
        const newQuestion: Question = {
            id: Date.now().toString(),
            text: '',
            options: ['', '', '', ''],
            correctOption: 0,
            rationale: '',
            section: activeSection
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

    const handleSave = () => {
        alert('Exam saved as draft!');
        navigate('/manage-exams');
    };

    const handlePublish = () => {
        if (!title) {
            alert('Please enter an exam title.');
            return;
        }
        alert('Exam published successfully!');
        navigate('/manage-exams');
    };

    const filteredQuestions = questions.filter(q => q.section === activeSection);

    return (
        <div className="flex flex-col gap-8 font-lexend pb-20">
            {/* Header */}
            <header className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                            <Link to="/manage-exams" className="hover:text-primary transition-colors">Exams</Link>
                            <ChevronRight size={12} />
                            <span className="text-primary">{isEditing ? 'Edit Exam' : 'Create New'}</span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                            {isEditing ? 'Edit Mock Exam' : 'Admin Mock Exam Creator'}
                        </h1>
                        <p className="text-gray-500 font-medium tracking-tight mt-1">
                            Design and publish comprehensive mock exams for students.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            className="h-12 rounded-2xl px-6 font-black border-gray-100 hover:bg-gray-50"
                            onClick={() => navigate('/manage-exams')}
                        >
                            Discard
                        </Button>
                        <Button
                            variant="outline"
                            className="h-12 rounded-2xl px-6 font-black border-gray-100 bg-gray-50/50 hover:bg-gray-100"
                            onClick={handleSave}
                        >
                            <Save size={18} className="mr-2" /> Save Draft
                        </Button>
                        <Button
                            className="h-12 rounded-2xl px-8 bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/20"
                            onClick={handlePublish}
                        >
                            Publish Exam
                        </Button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - General Info */}
                <div className="lg:col-span-1 space-y-8">
                    <Card className="rounded-[2.5rem] border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden bg-white">
                        <CardHeader className="p-8 pb-4">
                            <div className="flex items-center gap-3 text-primary mb-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-[10px] font-black">1</span>
                                <CardTitle className="text-sm font-black uppercase tracking-widest">General Information</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Exam Title</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., LET 2024 Comprehensive Mock"
                                    className="h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20 font-bold"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Duration (Minutes)</Label>
                                <div className="relative">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <Input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        className="pl-12 h-12 rounded-2xl border-gray-100 shadow-none focus:ring-primary/20 font-bold"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-black uppercase">min</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Visible To</Label>
                                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                                    {programs.map((program) => (
                                        <div
                                            key={program}
                                            className={`flex items-center space-x-3 p-3 rounded-2xl border transition-all cursor-pointer ${selectedPrograms.includes(program)
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

                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Exam Sections</Label>
                                <div className="flex flex-wrap gap-2 p-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/30">
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
                                    <Input
                                        placeholder="Add section..."
                                        onKeyDown={addSection}
                                        className="h-8 w-32 border-none bg-transparent shadow-none focus:ring-0 p-0 text-xs font-bold placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide instructions for the students..."
                                    className="min-h-[120px] rounded-2xl border-gray-100 shadow-none focus:ring-primary/20 font-medium text-sm leading-relaxed"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Question Management */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 text-primary">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-[10px] font-black">2</span>
                                <h3 className="text-sm font-black uppercase tracking-widest">Question Management</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="outline" className="h-10 rounded-xl border-gray-100 bg-white shadow-sm font-bold text-xs gap-2">
                                    <FileUp size={16} /> Bulk Import
                                </Button>
                                <Badge className="bg-gray-100 text-gray-500 border-none font-black text-[10px] px-3 py-1.5 rounded-lg">
                                    Total: {questions.length} Items
                                </Badge>
                            </div>
                        </div>

                        {/* Section Tabs */}
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-px overflow-x-auto scrollbar-hide">
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

                        {/* Questions List */}
                        <div className="space-y-6">
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
                                    <Card key={q.id} className="rounded-[2.5rem] border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden bg-white">
                                        <div className="bg-gray-50/50 px-8 py-4 border-b border-gray-50 flex justify-between items-center">
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
                                                <button className="p-2 text-gray-300 hover:text-gray-600 transition-colors hover:bg-white rounded-xl">
                                                    <ChevronUp size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <CardContent className="p-8 space-y-8">
                                            {/* Question Text */}
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center justify-between">
                                                    Question Text
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-primary"><Bold size={14} /></Button>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-primary"><Italic size={14} /></Button>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-primary"><Underline size={14} /></Button>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-primary"><ImageIcon size={14} /></Button>
                                                    </div>
                                                </Label>
                                                <Textarea
                                                    value={q.text}
                                                    onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                                                    placeholder="Enter your question here..."
                                                    className="min-h-[100px] rounded-2xl border-gray-100 shadow-none focus:ring-primary/20 font-bold text-sm leading-relaxed"
                                                />
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
                                                            className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${q.correctOption === optIdx
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
                                                    className="min-h-[80px] rounded-2xl border-gray-100 shadow-none focus:ring-primary/20 font-medium text-xs leading-relaxed bg-gray-50/30"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                <button
                                    onClick={addQuestion}
                                    className="py-10 border-2 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-400 hover:text-primary hover:border-primary/30 hover:bg-primary/[0.01] transition-all group"
                                >
                                    <div className="bg-white p-4 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                        <Plus size={24} className="text-primary" />
                                    </div>
                                    <span className="font-black text-xs uppercase tracking-widest">Add New Question</span>
                                </button>
                                <button
                                    className="py-10 border-2 border-dashed border-primary/10 rounded-[2.5rem] flex flex-col items-center justify-center text-primary/40 hover:text-primary hover:border-primary/30 hover:bg-primary/[0.01] transition-all group"
                                >
                                    <div className="bg-primary/5 p-4 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                        <Library size={24} className="text-primary/70" />
                                    </div>
                                    <span className="font-black text-xs uppercase tracking-widest">Question Bank</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateExamPage;
