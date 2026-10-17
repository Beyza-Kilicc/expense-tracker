import { useState, type FormEvent, type ReactElement } from 'react';
import { CATEGORIES, validateDraft, type Expense, type ExpenseDraft, type ValidationErrors } from '../lib/expenses';

interface Props {
  editing: Expense | null;
  defaultDate: string;
  onSave: (expense: Expense) => void;
  onCancel: () => void;
}

function toDraft(expense: Expense | null, defaultDate: string): ExpenseDraft {
  return expense
    ? {
        description: expense.description,
        amount: (expense.amountCents / 100).toFixed(2).replace('.', ','),
        category: expense.category,
        date: expense.date,
      }
    : { description: '', amount: '', category: 'Food', date: defaultDate };
}

export function ExpenseForm({ editing, defaultDate, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<ExpenseDraft>(() => toDraft(editing, defaultDate));
  const [errors, setErrors] = useState<ValidationErrors>({});

  const set = (field: keyof ExpenseDraft) => (value: string) => setDraft((d) => ({ ...d, [field]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateDraft(draft);
    setErrors(result.errors);
    if (Object.keys(result.errors).length > 0 || result.amountCents === null) return;

    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      description: draft.description.trim(),
      amountCents: result.amountCents,
      category: draft.category as Expense['category'],
      date: draft.date,
    });
    if (!editing) setDraft({ ...toDraft(null, draft.date), category: draft.category });
  }

  return (
    <form className="expense-form" onSubmit={submit} noValidate>
      <Field label="Description" error={errors.description} wide>
        <input value={draft.description} onChange={(e) => set('description')(e.target.value)} placeholder="e.g. Groceries" />
      </Field>
      <Field label="Amount (₺)" error={errors.amount}>
        <input value={draft.amount} onChange={(e) => set('amount')(e.target.value)} inputMode="decimal" placeholder="149,90" />
      </Field>
      <Field label="Category" error={errors.category}>
        <select value={draft.category} onChange={(e) => set('category')(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Date" error={errors.date}>
        <input type="date" value={draft.date} onChange={(e) => set('date')(e.target.value)} />
      </Field>
      <div className="form-actions">
        {editing && (
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="primary">
          {editing ? 'Save changes' : 'Add expense'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, wide, children }: { label: string; error?: string; wide?: boolean; children: ReactElement }) {
  return (
    <label className={`field${wide ? ' wide' : ''}${error ? ' has-error' : ''}`}>
      <span>{label}</span>
      {children}
      {error && <small role="alert">{error}</small>}
    </label>
  );
}
