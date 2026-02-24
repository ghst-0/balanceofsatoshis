import {
  handleBalanceCommand,
  handleConnectCommand,
  handleCostsCommand,
  handleEarningsCommand,
  handleInfoCommand,
  handleLiquidityCommand,
  handleMempoolCommand,
  handlePendingCommand,
  handleStartCommand,
  handleVersionCommand,
  notifyOfForwards,
  postChainTransaction,
  postClosedMessage,
  postClosingMessage,
  postOpenMessage,
  postOpeningMessage,
  postNodesOnline,
  postSettledPayment
} from 'ln-rocketchat';
import asyncAuto from 'async/auto.js';
import asyncEach from 'async/each.js';
import asyncForever from 'async/forever.js';
import asyncMap from 'async/map.js';
import asyncRetry from 'async/retry.js';
import { getForwards,
  getWalletInfo,
  subscribeToChannels,
  subscribeToPastPayments,
  subscribeToTransactions
} from 'ln-service';
import { getTransactionRecord, subscribeToPendingChannels } from 'ln-sync';
import { noLocktimeIdForTransaction } from '@alexbosworth/blockchain';
import { returnResult } from 'asyncjs-util';

import { getNodeDetails } from './get_node_details.js';
import interaction from './interaction.json' with { type: 'json' };
import PACKAGE_JSON from '../package.json' with { type: 'json' };

const { name: named, version } = PACKAGE_JSON ;

