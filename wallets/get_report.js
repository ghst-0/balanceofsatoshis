import asyncAuto from 'async/auto.js';
import asyncMap from 'async/map.js';
import {
  getAutopilot,
  getChainFeeRate,
  getChannel,
  getChannels,
  getClosedChannels,
  getInvoice,
  getInvoices,
  getNetworkGraph,
  getWalletInfo,
  parsePaymentRequest
} from 'ln-service';
import { getNetwork, getPayments } from 'ln-sync';
import moment from 'moment';
import { returnResult } from 'asyncjs-util';

import { authenticatedLnd } from '../lnd/authenticated_lnd.js';
import { currencyForNetwork } from '../network/currency_for_network.js';
import { getForwards } from '../network/get_forwards.js';
import { getBalance as balances_getBalance } from '../balances/get_balance.js';
import { channelsAsReportActivity } from './channels_as_report_activity.js';
import { reportOverview } from './report_overview.js';

const afterMs = 1000 * 60 * 60 * 24;
const defaultConfTarget = 6;
const formatAsBigUnit = tokens => (tokens / 1e8).toFixed(8);
const limit = 1000;
const msPerBlock = 1000 * 60 * 10;
const {now} = Date;
const sumOf = arr => arr.reduce((sum, n) => n + sum, 0);
const styled = 'styled';


const bolden = (t) => `*{$t}*`
const italicize = (t) => `_{$t}_`

