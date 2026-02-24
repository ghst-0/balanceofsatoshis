import test from 'node:test';
import { deepEqual, rejects } from 'node:assert/strict';
import EventEmitter from 'node:events';

import { getChainFees } from '../../chain/get_chain_fees.js';
import getInfoResponse from '../fixtures/get_info_response.json' with { type: 'json' };

const getInfoRes = () => JSON.parse(JSON.stringify(getInfoResponse));

const tests = [
  {
    args: {},
    description: 'LND is required',
    error: [400, 'ExpectedLndToGetChainFees'],
  },
  {
    args: {
      lnd: {
        chain: {
          registerBlockEpochNtfn: ({}) => {
            const emitter = new EventEmitter();

            emitter.cancel = () => {};

            process.nextTick(() => emitter.emit('error', 'err'));

            return emitter;
          },
        },
        default: {getInfo: ({}, cbk) => cbk(null, getInfoRes())},
        wallet: {estimateFee: (args, cbk) => cbk('err')},
      },
    },
    description: 'Errors from get chain fee are passed back',
    error: [503, 'UnexpectedErrorGettingFeeFromLnd', {err: 'err'}],
  },
  {
    args: {
      lnd: {
        chain: {
          registerBlockEpochNtfn: ({}) => {
            const emitter = new EventEmitter();

            emitter.cancel = () => {};

            process.nextTick(() => emitter.emit('error', 'err'));

            return emitter;
          },
        },
        default: {getInfo: ({}, cbk) => cbk(null, getInfoRes())},
        wallet: {
          estimateFee: (args, cbk) => {
            return cbk(null, {
              sat_per_kw: 1 + Math.round(1 / args.conf_target),
              min_relay_fee_sat_per_kw: '250',
            });
          },
        },
      },
    },
    description: 'Fees are mapped to levels',
    expected: {
      current_block_hash: '00',
      fee_by_block_target: {'2': 8, '3': 4},
      min_relay_feerate: 1000,
    },
  },
];

for (const { args, description, error, expected } of tests) {
  test(description, async () => {
    if (error) {
      await rejects(getChainFees(args), error, 'Got expected error');
    } else {
      const fees = await getChainFees(args);

      deepEqual(fees, expected, 'Got expected fees rundown');
    }
  });
}
