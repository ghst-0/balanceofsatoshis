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
      getLnd: _cbk => {
        if (!!nodes && nodes.length > 0) {
          return _cbk();
        }

        return authenticatedLnd({}, _cbk);
      },

      // Authenticated LND Objects
      getLnds: _cbk => {
        if (!nodes || nodes.length === 0) {
          return _cbk();
        }

        const nodesList = uniq(flatten([nodes].filter(n => !!n)));

        return asyncMap(nodesList, (node, _cbk) => {
          return authenticatedLnd({node}, _cbk);
        },
        _cbk);
      },

      // Final lnds
      lnds: ['getLnd', 'getLnds', ({getLnd, getLnds}, _cbk) => {
        if (!nodes || nodes.length === 0) {
          return _cbk(null, {lnds: [getLnd.lnd]});
        }

        return _cbk(null, {lnds: getLnds.map(n => n.lnd)});
      }],
    },
    returnResult({reject, resolve, of: 'lnds'}, cbk));
  });
};

export { getLnds }
