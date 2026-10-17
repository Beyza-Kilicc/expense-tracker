export const CATEGORIES = ['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Other'] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: string;
  description: string;
  /** Stored in kuruş (1/100 TL) as an integer, so sums never have floating-point errors. */
  amountCents: number;
  category: Category;
  /** ISO date, YYYY-MM-DD. */
  date: string;
}

export interface ExpenseDraft {
  description: string;
  amount: string;
  category: string;
  date: string;
}

export type ValidationErrors = Partial<Record<keyof ExpenseDraft, string>>;

/** "2026-03" for any date in March 2026. */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Accepts "12,50", "12.50" and "1.250,75" (Turkish thousands separator). */
export function parseAmount(input: string): number | null {
  let text = input.trim().replace(/\s|₺|TL/gi, '');
  if (!/^\d{1,3}([.,]?\d{3})*([.,]\d{1,2})?$|^\d+([.,]\d{1,2})?$/.test(text)) return null;
  const lastSep = Math.max(text.lastIndexOf(','), text.lastIndexOf('.'));
  if (lastSep !== -1 && text.length - lastSep - 1 <= 2) {
    text = text.slice(0, lastSep).replace(/[.,]/g, '') + '.' + text.slice(lastSep + 1);
  } else {
    text = text.replace(/[.,]/g, '');
  }
  const cents = Math.round(Number(text) * 100);
  return Number.isFinite(cents) && cents > 0 ? cents : null;
}

export function validateDraft(draft: ExpenseDraft): { errors: ValidationErrors; amountCents: number | null } {
  const errors: ValidationErrors = {};
  const description = draft.description.trim();
  if (!description) errors.description = 'Add a short description.';
  else if (description.length > 80) errors.description = 'Keep it under 80 characters.';

  const amountCents = parseAmount(draft.amount);
  if (amountCents === null) errors.amount = 'Enter an amount greater than 0, e.g. 149,90.';
  else if (amountCents > 100_000_000) errors.amount = 'That amount looks too large.';

  if (!(CATEGORIES as readonly string[]).includes(draft.category)) errors.category = 'Pick a category.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) errors.date = 'Pick a date.';

  return { errors, amountCents };
}

export function inMonth(expenses: Expense[], month: string): Expense[] {
  return expenses.filter((e) => monthKey(e.date) === month).sort((a, b) => b.date.localeCompare(a.date));
}

export function total(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amountCents, 0);
}

export interface CategoryTotal {
  category: Category;
  cents: number;
  share: number;
}

/** Totals per category, largest first. Categories with no spending are left out. */
export function byCategory(expenses: Expense[]): CategoryTotal[] {
  const sums = new Map<Category, number>();
  for (const e of expenses) sums.set(e.category, (sums.get(e.category) ?? 0) + e.amountCents);
  const all = total(expenses);
  return [...sums.entries()]
    .map(([category, cents]) => ({ category, cents, share: all ? cents / all : 0 }))
    .sort((a, b) => b.cents - a.cents);
}

/** Percentage change from the previous value, or null when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function csvCell(value: string): string {
  // Quote cells that contain separators, and neutralise formulas so the file is safe to open in Excel.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(expenses: Expense[]): string {
  const rows = [['Date', 'Description', 'Category', 'Amount (TRY)']];
  for (const e of expenses) {
    rows.push([e.date, e.description, e.category, (e.amountCents / 100).toFixed(2)]);
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

const formatter = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
export function formatMoney(cents: number): string {
  return formatter.format(cents / 100);
}

/** Drops anything in storage that doesn't look like a valid expense. */
export function sanitizeStored(value: unknown): Expense[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (e): e is Expense =>
      typeof e === 'object' &&
      e !== null &&
      typeof e.id === 'string' &&
      typeof e.description === 'string' &&
      Number.isInteger(e.amountCents) &&
      e.amountCents > 0 &&
      (CATEGORIES as readonly string[]).includes(e.category) &&
      typeof e.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(e.date),
  );
}
