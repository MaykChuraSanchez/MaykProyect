import { createClient } from '@supabase/supabase-js';

export async function getAuthenticatedUserId(request: Request) {
  if (process.env.APP_SINGLE_USER_ID) return process.env.APP_SINGLE_USER_ID;
  if (process.env.NODE_ENV !== 'production') return 'local-preview';

  const token = request.headers
    .get('authorization')
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return null;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : (data.user?.id ?? null);
}
