import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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
      emailRedirectTo: `${window.location.origin}/auth/confirm`,
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
    options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
  });
  if (error) throw friendlyAuthError(error.message);
}

export async function signOutCloudUser() {
  if (isCloudAuthConfigured) await getCloudAuthClient().auth.signOut();
}

function toLocalUser(email: string, name?: unknown): LocalUser {
  const fallback = email.split('@')[0] || 'Usuario';
  return {
    email: email.toLowerCase(),
    name: typeof name === 'string' && name.trim() ? name.trim() : fallback,
  };
}

function friendlyAuthError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('email not confirmed'))
    return new Error(
      'Confirma tu correo antes de ingresar. Revisa también spam.',
    );
  if (lower.includes('invalid login credentials'))
    return new Error('El correo o la contraseña no son correctos.');
  if (lower.includes('already registered') || lower.includes('already exists'))
    return new Error('Este correo ya está registrado. Prueba ingresar.');
  if (lower.includes('rate limit'))
    return new Error('Espera unos minutos antes de solicitar otro correo.');
  return new Error(message || 'No pudimos completar la autenticación.');
}
