import test from 'node:test';
import { equal, throws } from 'node:assert/strict';

import { balanceFromTokens } from '../../balances/index.js';

const tests = [
  // No tokens
  {
    args: {},
    description: 'Nothing is passed',
    error: 'ExpectedTokensToCalculateBalance',
  },

  // Normal balance
  {
    args: {tokens: [1, 2, 3, 4, 5]},
    description: 'Tokens are summed to a balance',
    expected: {balance: 15},
  },

  // Balance above watermark
  {
    args: {above: 10, tokens: [1, 2, 3, 4, 5]},
    description: 'Tokens are summed to a balance',
    expected: {balance: 5},
  },

  // No balance above watermark
  {
    args: {above: 10, tokens: [1]},
    description: 'Tokens are summed to a balance',
    expected: {balance: 0},
  },

  // Balance below watermark
  {
    args: {below: 25, tokens: [1, 2, 3, 4, 5]},
    description: 'Tokens are summed to a balance',
    expected: {balance: 10},
  },

  // No balance below watermark
  {
    args: {below: 25, tokens: [25]},
    description: 'Tokens are summed to a balance',
    expected: {balance: 0},
  },
];

for (const { args, description, error, expected } of tests) {
  test(description, (t, end) => {
    if (error) {
      throws(() => balanceFromTokens(args), new Error(error));
    } else {
      const balance = balanceFromTokens(args);

      equal(balance, expected.balance, 'Balance is calculated');
    }

    return end();
  });
}
