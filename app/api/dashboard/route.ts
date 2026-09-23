import { calculateFinancialSummary, generateInsights } from '@/lib/finance';
import { getRequestUserId, loadFinanceData } from '@/lib/server-finance';

export async function GET(request: Request) {
  const userId = getRequestUserId(request);
  if (!userId) return Response.json({ error: 'Autenticación requerida' }, { status: 401 });
  try {
    const data = await loadFinanceData(userId);
    return Response.json({ data, summary: calculateFinancialSummary(data), insights: generateInsights(data) });
  } catch (error) {
    console.error('dashboard_load_failed', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'No pudimos cargar tu información financiera.' }, { status: 503 });
  }
}
