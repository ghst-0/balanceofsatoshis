import asyncAuto from 'async/auto.js';
import { getChainBalance as ln_getChainBalance, getChannelBalance, getChannels as ln_getChannels, getPendingChainBalance } from 'ln-service';
import { returnResult } from 'asyncjs-util';

import { balanceFromTokens } from './balance_from_tokens.js';

const none = 0;

/** Get the existing balance

  {
    [above]: <Tokens Above Tokens Number>
    [below]: <Tokens Below Tokens Number>
    [is_confirmed]: <Is Confirmed Funds Bool>
    [is_offchain_only]: <Get Only Channels Tokens Bool>
    [is_onchain_only]: <Get Only Chain Tokens Bool>
    lnd: <Authenticated LND API Object>
  }

  @returns via cbk or Promise
  {
    balance: <Tokens Number>
    channel_balance: <Channel Balance Minus Commit Fees Tokens Number>
  }
*/
const getBalance = (args, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: _cbk => {
        if (!args.lnd) {
          return _cbk([400, 'ExpectedLndToGetBalance']);
        }

        return _cbk();
      },

      // Lnd object
      lnd: ['validate', ({}, _cbk) => _cbk(null, args.lnd)],

      // Get the chain balance
      getChainBalance: ['lnd', ({lnd}, _cbk) => ln_getChainBalance({lnd}, _cbk)],

      // Get the channel balance
      getChanBalance: ['lnd', ({lnd}, _cbk) => getChannelBalance({lnd}, _cbk)],

      // Get the initiator burden
      getChannels: ['lnd', ({lnd}, _cbk) => ln_getChannels({lnd}, _cbk)],

      // Get the pending balance
      getPending: ['lnd', ({lnd}, _cbk) => getPendingChainBalance({lnd}, _cbk)],

      // Calculate the pending chain sum
      pendingChain: ['getPending', ({getPending}, _cbk) => {
        // Exit early when we are only looking at offchain or confirmed funds
        if (!!args.is_offchain_only || !!args.is_confirmed) {
          return _cbk(null, none);
        }

        // Exit early when there is no pending chain balance
        if (!getPending.pending_chain_balance) {
          return _cbk(null, none);
        }

        return _cbk(null, getPending.pending_chain_balance);
      }],

      // Total balances
      balance: [
        'getChainBalance',
        'getChanBalance',
        'getChannels',
        'pendingChain',
        ({getChainBalance, getChanBalance, getChannels, pendingChain}, _cbk) =>
      {
        const futureCommitFees = getChannels.channels
          .filter(n => n.is_partner_initiated === false)
          .reduce((sum, n) => sum + n.commit_transaction_fee, 0);

        const pendingChanToks = !!args.is_onchain_only || !!args.is_confirmed ?
            none : getChanBalance.pending_balance;

        // Gather all component balances
        const balances = [
          args.is_offchain_only ? none : getChainBalance.chain_balance,
          args.is_onchain_only ? none : getChanBalance.channel_balance,
          args.is_onchain_only ? none : futureCommitFees,
          pendingChain,
          pendingChanToks,
        ];

        const balance = balanceFromTokens({
          above: args.above,
          below: args.below,
          tokens: balances,
        });

        return _cbk(null, {
          balance,
          channel_balance: getChanBalance.channel_balance + futureCommitFees,
        });
      }],
    },
    returnResult({reject, resolve, of: 'balance'}, cbk));
  });
};

export { getBalance }
