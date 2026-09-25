'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, LoaderCircle, ShieldCheck } from 'lucide-react';
import type { EmailOtpType } from '@supabase/supabase-js';
import { getCloudAuthClient, isCloudAuthConfigured } from '@/lib/cloud-auth';

export default function ConfirmEmailPage() {
  const [state, setState] = useState<'checking' | 'ready' | 'error'>(
    'checking',
  );

  useEffect(() => {
    if (!isCloudAuthConfigured) {
      setState('error');
      return;
    }
    const client = getCloudAuthClient();
    let active = true;
    async function confirm() {
      const url = new URL(window.location.href);
      const tokenHash = url.searchParams.get('token_hash');
      const type = url.searchParams.get('type') as EmailOtpType | null;
      const code = url.searchParams.get('code');
      let error: Error | null = null;

      if (tokenHash && type) {
        ({ error } = await client.auth.verifyOtp({ token_hash: tokenHash, type }));
      } else if (code) {
        ({ error } = await client.auth.exchangeCodeForSession(code));
      } else {
        const result = await client.auth.getSession();
        error = result.error;
        if (result.data.session && active) setState('ready');
        return;
      }

      if (!active) return;
      if (error) setState('error');
      else {
        window.history.replaceState({}, '', '/auth/confirm');
        setState('ready');
      }
    }
    void confirm();
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (active && session) setState('ready');
    });
    const timeout = window.setTimeout(() => setState('error'), 8000);
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
              : 'El enlace no pudo validarse'}
        </h1>
        <p>
          {state === 'checking'
            ? 'Estamos verificando el enlace de forma segura.'
            : state === 'ready'
              ? 'Tu espacio personal está listo. Ya puedes entrar a la plataforma.'
              : 'El enlace puede haber vencido o ya fue utilizado. Solicita uno nuevo desde la pantalla de ingreso.'}
        </p>
        <Link href="/">
          {state === 'ready' ? 'Abrir mi espacio' : 'Volver al ingreso'}
        </Link>
      </section>
    </main>
  );
}

