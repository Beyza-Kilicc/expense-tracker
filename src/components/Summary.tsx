import { formatMoney, type CategoryTotal } from '../lib/expenses';

interface Props {
  totalCents: number;
  change: number | null;
  budgetCents: number;
  categories: CategoryTotal[];
}

export function Summary({ totalCents, change, budgetCents, categories }: Props) {
  const used = budgetCents > 0 ? totalCents / budgetCents : 0;
  const status = used >= 1 ? 'over' : used >= 0.8 ? 'near' : 'ok';

  return (
    <section className="summary-grid">
      <div className="stat">
        <span className="label">Spent this month</span>
        <strong className="value">{formatMoney(totalCents)}</strong>
        {change !== null && (
          <span className={`delta ${change > 0 ? 'up' : 'down'}`}>
            {change > 0 ? '▲' : '▼'} {Math.abs(change)}% vs last month
          </span>
        )}
      </div>

      <div className="stat">
        <span className="label">Monthly budget</span>
        {budgetCents > 0 ? (
          <>
            <strong className="value">{formatMoney(Math.max(budgetCents - totalCents, 0))} left</strong>
            <div
              className={`meter ${status}`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(Math.min(used, 1) * 100)}
              aria-label="Budget used"
            >
              <div style={{ width: `${Math.min(used, 1) * 100}%` }} />
            </div>
            <span className="label">
              {Math.round(used * 100)}% of {formatMoney(budgetCents)}
              {status === 'over' && ' · over budget'}
            </span>
          </>
        ) : (
          <span className="label">Set a budget below to track it.</span>
        )}
      </div>

      <div className="stat wide">
        <span className="label">By category</span>
        {categories.length === 0 ? (
          <p className="empty">No expenses this month yet.</p>
        ) : (
          <ul className="bars">
            {categories.map((c) => (
              <li key={c.category}>
                <span className="bar-label">{c.category}</span>
                <span className="bar-track" aria-hidden="true">
                  <span className={`bar cat-${c.category.toLowerCase()}`} style={{ width: `${Math.max(c.share * 100, 2)}%` }} />
                </span>
                <span className="bar-value">
                  {formatMoney(c.cents)} <span className="muted">({Math.round(c.share * 100)}%)</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
