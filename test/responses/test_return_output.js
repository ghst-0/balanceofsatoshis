import test from 'node:test';
import { equal } from 'node:assert/strict';

import { returnOutput } from '../../responses/return_output.js';

const tests = [
  {
    description: 'Error returns an error',
    error: 'error',
  },
  {
    args: 'foo',
    description: 'Output returns output',
    expected: 'foo',
  },
];

for (const { args, description, error, expected } of tests) {
  test(description, (t, end) => {
    if (error) {
      let err;

      return returnOutput({
        reject: () => {
          equal(err, error, 'Error as expected');

          return end();
        },
      })(error);
    }

    let output;

    return returnOutput({
      resolve: () => {
        equal(output, expected, 'Got expected output');

        return end();
      },
    })(null, args);
  });
}
