type FriendAvatarProps = {
  username: string
  avatar?: string
  className?: string
}

export function FriendAvatar({ username, avatar, className = '' }: FriendAvatarProps) {
  const defaultSize = 'h-10 w-10'
  const sizeAwareClass = className ? `${defaultSize} ${className}` : defaultSize

  if (avatar) {
    const baseUrl = process.env.REACT_APP_ASSETS_URL || process.env.REACT_APP_API_URL || ''
    const normalizedAvatar = avatar.startsWith('http') ? avatar : `${baseUrl.replace(/\/$/, '')}${avatar}`
    return <img src={normalizedAvatar} alt={username} className={`${sizeAwareClass} rounded-full object-cover`} />
  }

  return (
    <div className={`flex ${sizeAwareClass} items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-300`}>
      {username.slice(0, 2).toUpperCase()}
    </div>
  )
}
