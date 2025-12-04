import React from 'react'
import { render, screen } from '@testing-library/react'
import { FriendAvatar } from '../../src/components/FriendAvatar'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('FriendAvatar', () => {
  it('renders initials when no avatar is provided', () => {
    render(<FriendAvatar username="sofia" />)
    expect(screen.getByText('SO')).toBeInTheDocument()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('prepends the assets base url for relative avatars', () => {
    process.env.REACT_APP_ASSETS_URL = 'https://cdn.ascendia.dev/assets/'

    render(<FriendAvatar username="Nico" avatar="/uploads/ava.png" />)

    const img = screen.getByRole('img', { name: 'Nico' }) as HTMLImageElement
    expect(img.src).toBe('https://cdn.ascendia.dev/assets/uploads/ava.png')
  })
})