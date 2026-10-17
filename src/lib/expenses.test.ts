import { describe, expect, it } from 'vitest';
import {
  byCategory,
  inMonth,
  parseAmount,
  percentChange,
  sanitizeStored,
  shiftMonth,
  toCsv,
  total,
  validateDraft,
  type Expense,
} from './expenses';
import { expensesReducer } from './expensesReducer';

const sample: Expense[] = [
  { id: '1', description: 'Groceries', amountCents: 45_000, category: 'Food', date: '2026-03-02' },
  { id: '2', description: 'Metro card', amountCents: 20_000, category: 'Transport', date: '2026-03-10' },
  { id: '3', description: 'Dinner', amountCents: 35_050, category: 'Food', date: '2026-03-15' },
  { id: '4', description: 'Electricity', amountCents: 80_000, category: 'Bills', date: '2026-02-20' },
];

describe('parseAmount', () => {
  it('understands Turkish and English number formats', () => {
    expect(parseAmount('12')).toBe(1200);
    expect(parseAmount('12,5')).toBe(1250);
    expect(parseAmount('12.50')).toBe(1250);
    expect(parseAmount('1.250,75')).toBe(125075);
    expect(parseAmount('1,250.75')).toBe(125075);
    expect(parseAmount('1.250')).toBe(125000);
    expect(parseAmount(' 99,90 TL ')).toBe(9990);
  });

  it('rejects zero, negatives and text', () => {
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('1,2,3')).toBeNull();
  });
});

describe('validateDraft', () => {
  it('accepts a complete draft', () => {
    const { errors, amountCents } = validateDraft({ description: 'Coffee', amount: '85', category: 'Food', date: '2026-03-01' });
    expect(errors).toEqual({});
    expect(amountCents).toBe(8500);
  });

  it('reports every problem at once', () => {
    const { errors } = validateDraft({ description: ' ', amount: 'x', category: 'Pets', date: '' });
    expect(Object.keys(errors).sort()).toEqual(['amount', 'category', 'date', 'description']);
  });
});

describe('month helpers', () => {
  it('filters to one month, newest first', () => {
    expect(inMonth(sample, '2026-03').map((e) => e.id)).toEqual(['3', '2', '1']);
  });

  it('moves across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2025-12', 1)).toBe('2026-01');
  });
});

describe('totals', () => {
  it('sums in cents without rounding errors', () => {
    expect(total(inMonth(sample, '2026-03'))).toBe(100_050);
  });

  it('groups by category with shares, largest first', () => {
    const groups = byCategory(inMonth(sample, '2026-03'));
    expect(groups.map((g) => g.category)).toEqual(['Food', 'Transport']);
    expect(groups[0].cents).toBe(80_050);
    expect(groups[0].share).toBeCloseTo(0.8, 2);
  });

  it('calculates percent change and handles an empty previous month', () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(50, 0)).toBeNull();
  });
});

describe('toCsv', () => {
  it('escapes commas and quotes and blocks spreadsheet formulas', () => {
    const csv = toCsv([
      { id: 'a', description: 'Pizza, "large"', amountCents: 25_990, category: 'Food', date: '2026-03-01' },
      { id: 'b', description: '=HYPERLINK("x")', amountCents: 100, category: 'Other', date: '2026-03-02' },
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Date,Description,Category,Amount (TRY)');
    expect(lines[1]).toBe('2026-03-01,"Pizza, ""large""",Food,259.90');
    expect(lines[2]).toContain(`"'=HYPERLINK(""x"")"`);
  });
});

describe('sanitizeStored', () => {
  it('keeps valid expenses and drops broken ones', () => {
    const stored = [sample[0], { id: 'x', amountCents: -1 }, null, 'text', { ...sample[1], category: 'Pets' }];
    expect(sanitizeStored(stored)).toEqual([sample[0]]);
    expect(sanitizeStored('not an array')).toEqual([]);
  });
});

describe('expensesReducer', () => {
  it('adds, updates, removes and restores', () => {
    let state = expensesReducer([], { type: 'add', expense: sample[0] });
    state = expensesReducer(state, { type: 'update', expense: { ...sample[0], amountCents: 1 } });
    expect(state[0].amountCents).toBe(1);

    state = expensesReducer(state, { type: 'remove', id: '1' });
    expect(state).toEqual([]);

    state = expensesReducer(state, { type: 'restore', expense: sample[0] });
    state = expensesReducer(state, { type: 'restore', expense: sample[0] });
    expect(state).toHaveLength(1);
  });
});
