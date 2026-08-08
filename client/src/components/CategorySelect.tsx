import { useState, useEffect, useMemo, useCallback } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import api from '@/lib/axios';
import { PRESET_COLORS } from '@/lib/categoryTone';

export interface Category {
    id: string;
    name: string;
    color?: string | null;
    createdAt?: string;
    updatedAt?: string;
    _count?: { exams: number; decks: number };
}

interface CategorySelectProps {
    value?: string | null;
    onChange?: (categoryId: string | null) => void;
    placeholder?: string;
    disabled?: boolean;
    allowCreate?: boolean;
    className?: string;
}

export function CategorySelect({
    value,
    onChange,
    placeholder = 'Select category...',
    disabled = false,
    allowCreate = true,
    className,
}: CategorySelectProps) {
    const [open, setOpen] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

    const fetchCategories = useCallback(() => {
        // All state updates run in promise callbacks so the effect that kicks
        // off the fetch performs no synchronous setState calls.
        Promise.resolve()
            .then(() => {
                setLoading(true);
                return api.get('/categories');
            })
            .then((res) => {
                setCategories(res.data.data || []);
            })
            .catch(() => {
                // silent
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const selectedCategory = useMemo(
        () => categories.find((c) => c.id === value),
        [categories, value]
    );

    const filteredCategories = useMemo(() => {
        if (!search.trim()) return categories;
        const q = search.trim().toLowerCase();
        return categories.filter((c) => c.name.toLowerCase().includes(q));
    }, [categories, search]);

    const exactMatch = useMemo(
        () => categories.find((c) => c.name.toLowerCase() === search.trim().toLowerCase()),
        [categories, search]
    );

    const showCreateOption = allowCreate && search.trim() && !exactMatch;

    const handleCreate = async () => {
        const name = search.trim();
        if (!name) return;

        try {
            const res = await api.post('/categories', { name, color: selectedColor });
            const newCategory = res.data.data;
            setCategories((prev) =>
                prev.some((c) => c.id === newCategory.id)
                    ? prev
                    : [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name))
            );
            onChange?.(newCategory.id);
            setSearch('');
            setSelectedColor(PRESET_COLORS[0]);
            setOpen(false);
        } catch (err) {
            const message = isAxiosError<{ message?: string }>(err)
                ? err.response?.data?.message
                : undefined;
            toast.error(message || 'Failed to create category.');
        }
    };

    const handleSelect = (categoryId: string | null) => {
        onChange?.(categoryId);
        setSearch('');
        setSelectedColor(PRESET_COLORS[0]);
        setOpen(false);
    };

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) setSelectedColor(PRESET_COLORS[0]);
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn('w-full justify-between', !value && 'text-muted-foreground', className)}
                    disabled={disabled}
                >
                    {selectedCategory ? selectedCategory.name : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search categories..."
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty>
                            {loading ? 'Loading...' : 'No categories found.'}
                        </CommandEmpty>
                        <CommandGroup>
                            {value && (
                                <CommandItem
                                    value="__none__"
                                    onSelect={() => handleSelect(null)}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            !value ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                    No Category
                                </CommandItem>
                            )}
                            {filteredCategories.map((category) => (
                                <CommandItem
                                    key={category.id}
                                    value={category.id}
                                    onSelect={() => handleSelect(category.id)}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            value === category.id ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                    {category.color && (
                                        <span
                                            className="mr-2 inline-block h-3 w-3 rounded-full border border-slate-200"
                                            style={{ backgroundColor: category.color }}
                                        />
                                    )}
                                    {category.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {showCreateOption && (
                            <CommandGroup>
                                <CommandItem
                                    value="__create__"
                                    onSelect={handleCreate}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create "{search.trim()}"
                                </CommandItem>
                                <div className="flex items-center gap-1.5 px-2 py-1.5">
                                    {PRESET_COLORS.map((hex) => (
                                        <button
                                            key={hex}
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSelectedColor(hex);
                                            }}
                                            className={cn(
                                                'h-5 w-5 rounded-full border-2 transition-all',
                                                selectedColor === hex
                                                    ? 'border-slate-900 scale-110'
                                                    : 'border-transparent hover:border-slate-300'
                                            )}
                                            style={{ backgroundColor: hex }}
                                            aria-label={`Select color ${hex}`}
                                        />
                                    ))}
                                </div>
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
