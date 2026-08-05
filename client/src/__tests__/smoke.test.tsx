import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

describe('client test seam', () => {
  it('renders a component via RTL and asserts visible text', () => {
    render(<button>Click me</button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })
})
