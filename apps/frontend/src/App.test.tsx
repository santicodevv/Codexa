import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('given the app, when rendered, then shows the product name', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Codexa' })).toBeTruthy()
    expect(screen.getByText(/auditoría de código con ia/i)).toBeTruthy()
  })
})
