import crypto from 'node:crypto';

const TIME_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const CHALLENGE_TTL_SECONDS = 5 * 60;

type ChallengePayload = {
  userId: string;
  username: string;
  ip: string;
  exp: number;
};

function base32ToBuffer(base32: string): Buffer {
  const normalized = base32.replace(/=+$/g, '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of normalized) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number): string {
  const key = base32ToBuffer(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter % 0x100000000, 4);

  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const otp = binary % 10 ** TOTP_DIGITS;
  return String(otp).padStart(TOTP_DIGITS, '0');
}

function getTotpCounter(now = Date.now()): number {
  return Math.floor(now / 1000 / TIME_STEP_SECONDS);
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value: string): string {
  const base64 = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Buffer.from(base64, 'base64').toString('utf8');
}

function getChallengeSigningSecret(): string {
  return (
    process.env.ADMIN_AUTH_CHALLENGE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  );
}

function sign(value: string): string {
  return crypto
    .createHmac('sha256', getChallengeSigningSecret())
    .update(value)
    .digest('base64url');
}

function normalizeCode(code: string): string {
  return code.replace(/\D/g, '').slice(0, 6);
}

function parseSecrets(): Record<string, string> {
  const raw = process.env.ADMIN_TOTP_SECRETS_JSON;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed || {};
  } catch {
    return {};
  }
}

export function getMfaSecretForUser(params: {
  userId: string;
  username: string;
}): string | null {
  const secrets = parseSecrets();
  const fromUserId = secrets[params.userId];
  if (fromUserId) return fromUserId;
  const fromUsername = secrets[params.username];
  if (fromUsername) return fromUsername;
  const fromNormalized = secrets[params.username.toLowerCase().trim()];
  return fromNormalized || null;
}

export function createMfaChallengeToken(params: {
  userId: string;
  username: string;
  ip: string;
}): string {
  if (!getChallengeSigningSecret()) {
    throw new Error('Missing challenge signing secret');
  }
  const payload: ChallengePayload = {
    userId: params.userId,
    username: params.username,
    ip: params.ip,
    exp: Math.floor(Date.now() / 1000) + CHALLENGE_TTL_SECONDS,
  };
  const serialized = JSON.stringify(payload);
  const payloadToken = base64UrlEncode(serialized);
  const signature = sign(payloadToken);
  return `${payloadToken}.${signature}`;
}

export function verifyMfaChallengeToken(
  token: string,
  ip: string
): ChallengePayload | null {
  if (!getChallengeSigningSecret()) return null;
  const [payloadToken, signature] = token.split('.');
  if (!payloadToken || !signature) return null;
  const expectedSig = sign(payloadToken);
  if (!safeEqual(signature, expectedSig)) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(payloadToken)) as ChallengePayload;
    if (!payload?.userId || !payload?.username || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.ip && payload.ip !== ip) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyTotpCode(secret: string, codeInput: string): boolean {
  const code = normalizeCode(codeInput);
  if (code.length !== TOTP_DIGITS) return false;
  const counter = getTotpCounter();
  for (let delta = -1; delta <= 1; delta += 1) {
    const expected = hotp(secret, counter + delta);
    if (safeEqual(code, expected)) return true;
  }
  return false;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const first = forwarded.split(',')[0]?.trim();
  if (first) return first;
  const realIp = request.headers.get('x-real-ip');
  return realIp || 'unknown';
}
