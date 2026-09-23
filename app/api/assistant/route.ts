import { answerFinancialQuestion } from '@/lib/finance';
import { getRequestUserId, loadFinanceData } from '@/lib/server-finance';

export async function POST(request: Request) {
  const userId = getRequestUserId(request);
  if (!userId) return Response.json({ error: 'Autenticación requerida' }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const question = String(body.question ?? '').trim().slice(0, 300);
  if (!question) return Response.json({ error: 'Escribe una pregunta.' }, { status: 400 });
  const data = await loadFinanceData(userId);
  return Response.json({ answer: answerFinancialQuestion(question, data), calculatedAt: new Date().toISOString() });
}