/** Get report

  {
    fs: {
      getFile: <Read File Contents Function> (path, cbk) => {}
    }
    [node]: <Node Name String>
    request: <Request Function>
    [style]: <Style Type String>
  }

  @returns via cbk
  {}
*/
const getReport = ({fs, node, request, style}, cbk) => {
  asyncAuto({
    // Get authenticated lnd connection
    getLnd: cbk => authenticatedLnd({node}, cbk),

    // Get balance
    getBalance: ['getLnd', ({getLnd}, cbk) => {
      return balances_getBalance({node, lnd: getLnd.lnd}, cbk);
    }],

    // Get forwards
    getForwards: ['getLnd', ({getLnd}, cbk) => {
      return getForwards({fs, lnd: getLnd.lnd, tags: []}, cbk);
    }],

    // Get autopilot status
    getAutopilot: ['getLnd', ({getLnd}, cbk) => {
      return getAutopilot({lnd: getLnd.lnd}, (err, res) => {
        if (err) {
          return cbk(null, {});
        }

        return cbk(null, res);
      });
    }],

    // Get channels
    getChannels: ['getLnd', ({getLnd}, cbk) => {
      return getChannels({lnd: getLnd.lnd}, cbk);
    }],

    // Get closed channels
    getClosed: ['getLnd', ({getLnd}, cbk) => {
      return getClosedChannels({lnd: getLnd.lnd}, cbk);
    }],

    // Get chain fee rate
    getChainFee: ['getLnd', ({getLnd}, cbk) => {
      return getChainFeeRate({
        lnd: getLnd.lnd,
        confirmation_target: defaultConfTarget,
      },
      (err, res) => {
        if (err) {
          return cbk();
        }

        return cbk(null, res);
      });
    }],

    // Get network graph
    getGraph: ['getLnd', ({getLnd}, cbk) => {
      return getNetworkGraph({lnd: getLnd.lnd}, cbk);
    }],

    // Get wallet info
    getInfo: ['getLnd', ({getLnd}, cbk) => {
      return getWalletInfo({lnd: getLnd.lnd}, cbk);
    }],

    // Get invoices
    getInvoices: ['getLnd', ({getLnd}, cbk) => {
      return getInvoices({lnd: getLnd.lnd}, cbk);
    }],

    // Get network
    getNetwork: ['getLnd', ({getLnd}, cbk) => {
      return getNetwork({lnd: getLnd.lnd}, cbk);
    }],

    // Get payments
    getPayments: ['getLnd', ({getLnd}, cbk) => {
      return getPayments({
        limit,
        after: new Date(now() - afterMs).toISOString(),
        lnd: getLnd.lnd,
      },
      cbk);
    }],

    // Currency
    currency: ['getInfo', ({getInfo}, cbk) => {
      const {currency} = currencyForNetwork({chains: getInfo.chains});

      return cbk(null, currency);
    }],

    // Get rebalances
    getRebalances: [
      'getInfo',
      'getLnd',
      'getPayments',
      ({getInfo, getLnd, getPayments}, cbk) =>
    {
      const rebalances = getPayments.payments.slice().reverse()
        .filter(payment => now() - Date.parse(payment.created_at) < afterMs)
        .filter(payment => payment.destination === getInfo.public_key);

      return asyncMap(rebalances, (rebalance, cbk) => {
        return getInvoice({id: rebalance.id, lnd: getLnd.lnd}, (err, res) => {
          if (err) {
            return cbk(err);
          }

          const [outHop] = rebalance.hops;

          const [payment] = res.payments;

          if (!payment) {
            return cbk(null, {
              created_at: rebalance.created_at,
              fee: rebalance.fee,
              out_peer: outHop,
              tokens: rebalance.tokens,
            });
          }

          return getChannel({
            id: payment.in_channel,
            lnd: getLnd.lnd,
          },
          (err, channel) => {
            if (err) {
              return cbk(null, {
                created_at: rebalance.created_at,
                fee: rebalance.fee,
                out_peer: outHop,
                tokens: rebalance.tokens,
              });
            }

            const inPeer = channel.policies.find(policy => {
              return policy.public_key !== getInfo.public_key;
            });

            return cbk(null, {
              created_at: rebalance.created_at,
              fee: rebalance.fee,
              in_peer: inPeer.public_key,
              out_peer: outHop,
              tokens: rebalance.tokens,
            });
          });
        });
      },
      cbk);
    }],

    report: [
      'currency',
      'getAutopilot',
      'getBalance',
      'getChainFee',
      'getChannels',
      'getForwards',
      'getGraph',
      'getInfo',
      'getInvoices',
      'getNetwork',
      'getPayments',
      'getRebalances',
      ({
        currency,
        getAutopilot,
        getBalance,
        getChainFee,
        getChannels,
        getClosed,
        getForwards,
        getGraph,
        getInfo,
        getInvoices,
        getNetwork,
        getPayments,
        getRebalances,
      }, cbk) =>
    {
      const activity = [];
      const currentHeight = getInfo.current_block_height;
      const {nodes} = getGraph;

      const findNode = pk => nodes.find(n => n.public_key === pk) || {};

      const {report} = reportOverview({
        currency,
        alias: getInfo.alias,
        balance: getBalance.balance,
        chain_fee: !getChainFee ? undefined : getChainFee.tokens_per_vbyte,
        channel_balance: getBalance.channel_balance,
        latest_block_at: getInfo.latest_block_at,
        public_key: getInfo.public_key,
      });

      const channelsActivity = channelsAsReportActivity({
        now,
        chain: {
          currency,
          height: getInfo.current_block_height,
          network: getNetwork.network,
        },
        channels: getChannels.channels.slice().reverse(),
        days: 1,
        nodes: getGraph.nodes,
      });

      for (const n of channelsActivity.activity) {
        activity.push(n)
      }

      for (const invoice1 of getInvoices.invoices.slice().reverse()
        .filter(invoice => !!invoice.confirmed_at)
        .filter(invoice => now() - Date.parse(invoice.confirmed_at) < afterMs)
        .filter(invoice => {
          const isToSelf = getPayments.payments.find(n => n.id === invoice.id);

          return !isToSelf;
        })) {
          const elements = [];
          const received = invoice1.received;

          elements.push({
            subtitle: moment(invoice1.confirmed_at).fromNow(),
            title: getInfo.alias || getInfo.public_key,
          });

          elements.push({
            action: 'Received payment',
          });

          elements.push({
            is_hidden: !invoice1.description,
            details: `"${invoice1.description}"`,
          });

          elements.push({
            details: `Received: ${formatAsBigUnit(received)} ${currency}`,
          });

          activity.push({ elements, date: invoice1.confirmed_at })
        }

      for (const rebalance of getRebalances) {
          const elements = [];
          const {fee} = rebalance;
          const {tokens} = rebalance;

          const amount = `${formatAsBigUnit(tokens)} ${currency}`;

          const inHop = rebalance.in_peer;
          const outHop = rebalance.out_peer;

          const inNode = getGraph.nodes.find(n => n.public_key === inHop);
          const outNode = getGraph.nodes.find(n => n.public_key === outHop);

          const inbound = (inNode || {}).alias || (inNode || {}).public_key;
          const outbound = (outNode || {}).alias || (outNode || {}).public_key;

          elements.push({
            subtitle: moment(rebalance.created_at).fromNow(),
            title: getInfo.alias || getInfo.public_key,
          });

          elements.push({action: 'Rebalance'});

          elements.push({
            details: `Increased inbound liquidity on ${outbound} by ${amount}`,
          });

          if (inbound) {
            elements.push({
              details: `Decreased inbound liquidity on ${inbound}`,
            });
          }

          elements.push({
            details: `Fee: ${formatAsBigUnit(fee)} ${currency}`,
          });

          activity.push({ elements, date: rebalance.created_at })
        }

      for (const payment1 of getPayments.payments.slice().reverse()
        .filter(payment => now() - Date.parse(payment.created_at) < afterMs)
        .filter(payment => payment.destination !== getInfo.public_key)) {
          const elements = [];
          const node = findNode(payment1.destination);
          const {request} = payment1;

          elements.push({
            subtitle: moment(payment1.created_at).fromNow(),
            title: node.alias || payment1.destination,
          });

          elements.push({action: 'Sent payment'});

          if (payment1.request) {
            elements.push({
              details: `"${parsePaymentRequest({request}).description}"`,
            });
          }

          elements.push({
            details: `Sent: ${formatAsBigUnit(payment1.tokens)} ${currency}`,
          });

          if (payment1.fee) {
            elements.push({
              details: `Fee: ${formatAsBigUnit(payment1.fee)} ${currency}`,
            });
          }

          activity.push({ elements, date: payment1.created_at })
        }

      for (const channel1 of getClosed.channels
        .filter(channel => currentHeight - channel.close_confirm_height < 160)) {
          const closeHeight = channel1.close_confirm_height;
          const node = findNode(channel1.partner_public_key);

          const msSinceClose = (currentHeight - closeHeight) * msPerBlock;

          const channels = getChannels.channels
            .filter(n => n.partner_public_key === channel1.partner_public_key);

          const elements = [];

          const date = moment(now() - msSinceClose);

          elements.push({
            subtitle: date.fromNow(),
            title: node.alias || channel1.partner_public_key,
          });

          elements.push({
            action: 'Channel closed',
          });

          const remoteBalance = channels.map(n => n.remote_balance);
          const localBalance = channels.map(n => n.local_balance);

          const inbound = formatAsBigUnit(sumOf(remoteBalance));
          const outbound = formatAsBigUnit(sumOf(localBalance));

          const inboundLiquidity = `${inbound} ${currency} inbound`;
          const outboundLiquidity = `${outbound} ${currency} outbound`;

          elements.push({
            details: `Liquidity now ${inboundLiquidity}, ${outboundLiquidity}`,
          });

          activity.push({ elements, date: date.toISOString() })
        }

      for (const peer of getForwards.peers.slice().reverse()) {
        const lastActivity = [peer.last_inbound_at, peer.last_outbound_at];
        const elements = [];

        const [last] = lastActivity.sort();

        elements.push({
          subtitle: moment(last).fromNow(),
          title: peer.alias,
        });

        elements.push({action: 'Routing activity'});

        if (peer.earned_inbound_fees) {
          const inbound = formatAsBigUnit(peer.earned_inbound_fees);

          elements.push({
            details: `Earned from inbound routing: ${inbound} ${currency}`,
          });
        }

        if (peer.earned_outbound_fees) {
          const outbound = formatAsBigUnit(peer.earned_outbound_fees);

          elements.push({
            details: `Earned from outbound routing: ${outbound} ${currency}`,
          });
        }

        const inbound = formatAsBigUnit(peer.liquidity_inbound);

        elements.push({
          details: `Inbound liquidity: ${inbound} ${currency}`,
        });

        const outbound = formatAsBigUnit(peer.liquidity_outbound);

        elements.push({
          details: `Outbound liquidity: ${outbound} ${currency}`,
        });

        activity.push({ elements, date: last })
      }

      if (activity.length > 0) {
        report.push({});
        report.push({title: 'Recent Activity:'});
      }

      activity.sort((a, b) => a.date > b.date ? -1 : 1);

      for (const { elements } of activity) {
        report.push({});

        for (const element of elements) {
          report.push(element)
        }
      }

      const renderReport = (lines) => {
        return lines
          .filter(n => !n.is_hidden)
          .map(({action, details, subtitle, title}) => {
            const elements = [
              !!title && style === styled ? bolden(title) : title,
              subtitle,
              details,
              !!action && style === styled ? italicize(action) : action,
            ];

            return elements.filter(n => !!n).join(' ');
          })
          .join('\n');
      }

      return cbk(null, renderReport(report));
    }],
  },
  returnResult({of: 'report'}, cbk));
};

export { getReport }
