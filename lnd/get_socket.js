import { URL } from 'node:url';
import asyncAuto from 'async/auto.js';
import { parse } from 'ini';
import { returnResult } from 'asyncjs-util';

const applicationOptions = 'Application Options';
// TODO: Remove reliance on the lnd.conf file, hardcoded for now
const confFile = '/opt/lnd/lnd.conf';
const isOnion = socket => /^[^\s]+\.onion/.test(socket.split(':').shift());
const {keys} = Object;
const scheme = 'rpc://';

/** Get RPC socket for a node

  {
    fs: {
      getFile: <Get Filesystem File Function> (path, cbk) => {}
    }
    [node]: <Saved Node Name String>
    os: {
      homedir: <Home Directory Function> () => <Home Directory Path String>
      platform: <Platform Function> () => <Platform Name String>
      userInfo: <User Info Function> () => {username: <User Name String>}
    }
    [path]: <Lnd Data Directory Path String>
  }

  @returns via cbk or Promise
  {
    [socket]: <RPC Socket String>
  }
*/
const getSocket = ({fs, node, os, path}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: _cbk => {
        if (!fs) {
          return _cbk([400, 'ExpectedFilesystemMethodsToGetSocketInfoForNode']);
        }

        if (!os) {
          return _cbk([400, 'ExpectedOperatingSystemMethodsToGetNodeSocket']);
        }

        return _cbk();
      },

      // Get configuration file
      getConfFile: ['validate', ({}, _cbk) => {
        // Exit early when a saved node is specified
        if (node) {
          return _cbk();
        }

        return fs.getFile(confFile, (err, conf) => {
          // Don't report errors, the conf file is either there or not
          return _cbk(null, conf);
        });
      }],

      // Parse configuration file
      parseConf: ['getConfFile', ({getConfFile}, _cbk) => {
        // Exit early when there is nothing to parse
        if (!getConfFile) {
          return _cbk();
        }

        try {
          const conf = parse(getConfFile.toString());

          if (keys(conf).length === 0) {
            throw new Error('ExpectedConfigurationInfoFromConfigFile');
          }

          return _cbk(null, conf);
        } catch {
          // Ignore errors in configuration parsing
          return _cbk();
        }
      }],

      // Derive the RPC host
      deriveHost: ['parseConf', ({parseConf}, _cbk) => {
        // Exit early when there is no conf settings
        if (!parseConf) {
          return _cbk();
        }

        const {tlsextradomain} = parseConf[applicationOptions] || {};

        if (!tlsextradomain) {
          return _cbk();
        }

        if (isOnion(tlsextradomain)) {
          return _cbk();
        }

        return _cbk(null, tlsextradomain);
      }],

      // Derive the RPC socket from the configuration settings
      deriveSocket: [
        'deriveHost',
        'parseConf',
        ({deriveHost, parseConf}, _cbk) =>
      {
        // Exit early when there is no conf settings or TLS host
        if (!deriveHost || !parseConf) {
          return _cbk();
        }

        const url = `${scheme}${parseConf[applicationOptions].rpclisten}`;

        try {
          const {port} = new URL(url);

          if (!port) {
            throw new Error('FailedToDerivePortFromApplicationOptions');
          }

          return _cbk(null, `${deriveHost}:${port}`);
        } catch {
          // Ignore errors
          return _cbk();
        }
      }],

      // Socket
      socket: ['deriveSocket', ({deriveSocket}, _cbk) => {
        return _cbk(null, {socket: deriveSocket});
      }],
    },
    returnResult({reject, resolve, of: 'socket'}, cbk));
  });
};

export { getSocket }
