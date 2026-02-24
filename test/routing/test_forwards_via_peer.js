import test from 'node:test';
import { deepEqual, throws } from 'node:assert/strict';

import { forwardsViaPeer } from '../../routing/forwards_via_peer.js';

const tests = [
  {
    args: {
      closed_channels: [],
      forwards: [
        {incoming_channel: '1x1x1'},
        {outgoing_channel: '2x2x2'},
        {incoming_channel: '3x3x3'},
      ],
      private_channels: [{id: '1x1x1', partner_public_key: 'a'}],
      public_channels: [{id: '2x2x2'}],
      via: 'a',
    },
    description: 'Forwards via peer are filtered for',
    expected: {
      forwards: [{incoming_channel: '1x1x1'}, {outgoing_channel: '2x2x2'}],
    },
  },
];

for (const { args, description, error, expected } of tests) {
  test(description, (t, end) => {
    if (error) {
      throws(() => forwardsViaPeer(args), new Error(error), 'Got error');
    } else {
      const {forwards} = forwardsViaPeer(args);

      deepEqual(forwards, expected.forwards, 'Forwards are returned');
    }

    return end();
  });
}
