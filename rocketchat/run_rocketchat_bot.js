import asyncAuto from 'async/auto.js';
import asyncMap from 'async/map.js';
import { getIdentity } from 'ln-service';
import { returnResult } from 'asyncjs-util';

import { getLnds } from '../lnd/index.js';
import startRocketChatBot from './start_rocketchat_bot.js';

const {isArray} = Array;

/** Run the telegram bot for a node or multiple nodes

  {
    ask: <Ask Function>
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
    payments_limit: <Total Spendable Budget Tokens Limit Number>
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
export default (args, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.ask) {
          return cbk([400, 'ExpectedAskFunctionToRunRocketChatBot']);
        }

        if (!args.bot) {
          return cbk([400, 'ExpectedRocketChatBotToRunRocketChatBot']);
        }

        if (!args.fs) {
          return cbk([400, 'ExpectedFilesystemMethodsToRunRocketChatBot']);
        }

        if (!args.key) {
          return cbk([400, 'ExpectedApiKeyToRunRocketChatBot']);
        }

        if (!isArray(args.nodes)) {
          return cbk([400, 'ExpectedArrayOfSavedNodesToRunRocketChatBot']);
        }

        if (args.payments_limit === undefined) {
          return cbk([400, 'ExpectedPaymentsLimitToRunRocketChatBot']);
        }

        if (!args.request) {
          return cbk([400, 'ExpectedRequestFunctionToRunRocketChatBot']);
        }

        return cbk();
      },

      // Get associated LNDs
      getLnds: ['validate', ({}, cbk) => {
        return getLnds({nodes: args.nodes}, cbk);
      }],

      // Start the bot going
      startBot: ['getLnds', ({getLnds}, cbk) => {
        console.info({connecting_to_rocketchat: args.nodes});

        return startRocketChatBot({
          ask: args.ask,
          bot: args.bot,
          fs: args.fs,
          id: args.id,
          key: args.key,
          min_forward_tokens: args.min_forward_tokens,
          min_rebalance_tokens: args.min_rebalance_tokens,
          lnds: getLnds.lnds,
          nodes: args.nodes,
          payments_limit: args.payments_limit,
          request: args.request,
        },
        cbk);
      }],

      // Check the LNDs that they can connect
      getConnected: ['getLnds', 'startBot', ({getLnds}, cbk) => {
        return asyncMap(getLnds.lnds, (lnd, cbk) => {
          return getIdentity({lnd}, (err, res) => {
            // Return no id when there is an error getting the wallet info
            if (err) {
              return cbk();
            }

            return cbk(null, res.public_key);
          });
        },
        cbk);
      }],

      // Final set of connected nodes
      online: ['getConnected', 'startBot', ({getConnected, startBot}, cbk) => {
        // Report the failure that killed the bot
        if (startBot.failure) {
          console.error({err: startBot.failure});
        }

        return cbk(null, {
          connected: startBot.connected,
          online: getConnected.filter(n => !!n),
        });
      }],
    },
    returnResult({reject, resolve, of: 'online'}, cbk));
  });
};
