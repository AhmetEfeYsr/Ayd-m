import * as Comlink from 'comlink';

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export class DashboardCalculator {
  calculateNetScore(correct: number, wrong: number): number {
    const net = correct - (wrong / 4);
    return net > 0 ? net : 0;
  }

  processLargeDataSet(exams: any[]) {
    if (exams.length === 0) return 0;
    let totalNet = 0;
    for (const exam of exams) {
      totalNet += exam.netScore;
    }
    return totalNet / exams.length;
  }

  async deriveKey(clerkId: string, masterSalt: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(clerkId),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode(masterSalt),
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: ALGORITHM, length: 256 },
      false,
      ["decrypt"]
    );
  }

  async decryptOMRBuffer(clerkId: string, masterSalt: string, buffer: ArrayBuffer): Promise<string> {
    const key = await this.deriveKey(clerkId, masterSalt);
    
    // Node.js Buffer formatı: [IV (12)][AuthTag (16)][Ciphertext]
    const iv = buffer.slice(0, IV_LENGTH);
    const authTag = buffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = buffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    
    // Web Crypto API formatı: [Ciphertext][AuthTag]
    const webCryptoBuffer = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
    webCryptoBuffer.set(new Uint8Array(ciphertext), 0);
    webCryptoBuffer.set(new Uint8Array(authTag), ciphertext.byteLength);

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv: new Uint8Array(iv) },
        key,
        webCryptoBuffer
      );
      return new TextDecoder().decode(decryptedBuffer);
    } catch (e) {
      throw new Error("ZK Decryption failed. Invalid Key or Corrupted Data.");
    }
  }

  // ─── ZK RSA-2048 Hybrid Cryptography ──────────────────────────────────────

  async generateRSAKeyPair(): Promise<{ publicKeyJwk: any, privateKeyJwk: any }> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256"
      },
      true,
      ["encrypt", "decrypt"]
    );
    const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    return { publicKeyJwk, privateKeyJwk };
  }

  async deriveSymmetricKeyFromUid(firebaseUid: string, saltString: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(firebaseUid),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode(saltString),
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: ALGORITHM, length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async encryptPrivateKey(privateKeyJwk: any, firebaseUid: string, saltString: string): Promise<string> {
    const key = await this.deriveSymmetricKeyFromUid(firebaseUid, saltString);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const data = new TextEncoder().encode(JSON.stringify(privateKeyJwk));
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    // Format iv_hex:ciphertext_base64
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
    return `${ivHex}:${ciphertextBase64}`;
  }

  async decryptPrivateKey(encryptedPrivateKeyString: string, firebaseUid: string, saltString: string): Promise<any> {
    const [ivHex, ciphertextBase64] = encryptedPrivateKeyString.split(':');
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const ciphertext = new Uint8Array(atob(ciphertextBase64).split('').map(char => char.charCodeAt(0)));
    
    const key = await this.deriveSymmetricKeyFromUid(firebaseUid, saltString);
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );
    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  async decryptOMRWithPrivateKey(privateKeyPem: string, buffer: ArrayBuffer): Promise<string> {
    try {
      // 1. Remove PEM header/footer and whitespaces
      const pemHeader = "-----BEGIN PRIVATE KEY-----";
      const pemFooter = "-----END PRIVATE KEY-----";
      const pemContents = privateKeyPem
        .replace(pemHeader, "")
        .replace(pemFooter, "")
        .replace(/\s/g, "");
        
      // 2. Decode base64 to ArrayBuffer
      const binaryString = atob(pemContents);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const privateKeyBuffer = bytes.buffer;

      // 3. Import private key
      const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        privateKeyBuffer,
        {
          name: "RSA-OAEP",
          hash: "SHA-256"
        },
        false,
        ["decrypt"]
      );

      // 4. Parse Layout: [DEK Length (4 bytes)][Encrypted DEK][IV (12 bytes)][Auth Tag (16 bytes)][Ciphertext]
      const view = new DataView(buffer);
      const dekLength = view.getUint32(0, false);

      const encryptedDEK = buffer.slice(4, 4 + dekLength);
      const offsetIV = 4 + dekLength;
      
      const iv = buffer.slice(offsetIV, offsetIV + IV_LENGTH);
      const offsetTag = offsetIV + IV_LENGTH;
      
      const authTag = buffer.slice(offsetTag, offsetTag + AUTH_TAG_LENGTH);
      const offsetCipher = offsetTag + AUTH_TAG_LENGTH;
      
      const ciphertext = buffer.slice(offsetCipher);

      // 5. Decrypt AES DEK with RSA Private Key
      const dekBuffer = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        encryptedDEK
      );

      // 6. Import AES Key
      const aesKey = await crypto.subtle.importKey(
        "raw",
        dekBuffer,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );

      // 7. Build Web Crypto format buffer: [Ciphertext][AuthTag]
      const webCryptoBuffer = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
      webCryptoBuffer.set(new Uint8Array(ciphertext), 0);
      webCryptoBuffer.set(new Uint8Array(authTag), ciphertext.byteLength);

      // 8. Decrypt ciphertext with AES-GCM
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        aesKey,
        webCryptoBuffer
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (e: any) {
      console.error("OMR PEM decryption error:", e);
      throw new Error("ZK RSA Decryption failed. Invalid Key or Corrupted Data.");
    }
  }

  async decryptOMRHybrid(buffer: ArrayBuffer, privateKeyJwk: any): Promise<string> {
    try {
      // 1. Import private key
      const privateKey = await crypto.subtle.importKey(
        "jwk",
        privateKeyJwk,
        {
          name: "RSA-OAEP",
          hash: "SHA-256"
        },
        false,
        ["decrypt"]
      );

      // 2. Parse Layout: [DEK Length (4 bytes)][Encrypted DEK][IV (12 bytes)][Auth Tag (16 bytes)][Ciphertext]
      const view = new DataView(buffer);
      const dekLength = view.getUint32(0, false);

      const encryptedDEK = buffer.slice(4, 4 + dekLength);
      const offsetIV = 4 + dekLength;
      
      const iv = buffer.slice(offsetIV, offsetIV + IV_LENGTH);
      const offsetTag = offsetIV + IV_LENGTH;
      
      const authTag = buffer.slice(offsetTag, offsetTag + AUTH_TAG_LENGTH);
      const offsetCipher = offsetTag + AUTH_TAG_LENGTH;
      
      const ciphertext = buffer.slice(offsetCipher);

      // 3. Decrypt AES DEK with RSA Private Key
      const dekBuffer = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        encryptedDEK
      );

      // 4. Import AES Key
      const aesKey = await crypto.subtle.importKey(
        "raw",
        dekBuffer,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );

      // 5. Build Web Crypto format buffer: [Ciphertext][AuthTag]
      const webCryptoBuffer = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
      webCryptoBuffer.set(new Uint8Array(ciphertext), 0);
      webCryptoBuffer.set(new Uint8Array(authTag), ciphertext.byteLength);

      // 6. Decrypt ciphertext with AES-GCM
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        aesKey,
        webCryptoBuffer
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (e: any) {
      console.error("OMR Hybrid decryption error:", e);
      throw new Error("ZK RSA Decryption failed. Invalid Key or Corrupted Data.");
    }
  }
}

Comlink.expose(new DashboardCalculator());
