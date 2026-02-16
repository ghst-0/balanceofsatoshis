import test from 'node:test';
import { equal } from 'node:assert/strict';

import { chartAliasForPeer } from './../../display/index.js';

const tests = [
  {
    args: {
      alias: 'alias',
      public_key: Buffer.alloc(33).toString('hex'),
    },
    description: 'A chart alias is returned',
    expected: {display: 'alias'},
  },
  {
    args: {
      alias: '',
      public_key: Buffer.alloc(33).toString('hex'),
    },
    description: 'A chart alias with short key is returned',
    expected: {display: Buffer.alloc(8).toString('hex')},
  },
  {
    args: {
      alias: '',
      is_disconnected: true,
      is_inactive: true,
      public_key: Buffer.alloc(33).toString('hex'),
    },
    description: 'A chart alias with emojis is returned',
    expected: {display: '🚪 💀 0000000000000000'},
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, (t, end) => {
    const {display} = chartAliasForPeer(args);

    equal(display, expected.display, 'Got expected output');

    return end();
  });
});
