export interface StudyItem {
    id: string;
    question: string;
    imageUrl?: string | null;
    options: string[];
    answer: number;
    rationalization: string;
}

export const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export const shuffleArray = (arr: number[]) => {
    const next = [...arr];
    for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
};
