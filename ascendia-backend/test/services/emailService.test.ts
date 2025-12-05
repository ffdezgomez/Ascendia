import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendResetPasswordEmail, sendVerificationEmail } from '../../src/services/emailService'

const sendMailMock = vi.hoisted(() => vi.fn())
const createTransportMock = vi.hoisted(() => vi.fn(() => ({ sendMail: sendMailMock })))
const smtpConfigRef = vi.hoisted(() => ({ host: 'smtp.test', auth: { user: 'user', pass: 'pass' } }))

vi.mock('nodemailer', () => ({
  default: { createTransport: createTransportMock }
}))

vi.mock('../../src/config.js', () => ({
  smtpConfig: smtpConfigRef,
  emailFrom: 'noreply@ascendia.test',
  FRONTEND_URL: 'http://front.test',
  NODE_ENV: 'test'
}))

describe('emailService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const cfg = smtpConfigRef
    cfg.host = 'smtp.test'
    cfg.auth = { user: 'user', pass: 'pass' }
  })

  it('throws when smtp config is missing', async () => {
    const cfg = smtpConfigRef
    cfg.host = ''

    await expect(sendResetPasswordEmail({ to: 'a@test', username: 'neo', token: 'tok' }))
      .rejects.toThrow(/SMTP no configurado/)
    expect(createTransportMock).not.toHaveBeenCalled()
  })

  it('sends reset password email with correct payload', async () => {
    sendMailMock.mockResolvedValue({ messageId: 'msg-1' })

    const info = await sendResetPasswordEmail({ to: 'a@test', username: 'neo', token: 'tok123' })

    expect(info.messageId).toBe('msg-1')
    expect(createTransportMock).toHaveBeenCalledWith(expect.objectContaining({ host: 'smtp.test' }))
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      from: 'noreply@ascendia.test',
      to: 'a@test',
      subject: expect.stringContaining('Recuperación'),
      text: expect.stringContaining('tok123')
    }))
  })

  it('sends verification email and logs url in non-production', async () => {
    sendMailMock.mockResolvedValue({ messageId: 'msg-2' })
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const info = await sendVerificationEmail({ to: 'b@test', username: 'trinity', token: 'verify' })

    expect(info.messageId).toBe('msg-2')
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'b@test',
      subject: expect.stringContaining('Verifica'),
      html: expect.stringContaining('verify')
    }))
    expect(logSpy).toHaveBeenCalledTimes(2)
    expect(logSpy.mock.calls[1][0]).toContain('[email] URL:')
    logSpy.mockRestore()
  })
})
