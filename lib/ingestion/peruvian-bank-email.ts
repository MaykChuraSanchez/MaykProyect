export type BankEmailInput = {
  gmailMessageId: string;
  from: string;
  subject: string;
  sentBy?: string;
  date?: string;
  text: string;
};

export type IngestedMovementDraft = {
  externalId: string;
  fingerprint: string;
  bank: 'BCP' | 'Interbank';
  type: 'Gasto' | 'Ingreso' | 'Transferencia';
  amount: number;
  currency: 'PEN' | 'USD';
  description: string;
  merchant?: string;
  paymentMethod: string;
  movementDate: string;
  category: string;
  status: 'Por revisar';
  confidence: number;
  evidence: string[];
};

const BANKS = {
  BCP: {
    from: 'notificaciones@notificacionesbcp.com.pe',
    sentBy: 'em4534.notificacionesbcp.com.pe',
    subject: /constancia de transferencia entre mis cuentas/i,
  },
  Interbank: {
    from: 'servicioalcliente@netinterbank.com.pe',
    sentBy: 'gnt.estadocuenta.interbank.pe',
    subject: /realizaste un consumo con tu tarjeta interbank visa d[eé]bito benefit/i,
  },
} as const;

export async function parsePeruvianBankEmail(input: BankEmailInput): Promise<IngestedMovementDraft | null> {
  const from = mailbox(input.from);
  const sentBy = domain(input.sentBy ?? '');
  const normalized = normalize(`${input.subject}\n${input.text}`);

  if (from === BANKS.BCP.from && BANKS.BCP.subject.test(input.subject) && trustedSender(sentBy, BANKS.BCP.sentBy)) {
    const amount = extractAmount(normalized);
    if (!amount) return null;
    const movementDate = extractDate(normalized, input.date);
    return finish({
      input, bank: 'BCP', type: 'Transferencia', amount: amount.value, currency: amount.currency,
      description: 'Transferencia entre cuentas BCP', paymentMethod: 'Cuenta BCP', movementDate,
      category: 'Transferencias', confidence: 0.92,
      evidence: ['Remitente BCP verificado', 'Asunto de transferencia reconocido', 'Monto detectado'],
    });
  }

  if (from === BANKS.Interbank.from && BANKS.Interbank.subject.test(input.subject) && trustedSender(sentBy, BANKS.Interbank.sentBy)) {
    const amount = extractAmount(normalized);
    if (!amount) return null;
    const merchant = extractMerchant(normalized);
    const movementDate = extractDate(normalized, input.date);
    return finish({
      input, bank: 'Interbank', type: 'Gasto', amount: amount.value, currency: amount.currency,
      description: merchant ? `Consumo en ${merchant}` : 'Consumo con Tarjeta Interbank Visa Débito Benefit',
      merchant, paymentMethod: 'Interbank Visa Débito Benefit', movementDate,
      category: guessCategory(merchant), confidence: merchant ? 0.96 : 0.88,
      evidence: ['Remitente Interbank verificado', 'Asunto de consumo reconocido', 'Monto detectado'],
    });
  }

  return null;
}

function finish(input: Omit<IngestedMovementDraft, 'externalId' | 'fingerprint' | 'status'> & { input: BankEmailInput }) {
  const { input: email, ...draft } = input;
  return sha256(`${draft.bank}|${email.gmailMessageId}|${draft.amount}|${draft.movementDate}`).then((fingerprint) => ({
    ...draft, externalId: email.gmailMessageId, fingerprint, status: 'Por revisar' as const,
  }));
}

function mailbox(value: string) {
  return (value.match(/<([^>]+)>/)?.[1] ?? value).trim().toLowerCase();
}

function domain(value: string) {
  return value.toLowerCase().replace(/[<>]/g, '').split('@').at(-1)?.trim().replace(/^mail\./, '') ?? '';
}

function trustedSender(actual: string, expected: string) {
  return actual === expected;
}

function normalize(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\r/g, '').trim();
}

function extractAmount(value: string) {
  const patterns = [
    /(?:monto|importe|consumo|transferiste|transferencia)(?:\s+(?:total|de))?\s*[:\-]?\s*(S\/|PEN|US\$|USD|\$)\s*([\d.,]+)/i,
    /(S\/|PEN|US\$|USD)\s*([\d.,]+)/i,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (!match) continue;
    const amount = parseLocalizedAmount(match[2]);
    if (amount > 0) return { value: amount, currency: /US\$|USD|\$/i.test(match[1]) ? 'USD' as const : 'PEN' as const };
  }
  return null;
}

function parseLocalizedAmount(value: string) {
  const compact = value.replace(/\s/g, '');
  const decimalSeparator = compact.lastIndexOf(',') > compact.lastIndexOf('.') ? ',' : '.';
  const normalized = decimalSeparator === ','
    ? compact.replace(/\./g, '').replace(',', '.')
    : compact.replace(/,/g, '');
  return Number(normalized);
}

function extractDate(value: string, fallback?: string) {
  const match = value.match(/(?:fecha|realizado el|operaci[oó]n el)\s*[:\-]?\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/i);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  const date = fallback ? new Date(fallback) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function extractMerchant(value: string) {
  const patterns = [
    /(?:establecimiento|comercio)\s*[:\-]\s*([^\n]{2,80})/i,
    /consumo (?:en|de)\s+([^\n,.;]{2,80})/i,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1].trim().replace(/\s{2,}/g, ' ').slice(0, 80);
  }
  return undefined;
}

function guessCategory(merchant?: string) {
  const value = merchant?.toLowerCase() ?? '';
  if (/plaza vea|wong|metro|tottus|vivanda|supermerc/.test(value)) return 'Alimentación';
  if (/uber|cabify|beat|repsol|primax|grifo/.test(value)) return 'Transporte';
  if (/rappi|pedidosya|restaurant|caf[eé]|starbucks/.test(value)) return 'Restaurantes';
  return 'Por categorizar';
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
