// Chiffrement AES-GCM des tokens Strava stockés en D1.
let cachedKey: Promise<CryptoKey> | null = null;

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function getKey(rawB64: string): Promise<CryptoKey> {
  cachedKey ??= crypto.subtle.importKey("raw", b64ToBytes(rawB64), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
  return cachedKey;
}

export async function encrypt(plain: string, keyB64: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await getKey(keyB64),
    new TextEncoder().encode(plain),
  );
  const out = new Uint8Array(iv.length + ct.byteLength);
  out.set(iv);
  out.set(new Uint8Array(ct), iv.length);
  return bytesToB64(out);
}

export async function decrypt(payload: string, keyB64: string): Promise<string> {
  const bytes = b64ToBytes(payload);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.slice(0, 12) },
    await getKey(keyB64),
    bytes.slice(12),
  );
  return new TextDecoder().decode(pt);
}

export function randomToken(bytes = 32): string {
  return bytesToB64(crypto.getRandomValues(new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return bytesToB64(new Uint8Array(digest));
}
