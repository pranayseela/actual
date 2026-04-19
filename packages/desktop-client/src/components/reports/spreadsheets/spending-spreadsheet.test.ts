import * as connection from '@actual-app/core/platform/client/connection';
import { describe, expect, it, vi } from 'vitest';

import { aqlQuery } from '#queries/aqlQuery';

import { createSpendingSpreadsheet } from './spending-spreadsheet';

vi.mock('#queries/aqlQuery', () => ({
  aqlQuery: vi.fn(),
}));

describe('createSpendingSpreadsheet', () => {
  it('excludes income categories from the budgeted line in tracking budgets', async () => {
    vi.spyOn(connection, 'send').mockImplementation(async name => {
      if (name === 'make-filters-from-conditions') {
        return { filters: [] };
      }

      if (name === 'get-categories') {
        return {
          grouped: [],
          list: [
            { id: 'food', is_income: false, name: 'Food' },
            { id: 'income', is_income: true, name: 'Income' },
          ],
        };
      }

      throw new Error(`Unknown command: ${name}`);
    });

    vi.mocked(aqlQuery).mockImplementation(async query => {
      const table = query.serialize().table;

      if (table === 'transactions') {
        return { data: [], dependencies: [] };
      }

      if (table === 'reflect_budgets') {
        return {
          data: [
            { category: 'food', amount: 100 },
            { category: 'income', amount: 100 },
          ],
          dependencies: [],
        };
      }

      throw new Error(`Unexpected query table: ${table}`);
    });

    const setData = vi.fn();
    const spreadsheet = createSpendingSpreadsheet({
      compare: '2026-04',
      compareTo: '2026-03',
      budgetType: 'tracking',
    });

    await spreadsheet({} as never, setData);

    const data = setData.mock.calls[0][0];

    expect(data.intervalData[27].budget).toBeCloseTo(-100);
  });
});
