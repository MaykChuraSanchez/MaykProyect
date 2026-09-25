import { syncGmailForUser } from '@/lib/gmail/sync';
import { getAuthenticatedUserId } from '@/lib/server-auth';

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId)
    return Response.json({ error: 'Autenticación requerida' }, { status: 401 });
  try {
    return Response.json(await syncGmailForUser(userId));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo sincronizar Gmail.',
      },
      { status: 400 },
    );
  }
}
