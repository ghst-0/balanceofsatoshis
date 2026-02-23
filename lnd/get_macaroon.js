import { join } from 'node:path';
import asyncAuto from 'async/auto.js';
import asyncDetectSeries from 'async/detectSeries.js';
import { returnResult } from 'asyncjs-util';
import lndDirectory from './lnd_directory.js';

const defaults = [['bitcoin'], ['mainnet', 'testnet']];
const flatten = arr => [].concat(...arr);
const macDirs = ['data', 'chain'];
const macName = 'admin.macaroon';

/** Get macaroon for node

  {
    fs: {
      getFile: <Get File Function> (path, cbk) => {}
    }
    [node]: <Node Name String>
    os: {
      homedir: <Home Directory Function> () => <Home Directory Path String>
      platform: <Platform Function> () => <Platform Name String>
      userInfo: <User Info Function> () => {username: <User Name String>}
    }
    [path]: <LND Data Directory Path String>
  }

  @returns via cbk or Promise
  {
    [macaroon]: <Base64 Encoded Macaroon String>
  }
*/
export default ({fs, node, os, path}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!fs) {
          return cbk([400, 'ExpectedFileSystemMethodsToGetMacaroon']);
        }

        if (!os) {
          return cbk([400, 'ExpectedOperatingSystemMethodsToGetMacaroon']);
        }

        return cbk();
      },

      // Get macaroon
      getMacaroon: ['validate', ({}, cbk) => {
        // Exit early when a saved node was specified
        if (node) {
          return cbk(null, {});
        }

        const [chains, nets] = defaults;
        let defaultMacaroon;
        const dir = path || lndDirectory({os}).path;

        const all = chains.map(chain => {
          return nets.map(network => ({chain, network}));
        });

        // Find the default macaroon
        return asyncDetectSeries(flatten(all), ({chain, network}, cbk) => {
          const macPath = [].concat(macDirs).concat([chain, network, macName]);

          return fs.getFile(join(...[dir].concat(macPath)), (_, macaroon) => {
            defaultMacaroon = macaroon;

            return cbk(null, !!defaultMacaroon);
          });
        },
        () => {
          if (!defaultMacaroon) {
            return cbk([503, 'FailedToGetMacaroonFileFromDefaultLocation']);
          }

          return cbk(null, {macaroon: defaultMacaroon.toString('base64')});
        });
      }],
    },
    returnResult({reject, resolve, of: 'getMacaroon'}, cbk));
  });
};
