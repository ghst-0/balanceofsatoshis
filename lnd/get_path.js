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
      validate: cbk => {
        if (!fs) {
          return cbk([400, 'ExpectedFileSystemMethodsToGetPath']);
        }

        return cbk();
      },

      // Paths to look for
      paths: ['validate', ({}, cbk) => {
        // Exit early because we are not using umbrel
        return cbk(null, []);
    }],

      // Look through the paths to find a cert file
      findCert: ['paths', ({paths}, cbk) => {
        return asyncDetect(paths, (path, cbk) => {
          return fs.getFile(join(...[path].concat(certFile)), (err, cert) => {
            return cbk(null, !err && !!cert);
          });
        },
        cbk);
      }],

      // Final path result
      path: ['findCert', ({findCert}, cbk) => {
        return cbk(null, {path: findCert || undefined});
      }],
    },
    returnResult({reject, resolve, of: 'path'}, cbk));
  });
};

export { getPath }
