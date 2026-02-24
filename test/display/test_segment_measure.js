import test from 'node:test';
import { deepEqual } from 'node:assert/strict';

import { segmentMeasure } from '../../display/segment_measure.js';

const tests = [
  {
    args: {days: 91},
    description: 'Days exceeds max',
    expected: {measure: 'week', segments: 13},
  },
  {
    args: {days: 3},
    description: 'Days below min',
    expected: {measure: 'hour', segments: 72},
  },
  {
    args: {days: 4},
    description: 'Regular days',
    expected: {measure: 'day', segments: 4},
  },
];

for (const { args, description, expected } of tests) {
  test(description, (t, end) => {
    deepEqual(segmentMeasure(args), expected, 'Got expected result');

    return end();
  });
}
