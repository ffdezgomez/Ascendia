export const EMOJI_OPTIONS = [
  // Básicos / genéricos
  '✨', '⭐', '🔥', '💡', '🎯', '✅',
  // Estudio / foco
  '📚', '📖', '🧠', '📝', '✏️', '🖋️',
  // Fitness / movimiento
  '💪', '🏃', '🚶', '🚴', '🏋️', '🏊', '🤸',
  // Sueño / descanso
  '😴', '🌙', '🛌',
  // Mindfulness / bienestar
  '🧘', '🙏', '🧠', '💆',
  // Salud / hábitos sanos
  '🍎', '🥦', '🥕', '💧', '🚭', '🫁',
  // Trabajo / productividad
  '💻', '📊', '📈', '📅', '📂',
  // Casa / orden
  '🏠', '🧹', '🧺', '🧼',
  // Social / relaciones
  '❤️', '🤝', '📞', '💬'
] as const

export type EmojiOption = typeof EMOJI_OPTIONS[number]
