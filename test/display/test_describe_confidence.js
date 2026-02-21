import test from 'node:test';
import { equal } from 'node:assert/strict';

import { describeConfidence } from '../../display/index.js';

const tests = [
  {
    args: {},
    description: 'No confidence returns no description',
    expected: {},
  },
  {
    args: {confidence: 1e6},
    description: 'No confidence returns no description',
    expected: {description: '★ ★ ★ ★'},
  },
  {
    args: {confidence: 750000},
    description: 'High confidence returns three stars',
    expected: {description: '★ ★ ★ ☆'},
  },
  {
    args: {confidence: 500000},
    description: 'Middling confidence returns two stars',
    expected: {description: '★ ★ ☆ ☆'},
  },
  {
    args: {confidence: 250000},
    description: 'Low confidence returns two stars',
    expected: {description: '★ ☆ ☆ ☆'},
  },
  {
    args: {confidence: 100000},
    description: 'No confidence returns no stars',
    expected: {},
  },
];

for (const { args, description, expected } of tests) {
  test(description, (t, end) => {
    const {description} = describeConfidence(args);

    equal(description, expected.description, 'Got expected description');

    return end();
  });
}
