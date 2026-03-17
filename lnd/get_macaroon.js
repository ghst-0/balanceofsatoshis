import asyncAuto from 'async/auto.js';
import asyncDetectSeries from 'async/detectSeries.js';
import { returnResult } from 'asyncjs-util';

// TODO: Make this setting configurable with some new simple global config file
const macaroonPath = '/opt/readonlymacaroon/readonly.macaroon';

const defaults = [['bitcoin'], ['mainnet', 'testnet']];
const flatten = arr => [].concat(...arr);

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
const getMacaroon = ({fs, node, os, path}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: _cbk => {
        if (!fs) {
          return _cbk([400, 'ExpectedFileSystemMethodsToGetMacaroon']);
        }

        if (!os) {
          return _cbk([400, 'ExpectedOperatingSystemMethodsToGetMacaroon']);
        }

        return _cbk();
      },

      // Get macaroon
      getMacaroon: ['validate', ({}, _cbk) => {
        // Exit early when a saved node was specified
        if (node) {
          return _cbk(null, {});
        }

        const [chains, nets] = defaults;
        let defaultMacaroon;

        const all = chains.map(chain => {
          return nets.map(network => ({chain, network}));
        });

        // Find the default macaroon
        return asyncDetectSeries(flatten(all), ({chain, network}, __cbk) => {

          return fs.getFile(macaroonPath, (_, macaroon) => {
            defaultMacaroon = macaroon;

            return __cbk(null, !!defaultMacaroon);
          });
        },
        () => {
          if (!defaultMacaroon) {
            return _cbk([503, 'FailedToGetMacaroonFileFromDefaultLocation']);
          }

          return _cbk(null, {macaroon: defaultMacaroon.toString('base64')});
        });
      }],
    },
    returnResult({reject, resolve, of: 'getMacaroon'}, cbk));
  });
};

export { getMacaroon }
