import test from 'node:test';
import { equal } from 'node:assert/strict';

import { returnNumber } from '../../responses/return_number.js';

const tests = [
  {
    description: 'Error returns an error',
    error: 'error',
  },
  {
    args: {number: 1},
    description: 'Number returns a number',
    expected: {number: '1'},
  },
];

for (const { args, description, error, expected } of tests) {
  test(description, (t, end) => {
    if (error) {
      let err;

      return returnNumber({
        reject: () => {
          equal(err, error, 'Error as expected');

          return end();
        },
      })(error);
    }

    let number;

    return returnNumber({
      number: 'number',
      resolve: () => {
        equal(number, expected.number, 'Got expected number');

        return end();
      },
    })(null, args);
  });
}
