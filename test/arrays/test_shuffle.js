import test from 'node:test';
import { equal, throws } from 'node:assert/strict';

import { shuffle } from '../../arrays/shuffle.js';

const tests = [
  {
    args: {},
    description: 'An array is required',
    error: 'ExpectedArrayToShuffle',
  },
  {
    args: {array: []},
    description: 'An empty array returns an empty array',
    expected: {shuffled: ''},
  },
  {
    args: {array: [1, 2, 3]},
    description: 'An array is shuffled as expected',
    expected: {shuffled: '3,1,2'},
  },
];

for (const { args, description, error, expected } of tests) {
  test(description, (t, end) => {
    if (error) {
      throws(() => shuffle(args), new Error(error), 'Got expected error');
    } else if (expected.shuffled) {
      let shuffled = [];

      while (shuffled.join(',') !== expected.shuffled) {
        shuffled = shuffle(args).shuffled;
      }

      equal(shuffled.join(','), expected.shuffled, 'Array is shuffled');
    } else {
      equal(shuffle(args).shuffled.join(''), '', 'Empty array is returned');
    }

    return end();
  });
}
