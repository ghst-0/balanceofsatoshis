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
      validate: _cbk => {
        if (!fs) {
          return _cbk([400, 'ExpectedFileSystemMethodsToGetCertForNode']);
        }

        if (!os) {
          return _cbk([400, 'ExpectedOperatingSystemMethodsToGetCertForNode']);
        }

        return _cbk();
      },

      // Get certificate
      getCert: ['validate', ({}, _cbk) => {
        if (node) {
          return _cbk();
        }

        return fs.getFile(certFile, (err, cert) => {
          if (err) {
            return _cbk([503, 'UnexpectedErrorGettingCertFileData', {err}]);
          }

          if (!cert) {
            return _cbk([503, 'LndCertNotFoundInDefaultLocation']);
          }

          return _cbk(null, cert.toString('base64'));
        });
      }],

      // Cert
      cert: ['getCert', ({getCert}, _cbk) => _cbk(null, {cert: getCert})],
    },
    returnResult({reject, resolve, of: 'cert'}, cbk));
  });
};

export { getCert }
