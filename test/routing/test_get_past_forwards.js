import test from 'node:test';
import { deepEqual, rejects } from 'node:assert/strict';

import { getPastForwards } from '../../routing/get_past_forwards.js';

const makeArgs = overrides => {
  const args = {
    days: 1,
    lnd: {
      default: {
        forwardingHistory: ({}, cbk) => {
          return cbk(null, {forwarding_events: [], last_offset_index: '1'});
        },
      },
    },
  };

  for (const k of Object.keys(overrides)) {
    args[k] = overrides[k]
  }

  return args;
};

const tests = [
  {
    args: makeArgs({}),
    description: 'Get past forwards',
    expected: {forwards: []},
  },
  {
    args: makeArgs({days: undefined}),
    description: 'Days is optional in forwards',
    expected: {forwards: []},
  },
  {
    args: makeArgs({lnd: undefined}),
    description: 'An LND is required to get past forwards',
    error: [400, 'ExpectedLndObjectToGetPastForwards'],
  },
  {
    args: makeArgs({
      lnd: {default: {forwardingHistory: ({}, cbk) => cbk('err')}},
    }),
    description: 'Errors from LND are passed back',
    error: [503, 'GetForwardingHistoryError'],
  },
];

for (const { args, description, error, expected } of tests) {
  test(description, async () => {
    if (error) {
      await rejects(getPastForwards(args, args.test), error, 'Got error');
    } else {
      const {forwards} = await getPastForwards(args);

      deepEqual(forwards, expected.forwards, 'Got expected forwards');
    }
  });
}
