import asyncAuto from 'async/auto.js';
import asyncMap from 'async/map.js';
import { getIdentity } from 'ln-service';
import { returnResult } from 'asyncjs-util';

import { getLnds } from '../lnd/get_lnds.js';
import { startRocketChatBot } from './start_rocketchat_bot.js';

const {isArray} = Array;

/** Run the telegram bot for a node or multiple nodes

  {
    bot: <Telegram Bot Object>
    fs: {
      getFile: <Get File Contents Function>
      [is_reset_state]: <Reset File Status Bool>
      makeDirectory: <Make Directory Function>
      writeFile: <Write File Function>
    }
    [id]: <Authorized User Id Number>
    key: <Telegram Bot API Key String>
    [min_forward_tokens]: <Minimum Forward Tokens To Notify Number>
    [min_rebalance_tokens]: <Minimum Rebalance Tokens To Notify Number>
    nodes: [<Node Name String>]
    request: <Request Function>
  }

  @returns via cbk or Promise
  {
    [connected]: <Connected Id Number>
    online: [{
      alias: <Node Alias String>
      id: <Node Public Key Id Hex String>
    }]
  }
*/
const runRocketChatBot = (args, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: _cbk => {

        if (!args.bot) {
          return _cbk([400, 'ExpectedRocketChatBotToRunRocketChatBot']);
        }

        if (!args.fs) {
          return _cbk([400, 'ExpectedFilesystemMethodsToRunRocketChatBot']);
        }

        if (!args.key) {
          return _cbk([400, 'ExpectedApiKeyToRunRocketChatBot']);
        }

        if (!isArray(args.nodes)) {
          return _cbk([400, 'ExpectedArrayOfSavedNodesToRunRocketChatBot']);
        }

        if (!args.request) {
          return _cbk([400, 'ExpectedRequestFunctionToRunRocketChatBot']);
        }

        return _cbk();
      },

      // Get associated LNDs
      getLnds: ['validate', ({}, _cbk) => {
        return getLnds({nodes: args.nodes}, _cbk);
      }],

      // Start the bot going
      startBot: ['getLnds', ({getLnds}, _cbk) => {
        console.info({connecting_to_rocketchat: args.nodes});

        return startRocketChatBot({
          bot: args.bot,
          fs: args.fs,
          id: args.id,
          key: args.key,
          min_forward_tokens: args.min_forward_tokens,
          min_rebalance_tokens: args.min_rebalance_tokens,
          lnds: getLnds.lnds,
          nodes: args.nodes,
          request: args.request,
        },
        _cbk);
      }],

      // Check the LNDs that they can connect
      getConnected: ['getLnds', 'startBot', ({getLnds}, _cbk) => {
        return asyncMap(getLnds.lnds, (lnd, __cbk) => {
          return getIdentity({lnd}, (err, res) => {
            // Return no id when there is an error getting the wallet info
            if (err) {
              return __cbk();
            }

            return __cbk(null, res.public_key);
          });
        },
        _cbk);
      }],

      // Final set of connected nodes
      online: ['getConnected', 'startBot', ({getConnected, startBot}, _cbk) => {
        // Report the failure that killed the bot
        if (startBot.failure) {
          console.error({err: startBot.failure});
        }

        return _cbk(null, {
          connected: startBot.connected,
          online: getConnected.filter(n => !!n),
        });
      }],
    },
    returnResult({reject, resolve, of: 'online'}, cbk));
  });
};

export { runRocketChatBot }
