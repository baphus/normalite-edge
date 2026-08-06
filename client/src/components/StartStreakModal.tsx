import React from 'react';
import { Flame, BookOpen, ClipboardList, HelpCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface StartStreakModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (choice: 'daily-question' | 'study-deck' | 'take-exam') => void;
}

const OPTIONS = [
    {
        id: 'daily-question' as const,
        icon: HelpCircle,
        title: 'Daily Question',
        description: "Answer today's question",
        color: 'text-orange-500',
        bg: 'bg-orange-50',
    },
    {
        id: 'study-deck' as const,
        icon: BookOpen,
        title: 'Study a Deck',
        description: 'Review your study materials',
        color: 'text-blue-500',
        bg: 'bg-blue-50',
    },
    {
        id: 'take-exam' as const,
        icon: ClipboardList,
        title: 'Take an Exam',
        description: 'Test your knowledge',
        color: 'text-emerald-500',
        bg: 'bg-emerald-50',
    },
] as const;

export const StartStreakModal: React.FC<StartStreakModalProps> = ({
    open,
    onOpenChange,
    onSelect,
}) => {
    const handleSelect = (choice: 'daily-question' | 'study-deck' | 'take-exam') => {
        onSelect(choice);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Flame className="h-5 w-5 text-orange-500" />
                        Start your streak
                    </DialogTitle>
                    <DialogDescription>
                        Choose an activity to start building your streak
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-2 pt-2">
                    {OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => handleSelect(option.id)}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition-colors',
                                    'hover:border-slate-300 hover:bg-slate-50',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                )}
                            >
                                <span
                                    className={cn(
                                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                                        option.bg,
                                        option.color,
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {option.title}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {option.description}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default StartStreakModal;
