self.onmessage = async (e) => {
  const { encryptedBlob, clerkId } = e.data;

  try {
    // 1. Convert clerkId to a crypto key (PBKDF2 or SHA-256 for a 256-bit key)
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      "raw",
      enc.encode(clerkId),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    // Use a fixed salt (in a real app, you might want to use a dynamic salt)
    const salt = enc.encode("yks-platform-salt");

    const aesKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    // 2. Read the binary blob
    const buffer = await encryptedBlob.arrayBuffer();
    
    // The IV is typically stored at the beginning of the buffer (16 bytes for AES-CBC, 12 bytes for AES-GCM)
    // Assuming AES-256-GCM with 12 bytes IV
    const iv = buffer.slice(0, 12);
    const data = buffer.slice(12);

    // 3. Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(iv),
      },
      aesKey,
      data
    );

    // 4. Decode to string
    const dec = new TextDecoder();
    const decryptedString = dec.decode(decryptedBuffer);
    
    // 5. Send back
    self.postMessage({ success: true, data: JSON.parse(decryptedString) });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};
