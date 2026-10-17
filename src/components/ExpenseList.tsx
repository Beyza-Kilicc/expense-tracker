import { formatMoney, type Expense } from '../lib/expenses';

interface Props {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function ExpenseList({ expenses, onEdit, onDelete }: Props) {
  if (expenses.length === 0) {
    return <p className="empty">Nothing here. Add an expense or change the filters.</p>;
  }

  return (
    <ul className="expense-list">
      {expenses.map((e) => (
        <li key={e.id}>
          <span className={`dot cat-${e.category.toLowerCase()}`} aria-hidden="true" />
          <div className="expense-main">
            <strong>{e.description}</strong>
            <span className="muted">
              {e.category} · {dateFormatter.format(new Date(`${e.date}T00:00:00Z`))}
            </span>
          </div>
          <span className="amount">{formatMoney(e.amountCents)}</span>
          <div className="row-actions">
            <button className="ghost small" onClick={() => onEdit(e)} aria-label={`Edit ${e.description}`}>
              Edit
            </button>
            <button className="ghost small danger" onClick={() => onDelete(e)} aria-label={`Delete ${e.description}`}>
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
