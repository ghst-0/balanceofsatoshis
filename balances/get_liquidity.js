import asyncAuto from 'async/auto.js';
import { getLiquidity as ln_getLiquidity } from 'ln-sync';
import { returnResult } from 'asyncjs-util';

import { balanceFromTokens } from './balance_from_tokens.js';
import { getTags } from '../tags/get_tags.js';


/** Get the channel available liquidity

  A request function is required when min_node_score is specified

  {
    [above]: <Tokens Above Tokens Number>
    [below]: <Tokens Below Tokens Number>
    fs: {
      getFile: <Get File Function>
    }
    [is_outbound]: <Return Outbound Liquidity Bool>
    [is_top]: <Return Top Liquidity Bool>
    lnd: <Authenticated LND API Object>
    [max_fee_rate]: <Max Inbound Fee Rate Parts Per Million Number>
    [request]: <Request Function>
    [with]: <Liquidity With Public Key Hex or Tag Alias or Id String>
  }

  @returns via cbk or Promise
  {
    balance: <Liquid Tokens Number>
  }
*/
const getLiquidity = (args, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: _cbk => {
        if (!!args.is_outbound && args.max_fee_rate !== undefined) {
          return _cbk([400, 'MaxLiquidityFeeRateNotSupportedForOutbound']);
        }

        if (!args.fs) {
          return _cbk([400, 'ExpectedFsMethodsToGetLiquidity']);
        }

        if (!args.lnd) {
          return _cbk([400, 'ExpectedLndToGetLiquidity']);
        }

        if (!!args.min_node_score && !args.request) {
          return _cbk([400, 'ExpectedRequestFunctionToFilterByNodeScore']);
        }

        return _cbk();
      },

      // Get the list of tags to look for a with match
      getTags: ['validate', ({}, _cbk) => {
        if (!args.with) {
          return _cbk();
        }

        return getTags({fs: args.fs}, _cbk);
      }],

      // Determine with tag
      withTag: ['getTags', ({getTags}, _cbk) => {
        // Exit early when there is no with filter
        if (!args.with) {
          return _cbk();
        }

        const tagById = getTags.tags.find(({id}) => id === args.with);

        if (tagById) {
          return _cbk(null, tagById);
        }

        const tagByAlias = getTags.tags.find(({alias}) => alias === args.with);

        if (tagByAlias) {
          return _cbk(null, tagByAlias);
        }

        return _cbk();
      }],

      // Liquidity with nodes
      withNodes: ['withTag', ({withTag}, _cbk) => {
        if (withTag) {
          return _cbk(null, withTag.nodes);
        }

        if (args.with) {
          return _cbk(null, [args.with]);
        }

        return _cbk();
      }],

      // Get liquidity
      getLiquidity: ['withNodes', ({withNodes}, _cbk) => {
        return ln_getLiquidity({
          is_outbound: args.is_outbound,
          is_top: args.is_top,
          lnd: args.lnd,
          request: args.request,
          with: withNodes,
        },
        _cbk);
      }],

      // Total balances
      total: ['getLiquidity', ({getLiquidity}, _cbk) => {
        return _cbk(null, {
          balance: balanceFromTokens({
            above: args.above,
            below: args.below,
            tokens: getLiquidity.tokens,
          }),
        });
      }],
    },
    returnResult({reject, resolve, of: 'total'}, cbk));
  });
};

export { getLiquidity }
