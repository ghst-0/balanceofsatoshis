import asyncAuto from 'async/auto.js';
import asyncForever from 'async/forever.js';
import asyncMap from 'async/map.js';
import { getWalletInfo } from 'ln-service';
import { postNodesOffline } from 'ln-telegram';
import { returnResult } from 'asyncjs-util';
import { getLnds } from '../lnd/index.js';
import getRocketChatBot from './get_rocketchat_bot.js';
import runRocketChatBot from './run_rocketchat_bot.js';

const defaultPaymentsBudget = 0;
const isNumber = n => !isNaN(n);
const restartDelayMs = 1000 * 60 * 3;
const roundedUnitsType = 'rounded';
const smallUnitsType = 'full';

/** Connect nodes to RocketChat

  {
    ask: <Ask Function>
    fs: {
      getFile: <Get File Contents Function>
      getFileStatus: <Get File Status Function>
      makeDirectory: <Make Directory Function>
      writeFile: <Write File Function>
    }
    [id]: <Authorized User Id Number>
    [is_rounded_units]: <Formatting Should Use Rounded Units Bool>
    [is_small_units]: <Formatting Should Use Small Units Bool>
    [min_forward_tokens]: <Minimum Forward Tokens Number>
    [min_rebalance_tokens]: <Minimum Rebalance Tokens Number>
    [nodes]: [<Node Name String>]
    payments: {
      [limit]: <Total Spendable Budget Tokens Limit Number>
    }
    request: <Request Function>
  }

  @returns via cbk or Promise
*/
export default (args, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!Object.fromEntries) {
          return cbk([400, 'ExpectedLaterVersionOfNodeJsInstalled']);
        }

        if (!args.ask) {
          return cbk([400, 'ExpectedAskFunctionToConnectToRocketChat']);
        }

        if (!args.fs) {
          return cbk([400, 'ExpectedFsToConnectToRocketChat']);
        }

        if (!!args.id && !isNumber(args.id)) {
          return cbk([400, 'ExpectedNumericConnectCodeToConnectToRocketChat']);
        }

        if (!args.payments) {
          return cbk([400, 'ExpectedPaymentInstructionsToConnectToRocketChat']);
        }

        if (!args.request) {
          return cbk([400, 'ExpectedRequestFunctionToConnectToRocketChat']);
        }

        return cbk();
      },

      // Get the nodes
      getNodes: ['validate', async () => {
        const {nodes} = args;

        const {lnds} = await getLnds({nodes});

        const withName = lnds.map((lnd, i) => ({lnd, node: (nodes || [])[i]}));

        return asyncMap(withName, async ({lnd, node}) => {
          try {
            const wallet = await getWalletInfo({lnd});

            return {node, alias: wallet.alias, id: wallet.public_key};
          } catch (err) {
            console.error({node, err: 'failed_to_connect'});

            throw err;
          }
        });
      }],

      // Get the telegram bot
      getBot: ['validate', ({}, cbk) => {
        return getRocketChatBot({fs: args.fs}, cbk);
      }],

      // Set the units formatting
      setUnits: ['validate', ({}, cbk) => {
        // Set rounded value formatting type
        if (args.is_rounded_units) {
          process.env.PREFERRED_TOKENS_TYPE = roundedUnitsType;
        }

        // Set small units value formatting type
        if (args.is_small_units) {
          process.env.PREFERRED_TOKENS_TYPE = smallUnitsType;
        }

        return cbk();
      }],

      // Start bot
      start: ['getBot', 'getNodes', 'setUnits', ({getBot, getNodes}, cbk) => {
        let {limit} = args.payments;
        let online = getNodes.map(n => n.id);

        return asyncForever(cbk => {
          return runRocketChatBot({
            ask: args.ask,
            bot: getBot.bot,
            fs: args.fs,
            id: Number(args.id),
            key: getBot.key,
            min_forward_tokens: args.min_forward_tokens,
            min_rebalance_tokens: args.min_rebalance_tokens,
            nodes: args.nodes,
            payments_limit: limit || defaultPaymentsBudget,
            request: args.request,
          },
          (err, res) => {
            if (err) {
              return cbk(err);
            }

            const offline = online.filter(id => !res.online.includes(id));

            // Refresh the current online status
            online = res.online.slice();

            // Reset payment budget
            limit = Number();

            return postNodesOffline({
              bot: getBot.bot,
              connected: res.connected,
              offline: getNodes.filter(n => offline.includes(n.id)),
            },
            err => {
              if (err) {
                console.error({post_nodes_offline_error: err});
              }

              return setTimeout(cbk, restartDelayMs);
            });
          });
        },
        cbk);
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};
