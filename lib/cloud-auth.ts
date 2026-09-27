import {
  createClient,
  type AuthChangeEvent,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';
import type { LocalUser } from '@/lib/local-account';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

export const isCloudAuthConfigured = Boolean(supabaseUrl && supabaseKey);

export function getCloudAuthClient() {
  if (!isCloudAuthConfigured)
    throw new Error('La autenticación por correo aún no está configurada.');
  client ??= createClient(supabaseUrl!, supabaseKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

export async function currentCloudUser(): Promise<LocalUser | null> {
  if (!isCloudAuthConfigured) return null;
  const { data, error } = await getCloudAuthClient().auth.getUser();
  if (error || !data.user?.email) return null;
  return toLocalUser(data.user.email, data.user.user_metadata?.name);
}

export function subscribeToCloudAuth(
  listener: (
    event: AuthChangeEvent,
    user: LocalUser | null,
    session: Session | null,
  ) => void,
) {
  if (!isCloudAuthConfigured) return () => undefined;
  const { data } = getCloudAuthClient().auth.onAuthStateChange(
    (event, session) => {
      const authUser = session?.user;
      listener(
        event,
        authUser?.email
          ? toLocalUser(authUser.email, authUser.user_metadata?.name)
          : null,
        session,
      );
    },
  );
  return () => data.subscription.unsubscribe();
}

export async function registerCloudUser(
  name: string,
  email: string,
  password: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await getCloudAuthClient().auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { name: name.trim().slice(0, 80) },
      emailRedirectTo: authRedirectUrl('/auth/confirm'),
    },
  });
  if (error) throw friendlyAuthError(error.message);
  if (data.session && data.user?.email)
    return {
      user: toLocalUser(data.user.email, data.user.user_metadata?.name),
      confirmationRequired: false,
    };
  return { user: null, confirmationRequired: true };
}

export async function signInCloudUser(email: string, password: string) {
  const { data, error } = await getCloudAuthClient().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw friendlyAuthError(error.message);
  if (!data.user.email)
    throw new Error('No pudimos identificar el correo de esta cuenta.');
  return toLocalUser(data.user.email, data.user.user_metadata?.name);
}

export async function resendCloudConfirmation(email: string) {
  const { error } = await getCloudAuthClient().auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: authRedirectUrl('/auth/confirm') },
  });
  if (error) throw friendlyAuthError(error.message);
}

export async function sendCloudPasswordReset(email: string) {
  const { error } = await getCloudAuthClient().auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: authRedirectUrl('/auth/reset') },
  );
  if (error) throw friendlyAuthError(error.message);
}

export async function signOutCloudUser() {
  if (!isCloudAuthConfigured) return;
  const { error } = await getCloudAuthClient().auth.signOut({ scope: 'local' });
  if (error) throw friendlyAuthError(error.message);
}

export async function getCloudAccessToken() {
  if (!isCloudAuthConfigured) return null;
  const { data } = await getCloudAuthClient().auth.getSession();
  return data.session?.access_token ?? null;
}

function toLocalUser(email: string, name?: unknown): LocalUser {
  const fallback = email.split('@')[0] || 'Usuario';
  return {
    email: email.toLowerCase(),
    name: typeof name === 'string' && name.trim() ? name.trim() : fallback,
  };
}

function authRedirectUrl(path: '/auth/confirm' | '/auth/reset') {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(
    /\/+$/,
    '',
  );
  const origin = configured || window.location.origin;
  try {
    const url = new URL(path, `${origin}/`);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    return new URL(path, window.location.origin).toString();
  }
}

export function friendlyAuthError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('email not confirmed'))
    return new Error('Debes confirmar tu correo antes de ingresar.');
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('user not found')
  )
    return new Error('Correo o contraseña incorrectos.');
  if (lower.includes('already registered') || lower.includes('already exists'))
    return new Error('Ya existe una cuenta con este correo.');
  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('over_email_send_rate_limit')
  )
    return new Error(
      'Se realizaron demasiados intentos. Intenta nuevamente en unos minutos.',
    );
  if (
    lower.includes('expired') ||
    lower.includes('otp_expired') ||
    lower.includes('invalid token')
  )
    return new Error('Este enlace ya venció. Solicita uno nuevo.');
  if (
    lower.includes('fetch') ||
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('load failed')
  )
    return new Error(
      'No pudimos conectarnos. Revisa tu conexión e intenta nuevamente.',
    );
  return new Error('No pudimos completar la solicitud. Intenta nuevamente.');
}

