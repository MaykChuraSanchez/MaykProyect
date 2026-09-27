'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, LoaderCircle, ShieldCheck } from 'lucide-react';
import type { EmailOtpType } from '@supabase/supabase-js';
import { getCloudAuthClient, isCloudAuthConfigured } from '@/lib/cloud-auth';

export default function ConfirmEmailPage() {
  const [state, setState] = useState<'checking' | 'ready' | 'error'>(
    isCloudAuthConfigured ? 'checking' : 'error',
  );

  useEffect(() => {
    if (!isCloudAuthConfigured) return;
    const client = getCloudAuthClient();
    let active = true;
    let settled = false;
    let timeout = 0;

    function finish(nextState: 'ready' | 'error') {
      if (!active || settled) return;
      settled = true;
      window.clearTimeout(timeout);
      setState(nextState);
    }

    async function confirm() {
      const url = new URL(window.location.href);
      const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
      if (url.searchParams.get('error') || fragment.get('error')) {
        finish('error');
        return;
      }
      const tokenHash = url.searchParams.get('token_hash');
      const type = url.searchParams.get('type') as EmailOtpType | null;
      const code = url.searchParams.get('code');
      let error: Error | null = null;

      if (tokenHash && type) {
        ({ error } = await client.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        }));
      } else if (code) {
        ({ error } = await client.auth.exchangeCodeForSession(code));
      } else {
        const result = await client.auth.getSession();
        error = result.error;
        if (result.data.session) finish('ready');
        return;
      }

      if (error) finish('error');
      else {
        window.history.replaceState({}, '', '/auth/confirm');
        finish('ready');
      }
    }
    void confirm();
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (session) finish('ready');
    });
    timeout = window.setTimeout(() => finish('error'), 10000);
    return () => {
      active = false;
      window.clearTimeout(timeout);
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="confirm-shell">
      <section className="confirm-card">
        <span className={`confirm-icon ${state}`}>
          {state === 'checking' ? (
            <LoaderCircle className="spin" />
          ) : state === 'ready' ? (
            <Check />
          ) : (
            <ShieldCheck />
          )}
        </span>
        <small>SUMA · CUENTA SEGURA</small>
        <h1>
          {state === 'checking'
            ? 'Confirmando tu correo…'
            : state === 'ready'
              ? 'Correo confirmado'
              : 'Este enlace ya venció'}
        </h1>
        <p>
          {state === 'checking'
            ? 'Estamos verificando el enlace de forma segura.'
            : state === 'ready'
              ? 'Correo confirmado correctamente. Ya puedes usar Suma.'
              : 'Este enlace ya venció. Solicita uno nuevo desde la pantalla de ingreso.'}
        </p>
        <Link href="/">
          {state === 'ready' ? 'Abrir mi espacio' : 'Volver al ingreso'}
        </Link>
      </section>
    </main>
  );
}

