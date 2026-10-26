import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders login', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getAllByText('Sign in').length).toBeGreaterThan(0), { timeout: 3000 })
  })
})
