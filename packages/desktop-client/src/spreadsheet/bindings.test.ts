/**
 * Regression: #2354 — every account-balance binding must cap sums at `currentDay()`.
 *
 * We assert full serialized query equality so the date predicate cannot be dropped or
 * weakened accidentally. Under Vitest, `global.IS_TESTING` fixes `currentDay()` (see
 * `loot-core/src/shared/months.ts`).
 */
import { describe, expect, it } from 'vitest';

import { currentDay } from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';

import {
  accountBalance,
  accountBalanceCleared,
  accountBalanceUncleared,
  allAccountBalance,
  closedAccountBalance,
  offBudgetAccountBalance,
  onBudgetAccountBalance,
} from './bindings';

describe('account balance bindings — through today only (#2354)', () => {
  const today = currentDay();
  const accountId = 'test-acct';

  it.each([
    {
      label: 'accountBalance',
      actual: () => accountBalance(accountId).query,
      expected: q('transactions')
        .filter({ account: accountId, date: { $lte: today } })
        .options({ splits: 'none' })
        .calculate({ $sum: '$amount' }),
    },
    {
      label: 'accountBalanceCleared',
      actual: () => accountBalanceCleared(accountId).query,
      expected: q('transactions')
        .filter({ account: accountId, cleared: true, date: { $lte: today } })
        .options({ splits: 'none' })
        .calculate({ $sum: '$amount' }),
    },
    {
      label: 'accountBalanceUncleared',
      actual: () => accountBalanceUncleared(accountId).query,
      expected: q('transactions')
        .filter({ account: accountId, cleared: false, date: { $lte: today } })
        .options({ splits: 'none' })
        .calculate({ $sum: '$amount' }),
    },
    {
      label: 'allAccountBalance',
      actual: () => allAccountBalance().query,
      expected: q('transactions')
        .filter({ 'account.closed': false, date: { $lte: today } })
        .calculate({ $sum: '$amount' }),
    },
    {
      label: 'onBudgetAccountBalance',
      actual: () => onBudgetAccountBalance().query,
      expected: q('transactions')
        .filter({
          'account.offbudget': false,
          'account.closed': false,
          date: { $lte: today },
        })
        .calculate({ $sum: '$amount' }),
    },
    {
      label: 'offBudgetAccountBalance',
      actual: () => offBudgetAccountBalance().query,
      expected: q('transactions')
        .filter({
          'account.offbudget': true,
          'account.closed': false,
          date: { $lte: today },
        })
        .calculate({ $sum: '$amount' }),
    },
    {
      label: 'closedAccountBalance',
      actual: () => closedAccountBalance().query,
      expected: q('transactions')
        .filter({ 'account.closed': true, date: { $lte: today } })
        .calculate({ $sum: '$amount' }),
    },
  ])(
    '$label matches explicit query with date <= currentDay()',
    ({ actual, expected }) => {
      expect(actual().serializeAsString()).toBe(expected.serializeAsString());
    },
  );
});
