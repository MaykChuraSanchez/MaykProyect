import { emptyFinanceData, type FinanceData } from '@/lib/finance';

export type LocalUser = { name: string; email: string };

type StoredAccount = LocalUser & {
  salt: string;
  passwordHash: string;
  createdAt: string;
};

const ACCOUNTS_KEY = 'suma-local-accounts-v1';
const SESSION_KEY = 'suma-local-session-v1';
const dataKey = (email: string) =>
  `suma-finance-data-v1:${normalizeEmail(email)}`;

export function currentLocalUser(): LocalUser | null {
  const email = window.localStorage.getItem(SESSION_KEY);
  if (!email) return null;
  const account = readAccounts().find((item) => item.email === email);
  return account ? { name: account.name, email: account.email } : null;
}

export async function registerLocalUser(
  name: string,
  email: string,
  password: string,
) {
  const normalizedEmail = normalizeEmail(email);
  if (name.trim().length < 2) throw new Error('Escribe tu nombre completo.');
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail))
    throw new Error('Escribe un correo válido.');
  if (password.length < 8)
    throw new Error('La contraseña debe tener al menos 8 caracteres.');
  const accounts = readAccounts();
  if (accounts.some((item) => item.email === normalizedEmail))
    throw new Error('Este correo ya está registrado en este dispositivo.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const account: StoredAccount = {
    name: name.trim().slice(0, 80),
    email: normalizedEmail,
    salt: bytesToBase64(salt),
    passwordHash: await derivePassword(password, salt),
    createdAt: new Date().toISOString(),
  };
  window.localStorage.setItem(
    ACCOUNTS_KEY,
    JSON.stringify([...accounts, account]),
  );
  window.localStorage.setItem(SESSION_KEY, normalizedEmail);
  saveLocalFinanceData(normalizedEmail, emptyFinanceData());
  return { name: account.name, email: account.email } satisfies LocalUser;
}

export async function signInLocalUser(email: string, password: string) {
  const account = readAccounts().find(
    (item) => item.email === normalizeEmail(email),
  );
  if (!account)
    throw new Error(
      'No encontramos una cuenta con ese correo en este dispositivo.',
    );
  const hash = await derivePassword(password, base64ToBytes(account.salt));
  if (hash !== account.passwordHash)
    throw new Error('La contraseña no es correcta.');
  window.localStorage.setItem(SESSION_KEY, account.email);
  return { name: account.name, email: account.email } satisfies LocalUser;
}

export function signOutLocalUser() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function loadLocalFinanceData(email: string): FinanceData {
  try {
    const raw = window.localStorage.getItem(dataKey(email));
    return raw
      ? { ...emptyFinanceData(), ...JSON.parse(raw), demoMode: false }
      : emptyFinanceData();
  } catch {
    return emptyFinanceData();
  }
}

export function saveLocalFinanceData(email: string, data: FinanceData) {
  window.localStorage.setItem(
    dataKey(email),
    JSON.stringify({ ...data, demoMode: false }),
  );
}

export function clearLocalFinanceData(email: string) {
  const clean = emptyFinanceData();
  saveLocalFinanceData(email, clean);
  return clean;
}

function readAccounts(): StoredAccount[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

async function derivePassword(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: salt as BufferSource,
      iterations: 210_000,
    },
    key,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

function bytesToBase64(value: Uint8Array) {
  let binary = '';
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
