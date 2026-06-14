import crypto from 'crypto';
import { promisify } from 'util';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

const pbkdf2Async = promisify(crypto.pbkdf2);

function getMasterSalt(): string {
  const salt = process.env.MASTER_SALT;
  if (!salt) {
    throw new Error('MASTER_SALT environment variable is missing.');
  }
  return salt;
}

async function deriveKey(clerkId: string, salt: string): Promise<Buffer> {
  return pbkdf2Async(clerkId, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Hybrid E2EE Encryption (RSA-OAEP + AES-GCM)
 * Encrypts data using a random symmetric key, then encrypts the key with the student's public key.
 * Packet format: [Encrypted AES Key Length (4 bytes)] [Encrypted AES Key] [IV (12)] [Auth Tag (16)] [Ciphertext]
 */
export async function encryptOMRData(studentPublicKeyPem: string, dataString: string): Promise<Buffer> {
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, aesKey, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(dataString, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const encryptedAesKey = crypto.publicEncrypt(
    {
      key: studentPublicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    aesKey
  );

  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(encryptedAesKey.length, 0);

  return Buffer.concat([
    lengthBuf,
    encryptedAesKey,
    iv,
    authTag,
    encrypted
  ]);
}

/**
 * Legacy Encryption Fallback (For students who have not initialized E2EE keys yet)
 */
export async function encryptOMRDataLegacy(clerkId: string, dataString: string): Promise<Buffer> {
  const masterSalt = getMasterSalt();
  const key = await deriveKey(clerkId, masterSalt);
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  
  const encrypted = Buffer.concat([cipher.update(dataString, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return Buffer.concat([iv, authTag, encrypted]);
}

export async function decryptOMRDataLegacy(clerkId: string, buffer: Buffer): Promise<string> {
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const masterSalt = getMasterSalt();
  const key = await deriveKey(clerkId, masterSalt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
