import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const originalEnv = { ...process.env }

const resetEnv = () => {
  process.env = { ...originalEnv } as NodeJS.ProcessEnv
}

describe('config', () => {
  beforeEach(() => {
    vi.resetModules()
    resetEnv()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('derives smtp values from the environment', async () => {
    process.env.SMTP_HOST = 'mail.dev'
    process.env.SMTP_PORT = '2525'
    process.env.SMTP_SECURE = 'false'
    process.env.SMTP_USER = 'sender@dev.test'
    process.env.SMTP_PASS = 'top-secret'
    process.env.EMAIL_FROM = ''
    process.env.SALT_ROUNDS = '15'

    const { smtpConfig, emailFrom, saltRoundsNum } = await import('../src/config')

    expect(smtpConfig).toMatchObject({
      host: 'mail.dev',
      port: 2525,
      secure: false
    })
    expect(smtpConfig.auth).toEqual({ user: 'sender@dev.test', pass: 'top-secret' })
    expect(emailFrom).toBe('Ascendia <sender@dev.test>')
    expect(saltRoundsNum).toBe(15)
  })

  it('falls back to secure defaults when credentials are absent', async () => {
    process.env.SMTP_USER = ''
    process.env.SMTP_PASS = ''
    delete process.env.SMTP_PORT
    process.env.SMTP_SECURE = '1'
    process.env.EMAIL_FROM = 'Notifications <custom@test>'

    const { smtpConfig, emailFrom } = await import('../src/config')

    expect(smtpConfig.port).toBe(465)
    expect(smtpConfig.secure).toBe(true)
    expect(smtpConfig.auth).toBeUndefined()
    expect(emailFrom).toBe('Notifications <custom@test>')
  })
})
