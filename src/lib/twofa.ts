import crypto from 'crypto'

export interface TwoFactorSetup {
  secret: string
  otpauthUrl: string
  qrCode: string
  recoveryCodes: string[]
}

export interface TwoFactorVerification {
  secret: string
  recoveryCodes: string[]
  isEnabled: boolean
  verifiedAt?: Date
}

export const generateTOTPSecret = (): TwoFactorSetup => {
  const secret = generateRandomSecret(32)
  const otpauthUrl = `otpauth://totp/AhorrApp:${secret}?secret=${secret}&issuer=AhorrApp&digits=6&period=30`
  
  return {
    secret,
    otpauthUrl,
    qrCode: generateQRCode(otpauthUrl),
    recoveryCodes: generateRecoveryCodes(10)
  }
}

export const verifyTOTP = (token: string, secret: string): boolean => {
  const currentTime = Math.floor(Date.now() / 30000)
  for (let i = -1; i <= 1; i++) {
    const timeStep = currentTime + i
    const hmac = generateTOTPCode(secret, timeStep)
    if (hmac === token) return true
  }
  return false
}

function generateTOTPCode(secret: string, timeStep: number): string {
  const key = base32Decode(secret)
  const timeBytes = new ArrayBuffer(8)
  const timeView = new DataView(timeBytes)
  timeView.setBigUint64(0, BigInt(timeStep))
  
  const hmac = calculateHMAC(key, timeBytes)
  const offset = hmac[hmac.length - 1] & 0x0f
  const binaryCode = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff)
  
  return (binaryCode % 1000000).toString().padStart(6, '0')
}

function calculateHMAC(key: Uint8Array, data: ArrayBuffer): Uint8Array {
  const hmac = crypto.createHmac('sha1', key)
  hmac.update(Buffer.from(data))
  return Uint8Array.from(hmac.digest())
}

function base32Decode(str: string): Uint8Array {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const paddedStr = str.padEnd(Math.ceil(str.length * 8 / 5) * 5, '=')
  const binary = Array.from(paddedStr, char => {
    const value = base32Chars.indexOf(char.toUpperCase())
    if (value === -1) throw new Error('Invalid base32 character')
    return value.toString(2).padStart(5, '0')
  }).join('')
  
  const result = new Uint8Array(Math.ceil(binary.length / 8))
  for (let i = 0; i < binary.length; i += 8) {
    const byte = binary.substring(i, i + 8)
    result[i / 8] = parseInt(byte, 2)
  }
  return result.slice(0, 20)
}

function generateRandomSecret(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const bytes = crypto.randomBytes(length)
  let secret = ''
  for (let i = 0; i < length; i++) {
    secret += chars.charAt(bytes[i] % chars.length)
  }
  return secret
}

function generateRecoveryCodes(count: number): string[] {
  const codes: string[] = []
  const bytes = crypto.randomBytes(count * 6)
  for (let i = 0; i < count; i++) {
    const code = bytes.slice(i * 6, i * 6 + 6).toString('hex').toUpperCase().substring(0, 6)
    codes.push(code)
  }
  return codes
}

function generateQRCode(otpauthUrl: string): string {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <rect width="200" height="200" fill="#ffffff"/>
    <path d="M100 0 L100 200 L200 200 L200 100 L0 100 Z" fill="#10b981"/>
    <text x="50%" y="50%" font-family="Arial" font-size="12" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">2FA</text>
  </svg>`)}`
}

export const enableTwoFactor = async (userId: string, secret: string, recoveryCodes: string[]): Promise<{ success: boolean; qrCode: string }> => {
  const otpauthUrl = `otpauth://totp/AhorrApp:${secret}?secret=${secret}&issuer=AhorrApp&digits=6&period=30`
  
  try {
    const prisma = require('@/lib/prisma').default
    await prisma.accounts.update({
      where: { id: userId },
      data: {
        two_factor_secret: secret,
        two_factor_recovery_codes: recoveryCodes,
        two_factor_enabled: false
      }
    })
    
    return {
      success: true,
      qrCode: generateQRCode(otpauthUrl)
    }
  } catch (error) {
    console.error('Error enabling 2FA:', error)
    return {
      success: false,
      qrCode: ''
    }
  }
}

export const verifyTwoFactorCode = async (userId: string, token: string): Promise<{ success: boolean; recoveryCodes?: string[] }> => {
  try {
    const prisma = require('@/lib/prisma').default
    const user = await prisma.accounts.findUnique({
      where: { id: userId },
      select: {
        two_factor_secret: true,
        two_factor_recovery_codes: true,
        two_factor_enabled: true
      }
    })
    
    if (!user || !user.two_factor_secret) {
      return { success: false }
    }
    
    const isValid = verifyTOTP(token, user.two_factor_secret)
    
    if (isValid) {
      await prisma.accounts.update({
        where: { id: userId },
        data: {
          two_factor_enabled: true,
          two_factor_verified_at: new Date()
        }
      })
      
      return { success: true }
    }
    
    return { 
      success: false,
      recoveryCodes: user.two_factor_recovery_codes || []
    }
  } catch (error) {
    console.error('Error verifying 2FA:', error)
    return { success: false }
  }
}

export const disableTwoFactor = async (userId: string, token: string): Promise<{ success: boolean }> => {
  try {
    const prisma = require('@/lib/prisma').default
    await prisma.accounts.update({
      where: { id: userId },
      data: {
        two_factor_secret: null,
        two_factor_recovery_codes: [],
        two_factor_enabled: false,
        two_factor_verified_at: null
      }
    })
    
    return { success: true }
  } catch (error) {
    console.error('Error disabling 2FA:', error)
    return { success: false }
  }
}
