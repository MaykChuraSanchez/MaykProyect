export type ReceiptDraft = {
  amount: number;
  merchant: string;
  movementDate: string;
  description: string;
  category: string;
  subcategory: string;
  confidence: number;
  rawText: string;
};

export function parseReceiptText(rawText: string): ReceiptDraft {
  const text = rawText
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const amount = findTotal(lines);
  const merchant = findMerchant(lines);
  const movementDate = findDate(text);
  const category = guessReceiptCategory(`${merchant}\n${text}`);
  const confidence = Math.min(
    0.98,
    0.35 +
      (amount > 0 ? 0.35 : 0) +
      (merchant ? 0.16 : 0) +
      (movementDate ? 0.12 : 0),
  );
  return {
    amount,
    merchant: merchant || 'Comercio por confirmar',
    movementDate: movementDate || new Date().toISOString().slice(0, 10),
    description: merchant
      ? `Compra en ${merchant}`
      : 'Compra registrada desde boleta',
    category,
    subcategory: category === 'Alimentación' ? 'Supermercado' : 'Compra',
    confidence,
    rawText: text,
  };
}

function findTotal(lines: string[]) {
  const preferred = lines.filter(
    (line) =>
      /\b(total(?:\s+a\s+pagar)?|importe\s+total|monto\s+total)\b/i.test(
        line,
      ) && !/subtotal/i.test(line),
  );
  for (const line of [...preferred.reverse(), ...lines.reverse()]) {
    const values = [
      ...line.matchAll(/(?:S\/?\.?|PEN)?\s*(\d{1,6}(?:[.,]\d{2}))/gi),
    ];
    const candidate = values.at(-1)?.[1];
    if (candidate) {
      const normalized =
        candidate.includes(',') && !candidate.includes('.')
          ? candidate.replace(',', '.')
          : candidate.replace(/,/g, '');
      const value = Number(normalized);
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return 0;
}

function findMerchant(lines: string[]) {
  const known = lines.find((line) =>
    /plaza\s*vea|tottus|metro|wong|vivanda|makro|mass|vega|oechsle|ripley|falabella/i.test(
      line,
    ),
  );
  if (known)
    return titleCase(known.replace(/[^\p{L}\p{N} .&-]/gu, '').slice(0, 70));
  const candidate = lines
    .slice(0, 7)
    .find(
      (line) =>
        line.length >= 3 &&
        line.length <= 70 &&
        !/ruc|boleta|factura|ticket|fecha|hora|caja|av\.|jr\.|calle|tel[eé]fono/i.test(
          line,
        ),
    );
  return candidate
    ? titleCase(candidate.replace(/[^\p{L}\p{N} .&-]/gu, ''))
    : '';
}

function findDate(text: string) {
  const match = text.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b/);
  if (!match) return '';
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

function guessReceiptCategory(value: string) {
  const text = value.toLowerCase();
  if (
    /plaza\s*vea|tottus|metro|wong|vivanda|makro|mass|supermerc|mercado|alimento/.test(
      text,
    )
  )
    return 'Alimentación';
  if (/farmacia|inkafarma|mifarma|botica|cl[ií]nica/.test(text)) return 'Salud';
  if (/primax|repsol|grifo|combustible/.test(text)) return 'Transporte';
  if (/restaurant|caf[eé]|poller[ií]a|cevicher[ií]a/.test(text))
    return 'Restaurantes';
  return 'Compras';
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toUpperCase())
    .trim();
}
