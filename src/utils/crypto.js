/**
 * Utility functions for Web Crypto API
 * Includes: SHA-256, ECDH (Key Exchange), AES-GCM (Encryption), ECDSA (Digital Signature)
 */

/**
 * Generate a pair of ECDH keys for key exchange
 * Curve: P-256 (--------)
 */
export async function generateECDHKeys() {
  return await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
}

/**
 * Generate a pair of ECDSA keys for digital signatures
 * Curve: P-256
 */
export async function generateECDSAKeys() {
  return await window.crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
}

/**
 * Derive a shared AES-GCM key from a private ECDH key and a public ECDH key
 */
export async function deriveSharedSecret(privateKey, publicKey) {
  return await window.crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Derive shared bits for display (Shared Secret) from ECDH
 */
export async function deriveSharedBits(privateKey, publicKey) {
  return await window.crypto.subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256
  );
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptAES(key, plaintext) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    data
  );

  return { ciphertext, iv };
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptAES(key, ciphertext, iv) {
  try {
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (e) {
    console.error("Decryption failed", e);
    return null;
  }
}

/**
 * Sign data using ECDSA
 */
export async function signECDSA(privateKey, data) {
  // We can sign either a string or a buffer. 
  // The user requested SHA-256 hashing as part of the combo.
  // ECDSA internal hashing is handled by the browser if we specify it.

  const encoder = new TextEncoder();
  const messageData = typeof data === 'string' ? encoder.encode(data) : data;

  return await window.crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    privateKey,
    messageData
  );
}

/**
 * Verify ECDSA signature
 */
export async function verifyECDSA(publicKey, signature, data) {
  const encoder = new TextEncoder();
  const messageData = typeof data === 'string' ? encoder.encode(data) : data;

  try {
    return await window.crypto.subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      publicKey,
      signature,
      messageData
    );
  } catch (e) {
    console.error("Verification failed", e);
    return false;
  }
}

/**
 * Helper: SHA-256 Hash
 */
export async function hashSHA256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  return hashBuffer;
}

/**
 * Helper: ArrayBuffer to Hex String
 */
export function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Helper: ArrayBuffer to Formatted Hex String (spaced)
 */
export function formattedBufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ')
    .toUpperCase();
}

/**
 * Helper: Hex String to ArrayBuffer
 */
export function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  return bytes.buffer;
}

/**
 * Helper: Export public key to SPKI format (Hex)
 */
export async function exportPublicKey(key) {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return bufferToHex(exported);
}

/**
 * Helper: Export public key to RAW format (Uncompressed 65-byte: 04 + X + Y)
 * This format does NOT have the ASN.1/SPKI header.
 */
export async function exportRawPublicKey(key) {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return bufferToHex(exported);
}

/**
 * Helper: Export key to JWK format (for storage)
 */
export async function exportKeyToJWK(key) {
  if (!key) return null;
  // If it's already a JWK (not a CryptoKey instance), just return it
  if (!(key instanceof CryptoKey)) {
    return key;
  }
  return await window.crypto.subtle.exportKey("jwk", key);
}

/**
 * Helper: Import key from JWK format
 */
export async function importKeyFromJWK(jwk, algorithm, usages) {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    algorithm,
    true,
    usages
  );
}
