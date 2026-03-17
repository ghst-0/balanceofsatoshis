import asyncAuto from 'async/auto.js';
import asyncDoUntil from 'async/doUntil.js';
import asyncRetry from 'async/retry.js';
import { getForwards } from 'ln-service';
import moment from 'moment';
import { returnResult } from 'asyncjs-util';

const flatten = arr => [].concat(...arr);

/** Get forwards from the past N days

  {
    [days]: <Past Days To Get Forwards Over Number>
    lnd: <Authenticated LND API Object>
  }

  @returns via cbk
  {
    forwards: [{
      created_at: <Forward Record Created At ISO 8601 Date String>
      fee: <Fee Tokens Charged Number>
      fee_mtokens: <Approximated Fee Millitokens Charged String>
      incoming_channel: <Incoming Standard Format Channel Id String>
      [mtokens]: <Forwarded Millitokens String>
      outgoing_channel: <Outgoing Standard Format Channel Id String>
      tokens: <Forwarded Tokens Number>
    }]
  }
*/
const getPastForwards = ({days, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: _cbk => {
        if (!lnd) {
          return _cbk([400, 'ExpectedLndObjectToGetPastForwards']);
        }

        return _cbk();
      },

      // Get past forwards
      getForwards: ['validate', ({}, _cbk) => {
        // Exit early when there are no days to get forwards over
        if (!days) {
          return _cbk(null, []);
        }

        const after = moment().subtract(days, 'days').toISOString();
        const before = new Date().toISOString();
        let token;
        const forwards = [];

        return asyncDoUntil(
          __cbk => {
            return asyncRetry({}, ___cbk => {
              return getForwards({after, before, lnd, token}, (err, res) => {
                if (err) {
                  return ___cbk(err);
                }

                forwards.push(res.forwards);

                token = res.next;

                return ___cbk();
              });
            },
            __cbk);
          },
          __cbk => __cbk(null, !token),
          err => err ? _cbk(err) : _cbk(null, forwards)
        );
      }],

      // Final set of forwards
      forwards: ['getForwards', ({getForwards}, _cbk) => {
        return _cbk(null, {forwards: flatten(getForwards)});
      }],
    },
    returnResult({reject, resolve, of: 'forwards'}, cbk));
  });
};

export { getPastForwards }
