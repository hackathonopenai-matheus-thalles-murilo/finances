import type { Infer } from "convex/values";

import type { sealed } from "../schema";
import { requireEnv } from "./env";

export type Sealed = Infer<typeof sealed>;

export async function seal(plaintext: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await sealingKey(),
    new TextEncoder().encode(plaintext),
  );
  return { iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
}

export async function unseal({ iv, ciphertext }: Sealed) {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) },
    await sealingKey(),
    fromBase64(ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

function sealingKey() {
  return crypto.subtle.importKey("raw", fromBase64(requireEnv("SEALING_KEY")), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(base64: string) {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}
