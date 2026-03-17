import asyncAuto from 'async/auto.js';
import asyncForever from 'async/forever.js';
import asyncMap from 'async/map.js';
import { getWalletInfo } from 'ln-service';
import { postNodesOffline } from 'ln-rocketchat';
import { returnResult } from 'asyncjs-util';

import { getLnds } from '../lnd/get_lnds.js';
import { Bot } from './rocket_bot.js';
import { runRocketChatBot } from './run_rocketchat_bot.js';

const isNumber = n => !isNaN(n);
const restartDelayMs = 1000 * 60 * 3;
const roundedUnitsType = 'rounded';
const smallUnitsType = 'full';

/** Connect nodes to RocketChat

  {
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
    request: <Request Function>
  }

  @returns via cbk or Promise
*/
const connectToRocketChat = (args, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: _cbk => {
        if (!Object.fromEntries) {
          return _cbk([400, 'ExpectedLaterVersionOfNodeJsInstalled']);
        }

        if (!args.fs) {
          return _cbk([400, 'ExpectedFsToConnectToRocketChat']);
        }

        if (!!args.id && !isNumber(args.id)) {
          return _cbk([400, 'ExpectedNumericConnectCodeToConnectToRocketChat']);
        }

        if (!args.request) {
          return _cbk([400, 'ExpectedRequestFunctionToConnectToRocketChat']);
        }

        return _cbk();
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

      // Get the RocketChat bot
      getBot: ['validate', async ({}, _cbk) => {
        const bot = new Bot();
      }],

      // Set the units formatting
      setUnits: ['validate', ({}, _cbk) => {
        // Set rounded value formatting type
        if (args.is_rounded_units) {
          process.env.PREFERRED_TOKENS_TYPE = roundedUnitsType;
        }

        // Set small units value formatting type
        if (args.is_small_units) {
          process.env.PREFERRED_TOKENS_TYPE = smallUnitsType;
        }

        return _cbk();
      }],

      // Start bot
      start: ['getBot', 'getNodes', 'setUnits', ({getBot, getNodes}, _cbk) => {
        let online = getNodes.map(n => n.id);

        return asyncForever(__cbk => {
          return runRocketChatBot({
            bot: getBot.bot,
            fs: args.fs,
            id: Number(args.id),
            key: getBot.key,
            min_forward_tokens: args.min_forward_tokens,
            min_rebalance_tokens: args.min_rebalance_tokens,
            nodes: args.nodes,
            request: args.request,
          },
          (err, res) => {
            if (err) {
              return __cbk(err);
            }

            const offline = online.filter(id => !res.online.includes(id));

            // Refresh the current online status
            online = res.online.slice();

            return postNodesOffline({
              bot: getBot.bot,
              connected: res.connected,
              offline: getNodes.filter(n => offline.includes(n.id)),
            },
            err => {
              if (err) {
                console.error({post_nodes_offline_error: err});
              }

              return setTimeout(__cbk, restartDelayMs);
            });
          });
        },
        _cbk);
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};

export { connectToRocketChat }
