import type { Expense } from './expenses';

export type ExpenseAction =
  | { type: 'add'; expense: Expense }
  | { type: 'update'; expense: Expense }
  | { type: 'remove'; id: string }
  | { type: 'restore'; expense: Expense };

export function expensesReducer(state: Expense[], action: ExpenseAction): Expense[] {
  switch (action.type) {
    case 'add':
    case 'restore':
      return state.some((e) => e.id === action.expense.id) ? state : [...state, action.expense];
    case 'update':
      return state.map((e) => (e.id === action.expense.id ? action.expense : e));
    case 'remove':
      return state.filter((e) => e.id !== action.id);
  }
}