const fromName = node => `${node.alias} ${node.public_key.slice(0, 8)}`;
const getLnds = (y, z) => getNodeDetails({names: y, nodes: z});
const hexAsBuffer = hex => Buffer.from(hex, 'hex');
const {isArray} = Array;
let isBotInit = false;
const isNumber = n => !isNaN(n);
const limit = 99999;
const markdown = {parse_mode: 'Markdown'};
const restartSubscriptionTimeMs = 1000 * 30;
const sanitize = n => (n || '').replaceAll('_', '\\_').replaceAll(/[*~`]/g, '');

/** Start a Telegram bot

  {
    ask: <Ask Function>
    bot: <Telegram Bot Object>
    [id]: <Authorized User Id Number>
    key: <Telegram API Key String>
    [min_forward_tokens]: <Minimum Forward Tokens To Notify Number>
    [min_rebalance_tokens]: <Minimum Rebalance Tokens To Notify Number>
    lnds: [<Authenticated LND API Object>]
    nodes: [<Saved Nodes String>]
    payments_limit: <Total Spendable Budget Tokens Limit Number>
    request: <Request Function>
  }

  @returns via cbk or Promise
  {
    [connected]: <Connected User Id Number>
    failure: <Termination Error Object>
  }
*/
const startRocketChatBot = (args, cbk) => {
  let connectedId = args.id;
  let isStopped = false;
  const subscriptions = [];

  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.ask) {
          return cbk([400, 'ExpectedAskFunctionToStartRocketChatBot']);
        }

        if (!isArray(args.lnds) || args.lnds.length === 0) {
          return cbk([400, 'ExpectedLndsToStartRocketChatBot']);
        }

        if (!args.key) {
          return cbk([400, 'ExpectedApiKeyToStartRocketChatBot']);
        }

        if (!!args.id && args.key.startsWith(`${args.id}:`)){
          return cbk([400, 'ExpectedConnectCodeFromConnectCommandNotBotId']);
        }

        if (!isArray(args.nodes)) {
          return cbk([400, 'ExpectedArrayOfSavedNodesToStartRocketChatBot']);
        }

        if (!isNumber(args.payments_limit)) {
          return cbk([400, 'ExpectedPaymentsLimitTokensNumberToStartBot']);
        }

        if (!args.request) {
          return cbk([400, 'ExpectedRequestMethodToStartRocketChatBot']);
        }

        return cbk();
      },

      // Get node info
      getNodes: ['validate', ({}, cbk) => {
        return asyncMap(args.lnds, (lnd, cbk) => {
          return getWalletInfo({lnd}, (err, res) => {
            if (err) {
              return cbk([503, 'FailedToGetNodeInfo', {err}]);
            }

            const named = fromName({
              alias: res.alias,
              public_key: res.public_key,
            });

            return cbk(null, {
              lnd,
              alias: res.alias,
              from: sanitize(named),
              public_key: res.public_key,
            });
          });
        },
        cbk);
      }],

      // Setup the bot start action
      initBot: ['getNodes', ({getNodes}, cbk) => {
        // Exit early when the bot was already setup
        if (isBotInit) {
          return cbk();
        }

        const names = getNodes.map(node => ({
          alias: node.alias,
          from: node.from,
          public_key: node.public_key,
        }));

        args.bot.catch(err => console.error({rocketchat_error: err}));

        // Handle lookup of total funds
        args.bot.command('balance', async ctx => {
          try {
            await handleBalanceCommand({
              from: ctx.message.from.id,
              id: connectedId,
              nodes: (await getLnds(names, args.nodes)).nodes,
              reply: (n, opt) => ctx.reply(n, opt),
              working: () => ctx.replyWithChatAction('typing'),
            });
          } catch (err) {
            console.error({err});
          }
        });

        // Handle command to get the connect id
        args.bot.command('connect', ctx => {
          handleConnectCommand({
            from: ctx.from.id,
            id: connectedId,
            reply: n => ctx.reply(n, markdown),
          });
        });

        // Handle command to view costs over the past week
        args.bot.command('costs', async ctx => {
          try {
            await handleCostsCommand({
              from: ctx.message.from.id,
              id: connectedId,
              nodes: (await getLnds(names, args.nodes)).nodes,
              reply: n => ctx.reply(n, markdown),
              request: args.request,
              working: () => ctx.replyWithChatAction('typing'),
            });
          } catch (err) {
            console.error({err});
          }
        });

        // Handle command to view earnings over the past week
        args.bot.command('earnings', async ctx => {
          try {
            await handleEarningsCommand({
              from: ctx.message.from.id,
              id: connectedId,
              nodes: (await getLnds(names, args.nodes)).nodes,
              reply: n => ctx.reply(n, markdown),
              working: () => ctx.replyWithChatAction('typing'),
            });
          } catch (err) {
            console.error({err});
          }
        });

        // Handle command to look up wallet info
        args.bot.command('info', async ctx => {
          try {
            await handleInfoCommand({
              from: ctx.message.from.id,
              id: connectedId,
              nodes: (await getLnds(names, args.nodes)).nodes,
              remove: () => ctx.deleteMessage(),
              reply: (message, options) => ctx.reply(message, options),
            });
          } catch (err) {
            console.error({err});
          }
        });

        // Handle lookup of the mempool
        args.bot.command('mempool', async ctx => {
          try {
            return await handleMempoolCommand({
              from: ctx.message.from.id,
              id: connectedId,
              reply: n => ctx.reply(n, markdown),
              request: args.request,
            });
          } catch (err) {
            console.error({err});
          }
        });

        // Handle lookup of channel liquidity
        args.bot.command('liquidity', async ctx => {
          try {
            await asyncRetry({
              errorFilter: err => {
                if (err && err.message.startsWith('404')) {
                  return false;
                }

                return true;
              },
            }, async () => {
              await handleLiquidityCommand({
                from: ctx.message.from.id,
                id: connectedId,
                nodes: (await getLnds(names, args.nodes)).nodes,
                reply: (n, opt) => ctx.reply(n, opt),
                text: ctx.message.text,
                working: () => ctx.replyWithChatAction('typing'),
              });
            });
          } catch (err) {
            console.error({err});
          }
        });

        // Handle command to view pending transactions
        args.bot.command('pending', async ctx => {
          try {
            await handlePendingCommand({
              from: ctx.message.from.id,
              id: connectedId,
              nodes: (await getLnds(names, args.nodes)).nodes,
              reply: (message, options) => ctx.reply(message, options),
              working: () => ctx.replyWithChatAction('typing'),
            });
          } catch (err) {
            console.error({err});
          }
        });

        // Handle command to start the bot
        args.bot.command('start', ctx => {
          handleStartCommand({
            id: connectedId,
            reply: n => ctx.reply(n, markdown),
          });
        });

        // Handle command to view the current version
        args.bot.command('version', async ctx => {
          try {
            await handleVersionCommand({
              named,
              version,
              from: ctx.message.from.id,
              id: connectedId,
              request: args.request,
              reply: n => ctx.reply(n, markdown),
            });
          } catch (err) {
            console.error({err});
          }
        });

        // Handle command to get help with the bot
        args.bot.command('help', async ctx => {
          const commands = [
            '/blocknotify - Notification on next block',
            '/connect - Connect bot',
            '/costs - View costs over the past week',
            '/earnings - View earnings over the past week',
            '/graph <pubkey or peer alias> - Show info about a node',
            '/info - Show wallet info',
            '/liquidity [with] - View node liquidity',
            '/mempool - BTC mempool report',
            '/pay - Pay an invoice',
            '/pending - View pending channels, probes, and forwards',
            '/version - View the current bot version',
          ];

          try {
            await ctx.reply(`🤖\n${commands.join('\n')}`);
          } catch (err) {
            console.error({err});
          }
        });

        args.bot.start();

        // Avoid re-registering bot actions
        isBotInit = true;

        return cbk();
      }],

      // Ask the user to confirm their user id
      userId: ['initBot', ({}, cbk) => {
        // Exit early when the id is specified
        if (connectedId) {
          return cbk();
        }

        return args.ask({
          message: interaction.user_id_prompt.message,
          name: 'code',
          type: 'input',
          validate: input => {
            if (!input) {
              return false;
            }

            // The connect code should be entirely numeric, not an API key
            if (!isNumber(input)) {
              return `Expected numeric connect code from /connect command`;
            }

            // the connect code number should not match bot id from the API key
            if (args.key.startsWith(`${input}:`)) {
              return `Expected /connect code, not bot id from API key`;
            }

            return true;
          },
        },
        ({code}) => {
          if (!code) {
            return cbk([400, 'ExpectedConnectCodeToStartRocketChatBot']);
          }

          connectedId = Number(code);

          return cbk();
        });
      }],

      // Setup the bot commands
      setCommands: ['validate', async ({}) => {
        return await args.bot.api.setMyCommands([
          {command: 'balance', description: 'Show funds on the node'},
          {command: 'blocknotify', description: 'Get notified on next block'},
          {command: 'connect', description: 'Get connect code for the bot'},
          {command: 'costs', description: 'Show costs over the week'},
          {command: 'earnings', description: 'Show earnings over the week'},
          {command: 'graph', description: 'Show info about a node'},
          {command: 'help', description: 'Show the list of commands'},
          {command: 'info', description: 'Show wallet info'},
          {command: 'liquidity', description: 'Get liquidity [with-peer]'},
          {command: 'mempool', description: 'Get info about the mempool'},
          {command: 'pending', description: 'Get pending forwards, channels'},
          {command: 'version', description: 'View current bot version'},
        ]);
      }],

      // Channel status changes
      channels: ['getNodes', 'userId', ({getNodes}, cbk) => {
        return asyncEach(getNodes, ({from, lnd}, cbk) => {
          const sub = subscribeToChannels({lnd});

          subscriptions.push(sub);

          sub.on('channel_closed', async update => {
            try {
              await postClosedMessage({
                from,
                lnd,
                capacity: update.capacity,
                id: connectedId,
                is_breach_close: update.is_breach_close,
                is_cooperative_close: update.is_cooperative_close,
                is_local_force_close: update.is_local_force_close,
                is_remote_force_close: update.is_remote_force_close,
                partner_public_key: update.partner_public_key,
                send: (id, msg, opt) => args.bot.api.sendMessage(id, msg, opt),
              });
            } catch (err) {
              console.error({from, post_closed_message_error: err});
            }
          });

          sub.on('channel_opened', async update => {
            try {
              await postOpenMessage({
                from,
                lnd,
                capacity: update.capacity,
                id: connectedId,
                is_partner_initiated: update.is_partner_initiated,
                is_private: update.is_private,
                partner_public_key: update.partner_public_key,
                send: (id, msg, opt) => args.bot.api.sendMessage(id, msg, opt),
              });
            } catch (err) {
              console.error({from, post_open_message_error: err});
            }
          });

          sub.once('error', err => {
            // Terminate subscription and restart after a delay
            sub.removeAllListeners();

            return cbk([503, 'UnexpectedErrorInChannelsSubscription', {err}]);
          });
        },
        cbk);
      }],

      // Send connected message
      connected: ['getNodes', 'userId', ({getNodes}, cbk) => {
        console.info({is_connected: true});

        return postNodesOnline({
          id: connectedId,
          nodes: getNodes.map(n => ({alias: n.alias, id: n.public_key})),
          send: (id, msg, opt) => args.bot.api.sendMessage(id, msg, opt),
        },
        cbk);
      }],

      // Poll for forwards
      forwards: ['getNodes', 'userId', ({getNodes}, cbk) => {
        return asyncEach(getNodes, (node, cbk) => {
          let after = new Date().toISOString();
          const {from} = node;
          const {lnd} = node;

          return asyncForever(cbk => {
            if (isStopped) {
              return cbk([503, 'ExpectedNonStoppedBotToReportForwards']);
            }

            const before = new Date().toISOString();

            return getForwards({after, before, limit, lnd}, (err, res) => {
              // Exit early and ignore errors
              if (err) {
                return setTimeout(cbk, restartSubscriptionTimeMs);
              }

              // Push cursor forward
              after = before;

              // Notify Telegram bot that forwards happened
              return notifyOfForwards({
                from,
                lnd,
                forwards: res.forwards.filter(forward => {
                  if (!args.min_forward_tokens) {
                    return true;
                  }

                  return forward.tokens >= args.min_forward_tokens;
                }),
                id: connectedId,
                node: node.public_key,
                nodes: getNodes,
                send: (id, msg, opt) => args.bot.api.sendMessage(id, msg, opt),
              },
              err => {
                if (err) {
                  console.error({forwards_notify_err: err});
                }

                return setTimeout(cbk, restartSubscriptionTimeMs);
              });
            });
          },
          cbk);
        },
        cbk);
      }],

      // Subscribe to past payments
      payments: ['getNodes', 'userId', ({getNodes}, cbk) => {
        return asyncEach(getNodes, (node, cbk) => {
          const sub = subscribeToPastPayments({lnd: node.lnd});

          subscriptions.push(sub);

          sub.on('payment', async payment => {
            // Ignore rebalances
            if (payment.destination === node.public_key) {
              return;
            }

            try {
              await postSettledPayment({
                from: node.from,
                id: connectedId,
                lnd: node.lnd,
                nodes: getNodes.map(n => n.public_key),
                payment: {
                  destination: payment.destination,
                  id: payment.id,
                  paths: payment.paths,
                  safe_fee: payment.safe_fee,
                  safe_tokens: payment.safe_tokens,
                },
                send: (id, m, opts) => args.bot.api.sendMessage(id, m, opts),
              });
            } catch (err) {
              console.error({post_payment_error: err});
            }
          });

          sub.once('error', err => {
            // Terminate subscription and restart after a delay
            sub.removeAllListeners();

            return cbk([503, 'ErrorInPaymentsSub', {err}])
          });
        },
        cbk);
      }],

      // Pending channels changes
      pending: ['getNodes', 'userId', ({getNodes}, cbk) => {
        return asyncEach(getNodes, ({from, lnd}, cbk) => {
          const sub = subscribeToPendingChannels({lnd});

          subscriptions.push(sub);

          // Listen for pending closing channel events
          sub.on('closing', async update => {
            try {
              await postClosingMessage({
                from,
                lnd,
                closing: update.channels,
                id: connectedId,
                nodes: getNodes,
                send: (id, msg, opt) => args.bot.api.sendMessage(id, msg, opt),
              });
            } catch (err) {
              console.error({from, post_closing_message_error: err});
            }
          });

          // Listen for pending opening events
          sub.on('opening', async update => {
            try {
              await postOpeningMessage({
                from,
                lnd,
                id: connectedId,
                opening: update.channels,
                send: (id, msg, opt) => args.bot.api.sendMessage(id, msg, opt),
              });
            } catch (err) {
              console.error({from, post_opening_message_error: err});
            }
          });

          sub.once('error', err => {
            // Terminate subscription and restart after a delay
            sub.removeAllListeners();

            return cbk([503, 'UnexpectedErrorInPendingSubscription', {err}]);
          });
        },
        cbk);
      }],

      // Subscribe to chain transactions
      transactions: ['getNodes', 'userId', ({getNodes}, cbk) => {
        let isFinished = false;

        return asyncEach(getNodes, ({from, lnd}, cbk) => {
          const noLocktimeIds = [];
          const sub = subscribeToTransactions({lnd});
          const transactions = [];

          subscriptions.push(sub);

          sub.on('chain_transaction', async transaction => {
            const {id} = transaction;

            // Exit early when this pending transaction has already been seen
            if (!transaction.is_confirmed && transactions.includes(id)) {
              return;
            }

            transactions.push(id);

            // Check the transaction uniqueness against a locktime-absent hash
            if (!transaction.is_confirmed && !!transaction.transaction) {
              try {
                const buffer = hexAsBuffer(transaction.transaction);

                const noLocktimeId = noLocktimeIdForTransaction({buffer}).id;

                // Exit early when a similar transaction has already been seen
                if (noLocktimeIds.includes(noLocktimeId)) {
                  return;
                }

                noLocktimeIds.push(noLocktimeId);
              } catch (err) {
                console.error({err});
              }
            }

            try {
              const record = await getTransactionRecord({lnd, id});

              if (!record || !record.tx) {
                return;
              }

              return await postChainTransaction({
                from,
                confirmed: transaction.is_confirmed,
                id: connectedId,
                nodes: getNodes,
                send: (id, msg, opt) => args.bot.api.sendMessage(id, msg, opt),
                transaction: record,
              });
            } catch (err) {
              console.error({chain_tx_err: err, node: from});

              if (isFinished) {
                return;
              }

              isFinished = true;

              sub.removeAllListeners({});

              return cbk(err);
            }
          });

          sub.once('error', err => {
            sub.removeAllListeners();

            if (isFinished) {
              return;
            }

            isFinished = true;

            console.error({from, chain_subscription_error: err});

            return cbk(err);
          });
        },
        cbk);
      }],
    },
    (err, res) => {
      // Signal to fetch based polling that it should stop
      isStopped = true;

      // Cancel all open subscriptions
      for (const n of subscriptions) {
        n.removeAllListeners()
      }

      const result = {result: {connected: connectedId, failure: err}};

      return returnResult({reject, resolve, of: 'result'}, cbk)(null, result);
    });
  });
};

export { startRocketChatBot }
