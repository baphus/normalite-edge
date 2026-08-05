import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsPage from '@/pages/SettingsPage'

vi.mock('@/lib/axios', () => ({
    default: {
        get: vi.fn().mockResolvedValue({ data: { data: {} } }),
        patch: vi.fn().mockResolvedValue({ data: { data: {} } }),
        post: vi.fn().mockResolvedValue({ data: {} }),
    },
}))

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: {
            id: 'test-user',
            email: 'test@cnu.edu.ph',
            name: 'Test User',
            firstName: 'Test',
            lastName: 'User',
            role: 'REVIEWEE',
            status: 'ACTIVE',
        },
        logout: vi.fn(),
    }),
}))

const STORAGE_KEYS = ['pref-confetti', 'pref-reduced-motion'] as const

beforeEach(() => {
    STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key))
})

/** Renders SettingsPage and switches to the Preferences tab. */
const renderPreferences = async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)
    await user.click(screen.getByRole('button', { name: /preferences/i }))
    return user
}

describe('SettingsPage preferences', () => {
    it('renders the Preferences tab for non-admin roles', async () => {
        await renderPreferences()

        expect(screen.getByRole('heading', { name: /preferences/i })).toBeInTheDocument()
        expect(screen.getByText('Confetti celebrations')).toBeInTheDocument()
        expect(screen.getByText('Reduced motion')).toBeInTheDocument()
    })

    it('defaults the confetti toggle to ON and persists changes to localStorage', async () => {
        const user = await renderPreferences()

        const confettiSwitch = screen.getByRole('switch', { name: /confetti celebrations/i })
        expect(confettiSwitch).toBeChecked()

        await user.click(confettiSwitch)
        expect(window.localStorage.getItem('pref-confetti')).toBe('false')
        expect(screen.getByRole('switch', { name: /confetti celebrations/i })).not.toBeChecked()
    })

    it('persists the reduced motion preference to localStorage', async () => {
        const user = await renderPreferences()

        expect(screen.getByRole('radio', { name: 'Follow system' })).toHaveAttribute('aria-checked', 'true')

        await user.click(screen.getByRole('radio', { name: 'On' }))
        expect(window.localStorage.getItem('pref-reduced-motion')).toBe('on')
        expect(screen.getByRole('radio', { name: 'On' })).toHaveAttribute('aria-checked', 'true')

        await user.click(screen.getByRole('radio', { name: 'Off' }))
        expect(window.localStorage.getItem('pref-reduced-motion')).toBe('off')
        expect(screen.getByRole('radio', { name: 'Off' })).toHaveAttribute('aria-checked', 'true')
    })

    it('reads persisted preferences back on mount (survives reload)', async () => {
        window.localStorage.setItem('pref-confetti', 'false')
        window.localStorage.setItem('pref-reduced-motion', 'off')

        await renderPreferences()

        expect(screen.getByRole('switch', { name: /confetti celebrations/i })).not.toBeChecked()
        expect(screen.getByRole('radio', { name: 'Off' })).toHaveAttribute('aria-checked', 'true')
    })
})
