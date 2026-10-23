import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders navigation', () => {
    render(<App />)
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0)
  })
})
