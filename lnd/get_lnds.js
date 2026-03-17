import asyncAuto from 'async/auto.js';
import asyncMap from 'async/map.js';
import { returnResult } from 'asyncjs-util';

import { authenticatedLnd } from './authenticated_lnd.js';

const flatten = arr => [].concat(...arr);
const uniq = arr => Array.from(new Set(arr));

/** Get LNDs for specified nodes

  {
    [nodes]: <Node Name String> || [<Node Name String>]
  }

  @return via cbk or Promise
  {
    lnds: [<Authenticated LND API Object>]
  }
*/
const getLnds = ({nodes}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Default lnd
      getLnd: cbk => {
        if (!!nodes && nodes.length > 0) {
          return cbk();
        }

        return authenticatedLnd({}, cbk);
      },

      // Authenticated LND Objects
      getLnds: cbk => {
        if (!nodes || nodes.length === 0) {
          return cbk();
        }

        const nodesList = uniq(flatten([nodes].filter(n => !!n)));

        return asyncMap(nodesList, (node, cbk) => {
          return authenticatedLnd({node}, cbk);
        },
        cbk);
      },

      // Final lnds
      lnds: ['getLnd', 'getLnds', ({getLnd, getLnds}, cbk) => {
        if (!nodes || nodes.length === 0) {
          return cbk(null, {lnds: [getLnd.lnd]});
        }

        return cbk(null, {lnds: getLnds.map(n => n.lnd)});
      }],
    },
    returnResult({reject, resolve, of: 'lnds'}, cbk));
  });
};

export { getLnds }
