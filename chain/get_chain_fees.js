import asyncAuto from 'async/auto.js';
import asyncTimesSeries from 'async/timesSeries.js';
import { getChainFeeRate, getHeight, getMinimumRelayFee } from 'ln-service';
import { returnResult } from 'asyncjs-util';

const bytesPerKb = 1e3;
const {ceil} = Math;
const defaultBlockCount = 144;
const iteration = 1;
const start = 2;

/** Get chain fees

  Requires that the lnd is built with walletrpc

  {
    [blocks]: <Block Count Number>
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk or Promise
  {
    current_block_hash: <Chain Tip Best Block Hash Hex String>
    fee_by_block_target: {
      $number: <Kvbyte Fee Rate Number>
    }
    min_relay_feerate: <Chain Backend Minimum KVbyte Fee Rate Number>
  }
*/
const getChainFees = ({blocks, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: _cbk => {
        if (!lnd) {
          return _cbk([400, 'ExpectedLndToGetChainFees']);
        }

        return _cbk();
      },

      // Get the fees
      getFees: ['validate', ({}, _cbk) => {
        const blockCount = blocks || defaultBlockCount;

        return asyncTimesSeries(blockCount - iteration, (i, __cbk) => {
          return getChainFeeRate({
            lnd,
            confirmation_target: start + i,
          },
          (err, res) => {
            if (err) {
              return __cbk(err);
            }

            return __cbk(null, {rate: res.tokens_per_vbyte, target: start + i});
          });
        },
        _cbk);
      }],

      // Get chain info
      getHeight: ['validate', ({}, _cbk) => getHeight({lnd}, _cbk)],

      // Get the minimum relay fee rate
      getMinFee: ['validate', ({}, _cbk) => getMinimumRelayFee({lnd}, _cbk)],

      // Collapse chain fees into steps
      chainFees: [
        'getFees',
        'getHeight',
        'getMinFee',
        ({getFees, getHeight, getMinFee}, _cbk) =>
      {
        let cursor = {};
        const feeByBlockTarget = {};

        for (const { target, rate } of getFees
          .filter(fee => {
            const isNewFee = cursor.rate !== fee.rate;

            cursor = isNewFee ? fee : cursor;

            return isNewFee;
          })) {
            feeByBlockTarget[target + ''] = ceil(rate * bytesPerKb)
          }

        return _cbk(null, {
          current_block_hash: getHeight.current_block_hash,
          fee_by_block_target: feeByBlockTarget,
          min_relay_feerate: ceil(getMinFee.tokens_per_vbyte * bytesPerKb),
        });
      }],
    },
    returnResult({reject, resolve, of :'chainFees'}, cbk));
  });
};

export { getChainFees }
