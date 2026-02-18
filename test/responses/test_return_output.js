import test from 'node:test';
import { equal } from 'node:assert/strict';

import { returnOutput } from './../../responses/index.js';

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

tests.forEach(({args, description, error, expected}) => {
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
});
