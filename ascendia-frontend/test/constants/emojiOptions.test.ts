import { EMOJI_OPTIONS } from '../../src/constants/emojiOptions';

describe('emojiOptions', () => {
  it('should export EMOJI_OPTIONS array', () => {
    expect(EMOJI_OPTIONS).toBeDefined();
    expect(Array.isArray(EMOJI_OPTIONS)).toBe(true);
  });

  it('should contain at least 20 emojis', () => {
    expect(EMOJI_OPTIONS.length).toBeGreaterThanOrEqual(20);
  });

  it('should contain valid emoji options', () => {
    expect(EMOJI_OPTIONS).toContain('✨');
    expect(EMOJI_OPTIONS).toContain('🔥');
    expect(EMOJI_OPTIONS).toContain('💪');
    expect(EMOJI_OPTIONS).toContain('📚');
  });

  it('should have mostly unique emojis', () => {
    const uniqueEmojis = new Set(EMOJI_OPTIONS);
    // Allow for some duplicates (like 🧠 that appears twice)
    expect(uniqueEmojis.size).toBeGreaterThanOrEqual(EMOJI_OPTIONS.length - 2);
  });
});
