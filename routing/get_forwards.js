import asyncAuto from 'async/auto.js';
import asyncMap from 'async/map.js';
import asyncUntil from 'async/until.js';
import { getChannels, getClosedChannels, getForwards as ln_getForwards, getNode } from 'ln-service';
import { returnResult } from 'asyncjs-util';

import { forwardsViaPeer } from './forwards_via_peer.js';

const flatten = arr => [].concat(...arr);
const {isArray} = Array;
const isPublicKey = n => /^[0-9A-F]{66}$/i.test(n);
const pageLimit = 1e3;

/** Get forwards

  {
    after: <After Date ISO 8601 String>
    [before]: <Before Date ISO 8601 String>
    lnd: <Authenticated LND API Object>
    [via]: [<Via Public Key Hex String>]
  }

  @returns via cbk or Promise
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
const getForwards = ({after, before, lnd, via}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: _cbk => {
        if (!after) {
          return _cbk([400, 'ExpectedAfterDateToGetForwardsForNode']);
        }

        if (!lnd) {
          return _cbk([400, 'ExpectedAuthenticatedLndToGetForwardsForNode']);
        }

        if (!!via && !isArray(via)) {
          return _cbk([400, 'ExpectedArrayOfPublicKeysForForwardsViaNodes']);
        }

        if (!!via && via.some(n => !isPublicKey(n))) {
          return _cbk([400, 'ExpectedPublicKeyForViaFilterOfForwardsForNode']);
        }

        return _cbk();
      },

      // Get closed channels with via peer
      getClosedChannels: ['validate', ({}, _cbk) => {
        // Exit early when there is no via node specified
        if (!via) {
          return _cbk();
        }

        return getClosedChannels({lnd}, _cbk);
      }],

      // Get forwards
      getForwards: ['validate', ({}, _cbk) => {
        const forwards = [];
        let token;

        return asyncUntil(
          __cbk => __cbk(null, token === false),
          __cbk => {
            return ln_getForwards({
              after,
              lnd,
              token,
              before: before || new Date().toISOString(),
              limit: token ? undefined : pageLimit,
            },
            (err, res) => {
              if (err) {
                return __cbk(err);
              }

              let limit = null;
              token = res.next || false;

              for (const n of res.forwards) {
                forwards.push(n)
              }

              return __cbk();
            });
          },
          err => {
            if (err) {
              return _cbk(err);
            }

            return _cbk(null, forwards);
          }
        );
      }],

      // Get private channels
      getPrivateChannels: ['validate', ({}, _cbk) => {
        // Exit early when there is no via node specified
        if (!via) {
          return _cbk();
        }

        return getChannels({lnd, is_private: true}, (err, res) => {
          if (err) {
            return _cbk(err);
          }

          const channels = res.channels.map(channel => {
            return via.includes(channel.partner_public_key);
          });

          return _cbk(null, {channels});
        });
      }],

      // Get node details
      getNode: ['validate', ({}, _cbk) => {
        // Exit early when there is no via node specified
        if (!via) {
          return _cbk();
        }

        return asyncMap(via, (key, _cbk) => {
          return getNode({lnd, public_key: key}, _cbk);
        },
        (err, res) => {
          if (err && err.slice().shift() === 404) {
            return _cbk(null, {channels: []});
          }

          if (err) {
            return _cbk(err);
          }

          return _cbk(null, {channels: flatten(res.map(n => n.channels))});
        });
      }],

      // Full set of forwards
      forwards: [
        'getClosedChannels',
        'getForwards',
        'getNode',
        'getPrivateChannels',
        ({getClosedChannels, getForwards, getNode, getPrivateChannels}, _cbk) =>
      {
        const {forwards} = forwardsViaPeer({
          via,
          closed_channels: via ? getClosedChannels.channels : [],
          forwards: getForwards,
          private_channels: via ? getPrivateChannels.channels : [],
          public_channels: via ? getNode.channels : [],
        });

        return _cbk(null, {forwards});
      }],
    },
    returnResult({reject, resolve, of: 'forwards'}, cbk));
  });
};

export { getForwards }
