import test from 'node:test';
import { throws, deepEqual } from 'node:assert/strict';

import { parseFeeRateFormula } from '../../routing/parse_fee_rate_formula.js';

const makeArgs = overrides => {
  const args = {
    fee_rate: '1',
    inbound_fee_rate: 1,
    inbound_liquidity: 1,
    outbound_liquidity: 1,
    node_rates: [{key: 'key', rate: 1}],
  };

  for (const k of Object.keys(overrides)) {
    args[k] = overrides[k]
  }

  return args;
};

const tests = [
  {
    args: makeArgs({fee_rate: undefined}),
    description: 'Fee rate is optional',
    expected: {},
  },
  {
    args: makeArgs({}),
    description: 'Fee rate formula is parsed',
    expected: {rate: 1},
  },
  {
    args: makeArgs({fee_rate: 'BIPS(25)'}),
    description: 'BIPs function is parsed',
    expected: {rate: 2500},
  },
  {
    args: makeArgs({fee_rate: 'PERCENT(0.25)'}),
    description: 'PERCENT function is parsed',
    expected: {rate: 2500},
  },
  {
    args: makeArgs({fee_rate: '1/0'}),
    description: 'Cannot divide by zero',
    expected: {failure: 'FeeRateCalculationCannotDivideByZeroFormula'},
  },
  {
    args: makeArgs({fee_rate: '/'}),
    description: 'Formula must be valid',
    expected: {failure: 'FailedToParseFeeRateFormula'},
  },
  {
    args: makeArgs({fee_rate: 'fee_rate'}),
    description: 'Formula must be valid',
    expected: {failure: 'UnrecognizedVariableOrFunctionInFeeRateFormula'},
  },
];

for (const { args, description, error, expected } of tests) {
  test(description, (t, end) => {
    if (error) {
      throws(() => parseFeeRateFormula(args), new Error(error), 'Got expected error');
    } else {
      deepEqual(parseFeeRateFormula(args), expected, 'Got expected result');
    }

    return end();
  });
}
