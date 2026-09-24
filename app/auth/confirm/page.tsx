'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, LoaderCircle, ShieldCheck } from 'lucide-react';
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
    client.auth.getSession().then(({ data }) => {
      if (data.session) setState('ready');
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (session) setState('ready');
      else window.setTimeout(() => setState('error'), 4500);
    });
    const timeout = window.setTimeout(() => setState('error'), 8000);
    return () => {
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
