import { join } from 'node:path';
import asyncAuto from 'async/auto.js';
import asyncDetect from 'async/detect.js';
import { returnResult } from 'asyncjs-util';

// TODO: Make this setting configurable with some new simple global config file
const certFile = '/opt/bos/config/tls.cert';


/** Look for the LND directory path

  {
    fs: {
      getFile: <Get File Function>
    }
  }

  @returns via cbk or Promise
  {
    [path]: <Found LND Directory Path String>
  }
*/
const getPath = ({fs}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: _cbk => {
        if (!fs) {
          return _cbk([400, 'ExpectedFileSystemMethodsToGetPath']);
        }

        return _cbk();
      },

      // Paths to look for
      paths: ['validate', ({}, _cbk) => {
        // Exit early because we are not using umbrel
        return _cbk(null, []);
    }],

      // Look through the paths to find a cert file
      findCert: ['paths', ({paths}, _cbk) => {
        return asyncDetect(paths, (path, __cbk) => {
          return fs.getFile(join(...[path].concat(certFile)), (err, cert) => {
            return __cbk(null, !err && !!cert);
          });
        },
        _cbk);
      }],

      // Final path result
      path: ['findCert', ({findCert}, _cbk) => {
        return _cbk(null, {path: findCert || undefined});
      }],
    },
    returnResult({reject, resolve, of: 'path'}, cbk));
  });
};

export { getPath }
