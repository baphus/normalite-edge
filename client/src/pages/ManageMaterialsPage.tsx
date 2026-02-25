import React, { useState } from 'react';
import {
    Plus,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    Eye,
    Layers,
    Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Material {
    id: string;
    title: string;
    category: 'Prof Ed' | 'Gen Ed' | 'Specialization';
    description: string;
    cardCount: number;
    visibleTo: string[];
}

const ManageMaterialsPage: React.FC = () => {
    const [materials] = useState<Material[]>([
        {
            id: '1',
            title: 'Child & Adolescent Development',
            category: 'Prof Ed',
            description: 'Theories of growth and development from conception to adolescence.',
            cardCount: 50,
            visibleTo: ['All Programs']
        },
        {
            id: '2',
            title: 'Historical Foundations',
            category: 'Gen Ed',
            description: 'Key philosophical and historical roots of the Philippine Education System.',
            cardCount: 45,
            visibleTo: ['BSEd Social Studies', 'BEEd']
        },
        {
            id: '3',
            title: 'Structure of English',
            category: 'Specialization',
            description: 'Linguistics, phonology, morphology, and syntax concepts for English majors.',
            cardCount: 62,
            visibleTo: ['BSEd English']
        }
    ]);

    const [categoryFilter, setCategoryFilter] = useState<'all' | 'Prof Ed' | 'Gen Ed' | 'Specialization'>('all');
    const [search, setSearch] = useState('');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [isFlippedPreview, setIsFlippedPreview] = useState(false);

    const handlePreview = (material: Material) => {
        setSelectedMaterial(material);
        setIsFlippedPreview(false);
        setIsPreviewOpen(true);
    };

    const handleAction = (action: string, material: Material) => {
        alert(`${action} performed on ${material.title}`);
    };

    const filteredMaterials = materials.filter(material => {
        const matchesCategory = categoryFilter === 'all' || material.category === categoryFilter;
        const matchesSearch = material.title.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="flex flex-col gap-8 font-lexend pb-10">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">System Materials</h1>
                    <p className="text-gray-500 font-medium tracking-tight">Create and manage interactive study decks and flashcards.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                        <Input
                            placeholder="Search materials..."
                            className="pl-10 h-11 rounded-xl border-gray-200 focus:border-primary focus:ring-primary shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Link to="/materials/create">
                        <Button className="h-11 rounded-xl bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/20 gap-2 px-6">
                            <Plus size={18} /> New Material
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex items-center border-b border-gray-100 overflow-x-auto scrollbar-hide">
                {(['all', 'Prof Ed', 'Gen Ed', 'Specialization'] as const).map(category => (
                    <button
                        key={category}
                        onClick={() => setCategoryFilter(category)}
                        className={`py-4 px-6 text-sm font-black whitespace-nowrap transition-all border-b-2 uppercase tracking-widest flex items-center gap-2 ${categoryFilter === category
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        {category === 'all' ? 'All Materials' : category}
                        <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${categoryFilter === category ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
                            }`}>
                            {category === 'all' ? materials.length : materials.filter(m => m.category === category).length}
                        </span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-4">
                {filteredMaterials.map((material) => (
                    <Card key={material.id} className="group border-gray-100 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2.5rem] overflow-hidden bg-white relative flex flex-col">
                        <CardContent className="p-8 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-6">
                                <Badge className={`font-black text-[10px] uppercase tracking-widest border-none px-3 py-1 ${material.category === 'Prof Ed' ? 'bg-amber-50 text-amber-600' :
                                    material.category === 'Gen Ed' ? 'bg-blue-50 text-blue-600' :
                                        'bg-emerald-50 text-emerald-600'
                                    }`}>
                                    {material.category}
                                </Badge>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-400 hover:bg-gray-50 transition-colors">
                                            <MoreHorizontal size={20} />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-2xl border-gray-100 shadow-xl w-44 p-2 font-lexend">
                                        <DropdownMenuItem onClick={() => handleAction('Edit', material)} className="gap-2 font-bold text-xs py-3 rounded-xl cursor-pointer">
                                            <Edit size={14} className="text-blue-500" /> Edit Material
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAction('Duplicate', material)} className="gap-2 font-bold text-xs py-3 rounded-xl cursor-pointer">
                                            <Layers size={14} className="text-purple-500" /> Duplicate
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAction('Delete', material)} className="gap-2 font-bold text-xs py-3 rounded-xl text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                                            <Trash2 size={14} /> Delete Material
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="space-y-3 mb-6">
                                <h3 className="text-xl font-black text-gray-900 group-hover:text-primary transition-colors leading-tight">
                                    {material.title}
                                </h3>
                                <p className="text-sm text-gray-500 font-medium line-clamp-2 leading-relaxed">
                                    {material.description}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">
                                <Users size={14} className="text-gray-300" />
                                <span>Visible to: {material.visibleTo.join(', ')}</span>
                            </div>

                            <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Content</p>
                                    <p className="text-sm font-black text-gray-700">{material.cardCount} Flashcards</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePreview(material)}
                                        className="rounded-xl font-black text-[10px] uppercase tracking-widest border-gray-100 h-9 px-4 gap-2 transition-all hover:bg-primary/5 hover:text-primary hover:border-primary/20"
                                    >
                                        <Eye size={14} /> Preview
                                    </Button>
                                    <Link to={`/materials/${material.id}/edit`}>
                                        <Button size="sm" className="rounded-xl font-black text-[10px] uppercase tracking-widest bg-primary hover:bg-primary/95 h-9 px-4">
                                            Manage
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {/* Create New Card */}
                <Link to="/materials/create" className="flex flex-col items-center justify-center gap-4 p-12 border-2 border-dashed border-gray-200 rounded-[2.5rem] bg-gray-50/50 hover:bg-primary/[0.02] hover:border-primary/50 transition-all group min-h-[320px]">
                    <div className="bg-white p-6 rounded-[1.5rem] shadow-sm group-hover:scale-110 transition-transform">
                        <Plus size={32} className="text-primary" />
                    </div>
                    <div className="text-center">
                        <p className="font-black text-base text-gray-900 uppercase tracking-tight">Create New Material</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-widest max-w-[240px] leading-relaxed">Design interactive flashcards and study guides for students</p>
                    </div>
                </Link>
            </div>

            {/* Preview Modal */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none font-lexend p-0 overflow-hidden bg-background-light">
                    <div className="p-8 pb-4">
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <Badge className="bg-primary/5 text-primary border-none font-black text-[10px] uppercase tracking-widest px-3">
                                    {selectedMaterial?.category}
                                </Badge>
                                <span className="text-xs font-bold text-gray-400 capitalize">{selectedMaterial?.cardCount} Questions</span>
                            </div>
                            <DialogTitle className="text-2xl font-black text-gray-900 leading-tight">
                                {selectedMaterial?.title}
                            </DialogTitle>
                            <DialogDescription className="font-medium text-gray-500 mt-2">
                                {selectedMaterial?.description}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <Tabs defaultValue="flashcards" className="w-full">
                        <div className="px-8 border-b border-gray-100 pb-0 shadow-sm">
                            <TabsList className="bg-transparent gap-8 p-0 h-auto">
                                <TabsTrigger value="flashcards" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-0 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400 transition-all">
                                    Flashcard Preview
                                </TabsTrigger>
                                <TabsTrigger value="quiz" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-0 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400 transition-all">
                                    Study Quiz Preview
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="flashcards" className="p-8 animate-in fade-in transition-all duration-500">
                            <div
                                className="relative w-full aspect-[16/10] perspective-1000 group cursor-pointer"
                                onClick={() => setIsFlippedPreview(!isFlippedPreview)}
                                style={{ perspective: '1000px' }}
                            >
                                <div
                                    className="relative w-full h-full transition-all duration-700"
                                    style={{
                                        transformStyle: 'preserve-3d',
                                        transform: isFlippedPreview ? 'rotateY(180deg)' : 'rotateY(0deg)'
                                    }}
                                >
                                    {/* Front */}
                                    <div
                                        className="absolute inset-0 bg-white rounded-[2rem] border-2 border-primary/10 shadow-xl shadow-primary/5 flex flex-col items-center justify-center p-12 text-center overflow-hidden"
                                        style={{ backfaceVisibility: 'hidden' }}
                                    >
                                        <div className="absolute top-4 left-6 flex items-center gap-2">
                                            <Badge className="bg-gray-100 text-gray-400 font-bold text-[9px] uppercase border-none">Front</Badge>
                                        </div>
                                        <h4 className="text-2xl font-black text-gray-800 leading-relaxed">
                                            Sample Question from the {selectedMaterial?.category} material?
                                        </h4>
                                        <p className="mt-8 text-xs font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2 animate-pulse"><Eye size={16} /> Click to Flip</p>
                                    </div>
                                    {/* Back */}
                                    <div
                                        className="absolute inset-0 bg-white rounded-[2rem] border-2 border-primary/10 shadow-xl shadow-primary/5 flex flex-col items-center justify-center p-12 text-center overflow-hidden"
                                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                                    >
                                        <div className="absolute top-0 inset-x-0 h-1.5 bg-primary" />
                                        <Badge className="mb-6 font-black tracking-widest bg-green-50 text-green-600 border-green-100">CORRECT ANSWER</Badge>
                                        <h3 className="text-3xl font-black text-primary leading-tight font-lexend mb-4">
                                            The Correct Option
                                        </h3>
                                        <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                            This is a brief rationalization for why this option is correct and how it relates to the question.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="quiz" className="p-8 animate-in fade-in transition-all duration-500">
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <h5 className="font-bold text-gray-900 mb-4">1. How will this question appear in a multiple choice quiz?</h5>
                                    <div className="grid grid-cols-1 gap-3">
                                        {['Option A - Correct Answer', 'Option B - Distractor', 'Option C - Distractor', 'Option D - Distractor'].map((opt, i) => (
                                            <div key={i} className={`p-4 rounded-xl border text-sm font-bold transition-all ${i === 0 ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'}`}>
                                                {opt}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="p-8 bg-white border-t border-gray-100 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setIsPreviewOpen(false)} className="rounded-2xl font-black uppercase tracking-widest text-[10px]">Close Preview</Button>
                        <Button className="rounded-2xl bg-primary hover:bg-primary/95 text-white font-black shadow-lg shadow-primary/20 px-8 uppercase tracking-widest text-[10px]">Start Real Session</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ManageMaterialsPage;
