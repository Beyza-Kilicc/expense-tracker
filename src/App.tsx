import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { Summary } from './components/Summary';
import { readStored, useLocalStorage } from './hooks/useLocalStorage';
import {
  CATEGORIES,
  byCategory,
  inMonth,
  parseAmount,
  percentChange,
  sanitizeStored,
  shiftMonth,
  toCsv,
  total,
  type Expense,
} from './lib/expenses';
import { expensesReducer } from './lib/expensesReducer';

const STORAGE_KEY = 'expense-tracker:expenses';

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function App() {
  const [expenses, dispatch] = useReducer(expensesReducer, null, (): Expense[] =>
    readStored<Expense[]>(STORAGE_KEY, [], sanitizeStored),
  );
  const [budgetCents, setBudgetCents] = useLocalStorage('expense-tracker:budget', 0, (v) =>
    Number.isInteger(v) && (v as number) >= 0 ? (v as number) : 0,
  );
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [category, setCategory] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleted, setDeleted] = useState<Expense | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const undoTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch {
      // Keep working in memory if storage is unavailable.
    }
  }, [expenses]);

  const monthExpenses = useMemo(() => inMonth(expenses, month), [expenses, month]);
  const previousTotal = useMemo(() => total(inMonth(expenses, shiftMonth(month, -1))), [expenses, month]);
  const monthTotal = total(monthExpenses);
  const categories = useMemo(() => byCategory(monthExpenses), [monthExpenses]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return monthExpenses.filter(
      (e) => (category === 'All' || e.category === category) && (!q || e.description.toLowerCase().includes(q)),
    );
  }, [monthExpenses, category, query]);

  function save(expense: Expense) {
    dispatch({ type: editing ? 'update' : 'add', expense });
    setEditing(null);
    setMonth(expense.date.slice(0, 7));
  }

  function remove(expense: Expense) {
    dispatch({ type: 'remove', id: expense.id });
    if (editing?.id === expense.id) setEditing(null);
    setDeleted(expense);
    window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setDeleted(null), 6000);
  }

  function undo() {
    if (deleted) dispatch({ type: 'restore', expense: deleted });
    setDeleted(null);
  }

  function exportCsv() {
    // The BOM makes Excel open Turkish characters correctly.
    const blob = new Blob(['﻿' + toCsv(visible)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function saveBudget() {
    const cents = budgetInput.trim() === '' ? 0 : parseAmount(budgetInput);
    if (cents !== null) {
      setBudgetCents(cents);
      setBudgetInput('');
    }
  }

  return (
    <main>
      <header className="page-header">
        <div>
          <h1>Expense Tracker</h1>
          <p className="muted">Track monthly spending, stay within budget and export to Excel.</p>
        </div>
        <nav className="month-nav" aria-label="Month">
          <button className="ghost" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">
            ‹
          </button>
          <strong>{monthFormatter.format(new Date(`${month}-01T00:00:00Z`))}</strong>
          <button className="ghost" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Next month">
            ›
          </button>
        </nav>
      </header>

      <Summary
        totalCents={monthTotal}
        change={percentChange(monthTotal, previousTotal)}
        budgetCents={budgetCents}
        categories={categories}
      />

      <section className="card">
        <h2>{editing ? 'Edit expense' : 'Add expense'}</h2>
        <ExpenseForm
          key={editing?.id ?? 'new'}
          editing={editing}
          defaultDate={month === today().slice(0, 7) ? today() : `${month}-01`}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      </section>

      <section className="card">
        <div className="list-header">
          <h2>Expenses</h2>
          <div className="filters">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search expenses"
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
              <option>All</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button className="ghost" onClick={exportCsv} disabled={visible.length === 0}>
              Export CSV
            </button>
          </div>
        </div>
        <ExpenseList expenses={visible} onEdit={setEditing} onDelete={remove} />
      </section>

      <section className="card budget">
        <h2>Monthly budget</h2>
        <div className="budget-row">
          <input
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveBudget()}
            inputMode="decimal"
            placeholder={budgetCents ? (budgetCents / 100).toString() : 'e.g. 15.000'}
            aria-label="Monthly budget in lira"
          />
          <button className="primary" onClick={saveBudget}>
            Save budget
          </button>
        </div>
      </section>

      {deleted && (
        <div className="toast" role="status">
          Deleted “{deleted.description}”.
          <button onClick={undo}>Undo</button>
        </div>
      )}
    </main>
  );
}
