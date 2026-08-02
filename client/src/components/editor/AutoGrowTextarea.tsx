import React, { useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';

type AutoGrowTextareaProps = React.ComponentProps<typeof Textarea>;

/** Textarea that grows to fit its content instead of scrolling internally. */
export const AutoGrowTextarea: React.FC<AutoGrowTextareaProps> = ({
    className,
    onInput,
    value,
    ...props
}) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const syncHeight = () => {
        const node = textareaRef.current;
        if (!node) return;
        node.style.height = '0px';
        node.style.height = `${node.scrollHeight}px`;
    };

    useEffect(() => {
        syncHeight();
    }, [value]);

    return (
        <Textarea
            {...props}
            ref={textareaRef}
            value={value}
            onInput={(event) => {
                syncHeight();
                onInput?.(event);
            }}
            className={`${className || ''} overflow-hidden`}
        />
    );
};

export default AutoGrowTextarea;
