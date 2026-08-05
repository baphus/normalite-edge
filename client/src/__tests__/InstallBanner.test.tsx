import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstallBanner from '../components/InstallBanner';

const BANNER_TEXT = /install normalite edge/i;

describe('InstallBanner', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('does not render when visit count is below 3', () => {
        localStorage.setItem('pwa-visits', '0');

        render(<InstallBanner />);

        expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument();
    });

    it('renders when visit count reaches 3', () => {
        localStorage.setItem('pwa-visits', '2');

        render(<InstallBanner />);

        expect(screen.getByText(BANNER_TEXT)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^install$/i })).toBeInTheDocument();
    });

    it('dismisses the banner and persists the dismissal', async () => {
        localStorage.setItem('pwa-visits', '2');
        const user = userEvent.setup();
        const { unmount } = render(<InstallBanner />);

        expect(screen.getByText(BANNER_TEXT)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /dismiss/i }));

        expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument();
        expect(localStorage.getItem('pwa-dismissed')).toBe('true');

        unmount();
        render(<InstallBanner />);
        expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument();
    });

    it('does not render when display-mode is standalone and does not count the visit', () => {
        localStorage.setItem('pwa-visits', '2');
        vi.stubGlobal(
            'matchMedia',
            vi.fn().mockReturnValue({
                matches: true,
                media: '(display-mode: standalone)',
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }),
        );

        render(<InstallBanner />);

        expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument();
        expect(localStorage.getItem('pwa-visits')).toBe('2');
    });

    it('captures beforeinstallprompt and triggers it on Install click', async () => {
        localStorage.setItem('pwa-visits', '2');
        const user = userEvent.setup();
        render(<InstallBanner />);

        const prompt = vi.fn().mockResolvedValue(undefined);
        const userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
        const event = new Event('beforeinstallprompt');
        Object.defineProperty(event, 'prompt', { value: prompt });
        Object.defineProperty(event, 'userChoice', { value: userChoice });

        window.dispatchEvent(event);

        await user.click(screen.getByRole('button', { name: /^install$/i }));

        expect(prompt).toHaveBeenCalledTimes(1);
        expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument();
    });
});
