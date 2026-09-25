import { gmailAuthorizationUrl } from '@/lib/gmail/client';
import { signOAuthState } from '@/lib/gmail/security';
import { getAuthenticatedUserId } from '@/lib/server-auth';

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId)
    return Response.json(
      {
        error:
          'Confirma tu cuenta e ingresa nuevamente antes de conectar Gmail.',
      },
      { status: 401 },
    );
  try {
    const url = gmailAuthorizationUrl(await signOAuthState(userId));
    return Response.json({ url });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Gmail todavía no está configurado.',
      },
      { status: 503 },
    );
  }
}
