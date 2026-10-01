import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('renders the music app shell with main navigation and playback info', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /wavelength/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /explorar/i })).toBeInTheDocument()
    expect(screen.getByText(/reproduciendo ahora/i)).toBeInTheDocument()
  })
})