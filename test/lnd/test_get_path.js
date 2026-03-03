import test from 'node:test';
import { deepEqual, rejects } from 'node:assert/strict';

import { getPath } from '../../lnd/get_path.js';

const tests = [
  {
    args: {},
    description: 'File system methods are required',
    error: [400, 'ExpectedFileSystemMethodsToGetPath'],
  },
  {
    args: {fs: {getFile: ({}, cbk) => cbk('err')}},
    description: 'A filesystem error results in no path',
    expected: {path: undefined},
  },
  {
    args: {fs: {getFile: ({}, cbk) => cbk()}},
    description: 'An absent file results in no path',
    expected: {path: undefined},
  }
];

for (const { args, description, error, expected } of tests) {
  test(description, async () => {
    if (error) {
      await rejects(getPath(args), error, 'Got expected error');
    } else {
      const res = await getPath(args);

      deepEqual(res, expected, 'Got expected result');
    }
  });
}
