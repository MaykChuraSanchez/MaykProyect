'use client';

import { type SyntheticEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  friendlyAuthError,
  getCloudAuthClient,
  isCloudAuthConfigured,
} from '@/lib/cloud-auth';

type ResetState = 'checking' | 'ready' | 'saving' | 'done' | 'error';

export default function ResetPasswordPage() {
  const [state, setState] = useState<ResetState>(
    isCloudAuthConfigured ? 'checking' : 'error',
  );
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState(
    isCloudAuthConfigured
      ? ''
      : 'La recuperación de cuenta aún no está configurada.',
  );

  useEffect(() => {
    if (!isCloudAuthConfigured) return;

    const client = getCloudAuthClient();
    let active = true;
    let timeout = 0;

    function fail() {
      if (!active) return;
      window.clearTimeout(timeout);
      setMessage('Este enlace ya venció. Solicita uno nuevo.');
      setState('error');
    }

    async function prepare() {
      const url = new URL(window.location.href);
      const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
      if (url.searchParams.get('error') || fragment.get('error')) {
        fail();
        return;
      }
      const code = url.searchParams.get('code');
      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) {
          fail();
          return;
        }
        window.history.replaceState({}, '', '/auth/reset');
      }

      const { data, error } = await client.auth.getSession();
      if (!active) return;
      if (error || !data.session) {
        timeout = window.setTimeout(fail, 7000);
        return;
      }
      window.clearTimeout(timeout);
      setState('ready');
    }

    void prepare();
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (active && session && event === 'PASSWORD_RECOVERY') {
        window.clearTimeout(timeout);
        setState('ready');
      }
    });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      data.subscription.unsubscribe();
    };
  }, []);

  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (password.length < 8) {
      setMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmation) {
      setMessage('Las contraseñas no coinciden.');
      return;
    }
    setState('saving');
    const { error } = await getCloudAuthClient().auth.updateUser({ password });
    if (error) {
      setMessage(friendlyAuthError(error.message).message);
      setState('ready');
      return;
    }
    await getCloudAuthClient().auth.signOut({ scope: 'local' });
    setPassword('');
    setConfirmation('');
    setState('done');
  }

  return (
    <main className="confirm-shell">
      <section className="confirm-card reset-card">
        <span className={`confirm-icon ${state === 'error' ? 'error' : ''}`}>
          {state === 'checking' || state === 'saving' ? (
            <LoaderCircle className="spin" />
          ) : state === 'done' ? (
            <Check />
          ) : (
            <ShieldCheck />
          )}
        </span>
        <small>SUMA · RECUPERACIÓN SEGURA</small>
        <h1>
          {state === 'checking'
            ? 'Validando tu enlace…'
            : state === 'done'
              ? 'Contraseña actualizada'
              : state === 'error'
                ? 'No pudimos validar el enlace'
                : 'Crea una contraseña nueva'}
        </h1>

        {state === 'ready' || state === 'saving' ? (
          <form className="reset-form" onSubmit={save}>
            <label>
              <span>Nueva contraseña</span>
              <input
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
              />
            </label>
            <label>
              <span>Confirmar contraseña</span>
              <input
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Repite la contraseña"
                required
              />
            </label>
            {message && (
              <p className="form-error" role="alert">
                <AlertTriangle /> {message}
              </p>
            )}
            <Button
              className="full-save"
              type="submit"
              disabled={state === 'saving'}
            >
              {state === 'saving' ? (
                <LoaderCircle className="spin" />
              ) : (
                <ShieldCheck />
              )}
              Guardar contraseña
            </Button>
          </form>
        ) : (
          <>
            <p>
              {state === 'checking'
                ? 'Estamos preparando la recuperación de tu cuenta.'
                : state === 'done'
                  ? 'Ya puedes ingresar a Suma con tu contraseña nueva.'
                  : message}
            </p>
            <Link href="/">
              {state === 'done' ? 'Ingresar a Suma' : 'Volver al ingreso'}
            </Link>
          </>
        )}
      </section>
    </main>
  );
}

