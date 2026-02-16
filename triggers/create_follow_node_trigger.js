import asyncAuto from 'async/auto.js';
import { createInvoice } from 'ln-service';
import { returnResult } from 'asyncjs-util';
import encodeTrigger from './encode_trigger.js';

const daysAsMs = days => Number(days) * 1000 * 60 * 60 * 24;
const defaultTriggerDays = 365;
const futureDate = ms => new Date(Date.now() + ms).toISOString();

/** Create a follow node trigger

  {
    id: <Node Id Public Key Hex String>
    lnd: <Authenticated LND API Object>
  }

  @returns via cbk or Promise
*/
export default ({id, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!id) {
          return cbk([400, 'ExpectedNodeIdToFollowToCreateFollowNodeTrigger']);
        }

        if (!lnd) {
          return cbk([400, 'ExpectedLndToCreateFollowNodeTrigger']);
        }

        return cbk();
      },

      // Encode the trigger
      description: ['validate', ({}, cbk) => {
        try {
          const {encoded} = encodeTrigger({follow: {id}});

          return cbk(null, encoded);
        } catch (err) {
          return cbk([400, err.message]);
        }
      }],

      // Add the trigger invoice
      create: ['description', ({description}, cbk) => {
        return createInvoice({
          description,
          lnd,
          expires_at: futureDate(daysAsMs(defaultTriggerDays)),
        },
        cbk);
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};
