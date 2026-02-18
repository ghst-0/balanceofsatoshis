import asyncAuto from 'async/auto.js';
import asyncMap from 'async/map.js';
import { getIdentity } from 'ln-service';
import { returnResult } from 'asyncjs-util';
import { getLnds } from './../lnd/index.js';
import startTelegramBot from './start_rocketchat_bot.js';

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
    logger: <Winston Logger Object>
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
          return cbk([400, 'ExpectedAskFunctionToRunTelegramBot']);
        }

        if (!args.bot) {
          return cbk([400, 'ExpectedTelegramBotToRunTelegramBot']);
        }

        if (!args.fs) {
          return cbk([400, 'ExpectedFilesystemMethodsToRunTelegramBot']);
        }

        if (!args.key) {
          return cbk([400, 'ExpectedApiKeyToRunTelegramBot']);
        }

        if (!args.logger) {
          return cbk([400, 'ExpectedWinstonLoggerToRunTelegramBot']);
        }

        if (!isArray(args.nodes)) {
          return cbk([400, 'ExpectedArrayOfSavedNodesToRunTelegramBot']);
        }

        if (args.payments_limit === undefined) {
          return cbk([400, 'ExpectedPaymentsLimitToRunTelegramBot']);
        }

        if (!args.request) {
          return cbk([400, 'ExpectedRequestFunctionToRunTelegrambot']);
        }

        return cbk();
      },

      // Get associated LNDs
      getLnds: ['validate', ({}, cbk) => {
        return getLnds({logger: args.logger, nodes: args.nodes}, cbk);
      }],

      // Start the bot going
      startBot: ['getLnds', ({getLnds}, cbk) => {
        args.logger.info({connecting_to_telegram: args.nodes});

        return startTelegramBot({
          ask: args.ask,
          bot: args.bot,
          fs: args.fs,
          id: args.id,
          key: args.key,
          min_forward_tokens: args.min_forward_tokens,
          min_rebalance_tokens: args.min_rebalance_tokens,
          lnds: getLnds.lnds,
          logger: args.logger,
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
          args.logger.error({err: startBot.failure});
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
