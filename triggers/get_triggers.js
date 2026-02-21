import asyncAuto from 'async/auto.js';
import asyncUntil from 'async/until.js';
import { getInvoices } from 'ln-service';
import { returnResult } from 'asyncjs-util';
import decodeTrigger from './decode_trigger.js';

const defaultInvoicesLimit = 100;

/** Get registered triggers

  {
    lnd: <Authenticated LND API Object>
  }

  @returns via cbk or Promise
  {
    triggers: [{
      [connectivity]: {
        id: <Node Identity Public Key Hex String>
      }
      [follow]: {
        id: <Node Identity Public Key Hex String>
      }
      id: <Trigger Id Hex String>
    }]
  }
*/
export default ({lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd) {
          return cbk([400, 'ExpectedAuthenticatedLndToGetTriggers']);
        }

        return cbk();
      },

      // Get the past triggers
      getTriggers: ['validate', ({}, cbk) => {
        let token;
        const triggers = [];

        // Register past trigger invoices
        return asyncUntil(
          cbk => cbk(null, token === false),
          cbk => {
            return getInvoices({
              lnd,
              token,
              is_unconfirmed: true,
              limit: !token ? defaultInvoicesLimit : undefined,
            },
            (err, res) => {
              if (err) {
                return cbk(err);
              }

              token = res.next || false;

              for (const { description, id } of res.invoices) {
                try {
                  const trigger = decodeTrigger({encoded: description});

                  triggers.push({
                    id,
                    connectivity: trigger.connectivity,
                    follow: trigger.follow,
                  })
                } catch {
                  // Ignore invoices that are not triggers
                }
              }

              return cbk();
            });
          },
          err => {
            if (err) {
              return cbk(err);
            }

            return cbk(null, triggers);
          },
        );
      }],
    },
    returnResult({reject, resolve, of: 'getTriggers'}, cbk));
  });
};
