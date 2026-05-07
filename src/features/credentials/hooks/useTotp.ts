import { useEffect, useState } from "react";

const TOTP_STEP = 30; // seconds
const TOTP_DIGITS = 6;

interface TotpState {
  code: string;
  progress: number; // 0-1 within the current step
  secondsRemaining: number;
  isValid: boolean;
  error: string | null;
}

export function useTotp(secret: string | null): TotpState {
  const [state, setState] = useState<TotpState>({
    code: "------",
    progress: 0,
    secondsRemaining: TOTP_STEP,
    isValid: false,
    error: null,
  });

  useEffect(() => {
    if (!secret || !secret.trim()) {
      setState({
        code: "------",
        progress: 0,
        secondsRemaining: TOTP_STEP,
        isValid: false,
        error: null,
      });
      return;
    }

    let cancelled = false;

    async function tick() {
      const nowMs = Date.now();
      const nowSec = Math.floor(nowMs / 1000);
      const counter = Math.floor(nowSec / TOTP_STEP);
      const elapsed = nowSec % TOTP_STEP;
      try {
        const code = await generateTotp(secret!, counter);
        if (cancelled) return;
        setState({
          code,
          progress: elapsed / TOTP_STEP,
          secondsRemaining: TOTP_STEP - elapsed,
          isValid: true,
          error: null,
        });
      } catch (e) {
        if (cancelled) return;
        setState({
          code: "------",
          progress: 0,
          secondsRemaining: TOTP_STEP,
          isValid: false,
          error: String(e),
        });
      }
    }

    tick();
    const iv = window.setInterval(tick, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, [secret]);

  return state;
}

async function generateTotp(secretBase32: string, counter: number): Promise<string> {
  const key = base32Decode(secretBase32.replace(/\s+/g, "").toUpperCase());
  if (key.length === 0) {
    throw new Error("Empty TOTP secret");
  }

  const counterBuffer = new ArrayBuffer(8);
  const view = new DataView(counterBuffer);
  view.setBigUint64(0, BigInt(counter), false);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const hmac = new Uint8Array(
    await crypto.subtle.sign("HMAC", cryptoKey, counterBuffer),
  );
  const offset = hmac[hmac.length - 1] & 0x0f;
  const truncated =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = truncated % 10 ** TOTP_DIGITS;
  return String(code).padStart(TOTP_DIGITS, "0");
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input: string): Uint8Array {
  const clean = input.replace(/=+$/, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${ch}`);
    }
    buffer = (buffer << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}
