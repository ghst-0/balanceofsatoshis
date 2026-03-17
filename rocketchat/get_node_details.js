import asyncAuto from 'async/auto.js';
import { returnResult } from 'asyncjs-util';
import { getLnds } from '../lnd/get_lnds.js';

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
const getNodeDetails = ({names, nodes}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: _cbk => {

        if (!isArray(nodes)) {
          return _cbk([400, 'ExpectedArrayOfSavedNodesToGetNodeDetailsFor']);
        }

        return _cbk();
      },

      // Get associated LNDs
      getLnds: ['validate', ({}, _cbk) => getLnds({nodes}, _cbk)],

      // Merge node info for the nodes
      nodes: ['getLnds', ({getLnds}, _cbk) => {
        const nodes = getLnds.lnds.map((lnd, i) => {
          return {
            lnd,
            alias: names[i].alias,
            from: names[i].from,
            public_key: names[i].public_key,
          };
        });

        return _cbk(null, {nodes});
      }],
    },
    returnResult({reject, resolve, of: 'nodes'}, cbk));
  });
};

export { getNodeDetails }
