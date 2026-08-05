import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MotionProvider } from '@/providers/MotionProvider'
import { useMotionPreference, MOTION_PREFERENCE_KEY } from '@/contexts/MotionContext'

const Probe: React.FC = () => {
    const { reducedMotion, source } = useMotionPreference()
    return (
        <div>
            <span data-testid="reduced-motion">{String(reducedMotion)}</span>
            <span data-testid="motion-source">{source}</span>
        </div>
    )
}

const renderWithProvider = () =>
    render(
        <MotionProvider>
            <Probe />
        </MotionProvider>
    )

beforeEach(() => {
    window.localStorage.removeItem(MOTION_PREFERENCE_KEY)
    document.documentElement.classList.remove('reduce-motion')
})

describe('MotionContext', () => {
    it('defaults to the system preference when localStorage is empty', () => {
        renderWithProvider()

        // jsdom has no matchMedia, so the OS preference resolves to false.
        expect(screen.getByTestId('motion-source').textContent).toBe('system')
        expect(screen.getByTestId('reduced-motion').textContent).toBe('false')
    })

    it("respects the 'on' override from localStorage", () => {
        window.localStorage.setItem(MOTION_PREFERENCE_KEY, 'on')

        renderWithProvider()

        expect(screen.getByTestId('reduced-motion').textContent).toBe('true')
        expect(screen.getByTestId('motion-source').textContent).toBe('user')
    })

    it('applies the .reduce-motion class to documentElement', () => {
        window.localStorage.setItem(MOTION_PREFERENCE_KEY, 'on')

        renderWithProvider()

        expect(document.documentElement.classList.contains('reduce-motion')).toBe(true)
    })

    it('removes the .reduce-motion class when the preference changes', () => {
        window.localStorage.setItem(MOTION_PREFERENCE_KEY, 'on')
        renderWithProvider()
        expect(document.documentElement.classList.contains('reduce-motion')).toBe(true)

        window.localStorage.setItem(MOTION_PREFERENCE_KEY, 'off')
        act(() => {
            window.dispatchEvent(
                new StorageEvent('storage', { key: MOTION_PREFERENCE_KEY, newValue: 'off' })
            )
        })

        expect(document.documentElement.classList.contains('reduce-motion')).toBe(false)
        expect(screen.getByTestId('reduced-motion').textContent).toBe('false')
        expect(screen.getByTestId('motion-source').textContent).toBe('user')
    })
})
