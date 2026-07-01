import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function secret() {
  return process.env.AUTH_SECRET || "local-development-column-management-secret";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createCaptcha() {
  const a = Math.floor(Math.random() * 8) + 2;
  const b = Math.floor(Math.random() * 8) + 2;
  const expires = Date.now() + 10 * 60 * 1000;
  const nonce = randomBytes(8).toString("hex");
  const payload = `${a}:${b}:${expires}:${nonce}`;
  return {
    question: `${a} + ${b}`,
    token: `${payload}:${sign(payload)}`
  };
}

export function verifyCaptcha(token: string, answer: string) {
  const parts = token.split(":");
  if (parts.length !== 5) return false;
  const [a, b, expires, nonce, signature] = parts;
  const payload = `${a}:${b}:${expires}:${nonce}`;
  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  if (Date.now() > Number(expires)) return false;
  return Number(answer) === Number(a) + Number(b);
}
