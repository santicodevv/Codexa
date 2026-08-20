import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('given a fresh session, when rendered, then redirects to the login page', async () => {
    localStorage.clear()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /inicia sesión/i })).toBeTruthy()
    })
    expect(screen.getByText(/audita tu código con ia/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /crea una cuenta/i })).toBeTruthy()
  })
})