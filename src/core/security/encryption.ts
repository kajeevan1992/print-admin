import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const secret = process.env.PLATFORM_SECRET_KEY || process.env.NEXTAUTH_SECRET || 'development-only-change-me';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(value: string) {
  const [ivHex, tagHex, encryptedHex] = value.split(':');
  if (!ivHex || !tagHex || !encryptedHex) return '';
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}
