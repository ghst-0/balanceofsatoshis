import test from 'node:test';
import { equal } from 'node:assert/strict';

import { returnJson } from '../../responses/index.js';

const tests = [
  {
    description: 'Error returns an error',
    error: 'error',
  },
  {
    args: [],
    description: 'Output returns output',
    expected: '[]',
  },
];

for (const { args, description, error, expected } of tests) {
  test(description, (t, end) => {
    if (error) {
      let err;

      return returnJson({
        reject: () => {
          equal(err, error, 'Error as expected');

          return end();
        },
      })(error);
    }

    let output;

    return returnJson({
      resolve: () => {
        equal(output, expected, 'Got expected output');

        return end();
      },
    })(null, args);
  });
}
