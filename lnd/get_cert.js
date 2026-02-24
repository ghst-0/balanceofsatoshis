import asyncAuto from 'async/auto.js';
import { returnResult } from 'asyncjs-util';

// TODO: Make this setting configurable with some new simple global config file
const certFile = '/opt/bos/config/tls.cert';

/** Get cert for node

  {
    fs: {
      getFile: <Get File Function>
    }
    [node]: <Node Name String>
    os: {
      homedir: <Home Directory Function> () => <Home Directory Path String>
      platform: <Platform Function> () => <Platform Name String>
      userInfo: <User Info Function> () => {username: <User Name String>}
    }
    [path]: <Lnd Data Directory Path String>
  }

  @returns via cbk or Promise
  {
    [cert]: <Cert File Base64 Encoded String>
  }
*/
const getCert = ({fs, node, os, path}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!fs) {
          return cbk([400, 'ExpectedFileSystemMethodsToGetCertForNode']);
        }

        if (!os) {
          return cbk([400, 'ExpectedOperatingSystemMethodsToGetCertForNode']);
        }

        return cbk();
      },

      // Get certificate
      getCert: ['validate', ({}, cbk) => {
        if (node) {
          return cbk();
        }

        return fs.getFile(certFile, (err, cert) => {
          if (err) {
            return cbk([503, 'UnexpectedErrorGettingCertFileData', {err}]);
          }

          if (!cert) {
            return cbk([503, 'LndCertNotFoundInDefaultLocation']);
          }

          return cbk(null, cert.toString('base64'));
        });
      }],

      // Cert
      cert: ['getCert', ({getCert}, cbk) => cbk(null, {cert: getCert})],
    },
    returnResult({reject, resolve, of: 'cert'}, cbk));
  });
};

export { getCert }
