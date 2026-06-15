const PBKDF2_ITERATIONS = 100000;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateRsaKeyPair(keySize: 2048 | 4096 = 4096): Promise<{ publicKeyPem: string, privateKeyPem: string }> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: keySize,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const exportedPublic = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const publicPem = `-----BEGIN PUBLIC KEY-----\n${window.btoa(String.fromCharCode(...new Uint8Array(exportedPublic)))}\n-----END PUBLIC KEY-----`;

  const exportedPrivate = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const privatePem = `-----BEGIN PRIVATE KEY-----\n${window.btoa(String.fromCharCode(...new Uint8Array(exportedPrivate)))}\n-----END PRIVATE KEY-----`;

  return { publicKeyPem: publicPem, privateKeyPem: privatePem };
}

async function derivePasswordKey(password: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptPrivateKey(privateKeyPem: string, password: string, firebaseUid: string): Promise<string> {
  const derivedKey = await derivePasswordKey(password, firebaseUid);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(privateKeyPem);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    data
  );

  const packet = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  packet.set(iv, 0);
  packet.set(new Uint8Array(ciphertext), iv.byteLength);

  return arrayBufferToBase64(packet.buffer);
}

export async function decryptPrivateKey(encryptedPrivateKeyBase64: string, password: string, firebaseUid: string): Promise<string> {
  try {
    const derivedKey = await derivePasswordKey(password, firebaseUid);
    const packet = new Uint8Array(base64ToArrayBuffer(encryptedPrivateKeyBase64));

    const iv = packet.slice(0, 12);
    const ciphertext = packet.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      derivedKey,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    throw new Error("Şifre hatalı veya özel anahtar bozulmuş.");
  }
}
