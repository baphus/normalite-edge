import React from 'react';
import { TrendingUp, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface BadgeItem {
    id: string;
    name: string;
    description: string;
    icon: string;
    isLocked: boolean;
    color: string;
}

const AchievementsPage: React.FC = () => {
    const badges: BadgeItem[] = [];

    const unlockedCount = badges.filter(b => !b.isLocked).length;
    const totalCount = badges.length;

    return (
        <div className="flex flex-col gap-8 font-lexend pb-10">
            <header className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Achievements & Badges</h1>
                <p className="text-sm text-gray-500 font-medium tracking-tight">Unlock badges by completing milestones and mastering subjects.</p>
            </header>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-gray-900 border-l-4 border-primary pl-4">
                        Your Collection <span className="text-gray-400 font-bold ml-2">({unlockedCount}/{totalCount})</span>
                    </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {badges.map((badge) => (
                        <Card
                            key={badge.id}
                            className={`group border-gray-100 transition-all duration-300 ${badge.isLocked ? 'opacity-40 grayscale bg-gray-50' : `hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 ${badge.color}`
                                } rounded-3xl overflow-hidden`}
                        >
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                                <div className="text-5xl transform group-hover:scale-110 transition-transform duration-300">
                                    {badge.icon}
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">{badge.name}</h4>
                                    <p className="text-[10px] text-gray-500 font-bold leading-tight uppercase tracking-widest">{badge.description}</p>
                                </div>
                                {badge.isLocked && (
                                    <div className="mt-2 text-gray-400">
                                        <Lock size={14} strokeWidth={3} />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                    {badges.length === 0 && (
                        <Card className="border-gray-100 col-span-full">
                            <CardContent className="p-10 text-center text-sm text-gray-500 font-medium">
                                No achievements are available yet.
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <div className="mt-8">
                <Card className="border-gray-100 shadow-sm rounded-3xl overflow-hidden max-w-3xl">
                    <CardHeader className="bg-primary/5 border-b border-primary/5 px-8 py-6">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp size={18} className="text-primary" /> Next Milestones
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-4 text-sm font-bold">
                            <div className="flex justify-between items-center text-gray-900">
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">🌟</div>
                                    <div>
                                        <p>Legend</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                            Unlock {totalCount} Badges
                                        </p>
                                    </div>
                                </div>
                                <span className="text-primary">{unlockedCount} / {totalCount}</span>
                            </div>
                            <Progress value={totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0} className="h-2.5" />
                        </div>

                        <div className="space-y-4 text-sm font-bold">
                            <div className="flex justify-between items-center text-gray-900">
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">🔥</div>
                                    <div>
                                        <p>Study Streak</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                            Track your current streak
                                        </p>
                                    </div>
                                </div>
                                <span className="text-primary">0 / 0</span>
                            </div>
                            <Progress value={0} className="h-2.5" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AchievementsPage;
