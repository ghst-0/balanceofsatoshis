import asyncAuto from 'async/auto.js';
import { returnResult } from 'asyncjs-util';
import { getLnds } from '../lnd/index.js';

const {isArray} = Array;

/** Get node details for telegram commands

  {
    names: [{
      alias: <Node Alias String>
      from: <Node Name String>
      public_key: <Node Identity Public Key Hex String>
    }]
    nodes: [<Saved Node Name String>]
  }

  @returns via cbk or Promise
  {
    nodes: [{
      lnd: <Authenticated LND API Object>
      alias: <Node Alias String>
      from: <Node Name String>
      public_key: <Node Identity Public Key Hex String>
    }]
  }
*/
export default ({names, nodes}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: cbk => {

        if (!isArray(nodes)) {
          return cbk([400, 'ExpectedArrayOfSavedNodesToGetNodeDetailsFor']);
        }

        return cbk();
      },

      // Get associated LNDs
      getLnds: ['validate', ({}, cbk) => getLnds({nodes}, cbk)],

      // Merge node info for the nodes
      nodes: ['getLnds', ({getLnds}, cbk) => {
        const nodes = getLnds.lnds.map((lnd, i) => {
          return {
            lnd,
            alias: names[i].alias,
            from: names[i].from,
            public_key: names[i].public_key,
          };
        });

        return cbk(null, {nodes});
      }],
    },
    returnResult({reject, resolve, of: 'nodes'}, cbk));
  });
};
