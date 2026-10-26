import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Sync from './Sync'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn().mockResolvedValue(() => {}) }))

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('navigator', { bluetooth: undefined })
})

describe('Sync smoke', () => {
  it('renders controls and toggles BLE gateway', async () => {
    render(<Sync />)
    await waitFor(() => expect(screen.getByText(/BLE Gateway: OFF/i)).toBeTruthy())
    expect(screen.getByText(/Connect BLE Gateway/i)).toBeTruthy()
    expect(screen.getByText(/Sync Now/i)).toBeTruthy()
    expect(screen.getByText(/Discover Nearby Peers/i)).toBeTruthy()
    fireEvent.click(screen.getByText(/BLE Gateway: OFF/i))
    await waitFor(() => expect(screen.getByText(/BLE Gateway: ON/i)).toBeTruthy())
    expect(localStorage.getItem('zri_ble_gateway')).toBe('1')
  })
})
