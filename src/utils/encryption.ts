import crypto from 'crypto'

export class DataEncryption {
  private readonly algorithm = 'aes-256-gcm'
  private readonly key: Buffer

  constructor(secret: string) {
    if (!secret) {
      throw new Error('Encryption secret is required')
    }
    this.key = crypto.createHash('sha256').update(secret).digest()
  }

  encrypt(plaintext: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag().toString('hex')

    return { encrypted, iv: iv.toString('hex'), authTag }
  }

  decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, Buffer.from(iv, 'hex'))
    decipher.setAuthTag(Buffer.from(authTag, 'hex'))

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  encryptObject(obj: object): { data: string; iv: string; authTag: string } {
    const plaintext = JSON.stringify(obj)
    const { encrypted, iv: ivHex, authTag } = this.encrypt(plaintext)
    return { data: encrypted, iv: ivHex, authTag }
  }

  decryptObject(data: string, iv: string, authTag: string): any {
    const plaintext = this.decrypt(data, iv, authTag)
    return JSON.parse(plaintext)
  }
}

export const createEncryption = (secret: string) => new DataEncryption(secret)
