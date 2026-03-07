import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface DeckQuestion {
    id: string;
    orderNo?: number;
    questionText: string;
    imageUrl?: string | null;
    choiceA?: string | null;
    choiceB?: string | null;
    choiceC?: string | null;
    choiceD?: string | null;
    correctChoice?: 'A' | 'B' | 'C' | 'D' | null;
    rationalization?: string | null;
}

interface DeckDetails {
    id: string;
    title: string;
    description?: string | null;
    questions?: DeckQuestion[];
}

const RevieweeMaterialViewPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deck, setDeck] = useState<DeckDetails | null>(null);

    useEffect(() => {
        const loadDeck = async () => {
            if (!id) {
                setError('Missing material ID.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');

            try {
                const response = await api.get(`/decks/${id}?questions=true`);
                setDeck((response.data?.data || null) as DeckDetails | null);
            } catch (loadErr) {
                console.error('Failed to load reviewee material details', loadErr);
                setError('Unable to load material details right now.');
                setDeck(null);
            } finally {
                setLoading(false);
            }
        };

        loadDeck();
    }, [id]);

    const questions = useMemo(() => {
        return (deck?.questions || [])
            .slice()
            .sort((first, second) => (first.orderNo || 0) - (second.orderNo || 0));
    }, [deck]);

    const getCorrectAnswer = (question: DeckQuestion) => {
        const optionMap = {
            A: question.choiceA,
            B: question.choiceB,
            C: question.choiceC,
            D: question.choiceD,
        } as const;

        const correctKey = question.correctChoice || 'A';
        const correctValue = optionMap[correctKey] || 'No answer available.';

        return {
            label: correctKey,
            value: correctValue,
        };
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-4 font-lexend pb-8">
                <Card className="rounded-2xl border-gray-100 bg-white">
                    <CardContent className="p-6 text-sm font-semibold text-gray-500">Loading material...</CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5 font-lexend pb-8">
            <header className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => navigate('/study')}
                    >
                        <ArrowLeft size={18} />
                    </Button>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Material View</h1>
                        <p className="text-sm text-gray-500 font-medium">Questions, correct answers, and rationalizations.</p>
                    </div>
                </div>
                <Button
                    className="h-10 rounded-xl bg-primary hover:bg-primary/95 text-white font-black gap-2"
                    onClick={() => navigate(`/study/${id}?mode=study`)}
                >
                    <BookOpen size={15} /> Begin Quiz
                </Button>
            </header>

            {error ? (
                <Card className="rounded-2xl border-red-100 bg-red-50/40">
                    <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
                        <p className="text-sm font-semibold text-red-700">{error}</p>
                        <Button variant="outline" onClick={() => navigate('/study')} className="border-red-200 text-red-700 hover:bg-red-50">
                            Back to Study Hub
                        </Button>
                    </CardContent>
                </Card>
            ) : !deck ? (
                <Card className="rounded-2xl border-gray-100 bg-white">
                    <CardContent className="p-6 text-sm font-semibold text-gray-500">Material not found.</CardContent>
                </Card>
            ) : (
                <>
                    <Card className="rounded-2xl border-gray-100 bg-white">
                        <CardContent className="p-5 space-y-1.5">
                            <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">{deck.title}</h2>
                            <p className="text-sm text-gray-600 font-medium">{deck.description || 'No description provided.'}</p>
                        </CardContent>
                    </Card>

                    <section className="space-y-3">
                        <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Question List</h3>

                        {questions.length === 0 ? (
                            <Card className="rounded-2xl border-gray-100 bg-white">
                                <CardContent className="p-6 text-sm font-semibold text-gray-500">
                                    This material has no questions yet.
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {questions.map((question, index) => {
                                    const correctAnswer = getCorrectAnswer(question);
                                    return (
                                        <Card key={question.id} className="rounded-2xl border-gray-100 bg-white">
                                            <CardContent className="p-5 space-y-3">
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Question {index + 1}</p>
                                                    <p className="text-sm md:text-base font-bold text-gray-900 mt-1 leading-relaxed">
                                                        {question.questionText || 'No question text available.'}
                                                    </p>
                                                    {question.imageUrl ? (
                                                        <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50/40 p-2">
                                                            <img
                                                                src={question.imageUrl}
                                                                alt={`Question ${index + 1}`}
                                                                className="max-h-56 w-auto max-w-full rounded-md object-contain bg-white"
                                                            />
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900 font-semibold leading-relaxed">
                                                    <span className="font-black mr-1">Correct Answer:</span>
                                                    {correctAnswer.label}. {correctAnswer.value}
                                                </div>

                                                <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3 text-xs text-gray-700 font-medium leading-relaxed">
                                                    <span className="font-black text-gray-800">Rationalization: </span>
                                                    {question.rationalization || 'No rationalization provided.'}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
};

export default RevieweeMaterialViewPage;
