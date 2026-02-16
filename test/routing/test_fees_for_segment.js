import test from 'node:test';
import { deepEqual } from 'node:assert/strict';

import feesForSegment from './../../routing/fees_for_segment.js';

const tests = [
  {
    args: {
      forwards: [{created_at: new Date(Date.now() - 1000), fee: 1}],
      measure: 'hour',
      segments: 2,
    },
    description: 'An hour fee chart is returned',
    expected: {fees: [0, 1]},
  },
  {
    args: {
      forwards: [{created_at: new Date(Date.now() - 1000), fee: 1}],
      measure: 'week',
      segments: 2,
    },
    description: 'A week fee chart is returned',
    expected: {fees: [0, 1]},
  },
  {
    args: {
      forwards: [
        {created_at: new Date(1), fee: 1},
        {created_at: new Date(Date.now() - 1000), fee: 1},
      ],
      measure: 'day',
      segments: 2,
    },
    description: 'A day fee chart is returned',
    expected: {fees: [0, 1]},
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, (t, end) => {
    const {fees} = feesForSegment(args);

    deepEqual(fees, expected.fees, 'Got expected fees');

    return end();
  });
});
