import { homedir, platform, userInfo } from 'node:os';
import { publicEncrypt } from 'node:crypto';
import { readFile } from 'node:fs';
import asyncAuto from 'async/auto.js';
import { authenticatedLndGrpc, grantAccess, restrictMacaroon } from 'ln-service';
import { returnResult } from 'asyncjs-util';

import { homePath } from '../storage/home_path.js';
import { derAsPem } from '../encryption/der_as_pem.js';
import { credentialRestrictions } from './credential_restrictions.js';
import { getCert } from './get_cert.js';
import { getMacaroon } from './get_macaroon.js';
import { getPath } from './get_path.js';
import { getSocket } from './get_socket.js';

const config = 'config.json';
const defaultLndDirPath = process.env.BOS_DEFAULT_LND_PATH;
const defaultNodeName = process.env.BOS_DEFAULT_SAVED_NODE;
const fs = {getFile: readFile};
const os = {homedir, platform, userInfo};
const {parse} = JSON;
const socket = 'localhost:10009';

/** LND credentials

  {
    [expiry]: <Credential Expiration Date ISO 8601 Date String>
    [is_nospend]: <Restrict Credentials To Non-Spending Permissions Bool>
    [is_readonly]: <Restrict Credentials To Read-Only Permissions Bool>
    [key]: <Encrypt to Public Key DER Hex String>
    [methods]: [<Allow Specific Method String>]
    [node]: <Node Name String> // Defaults to default local mainnet node creds
  }

  @returns via cbk or Promise
  {
    cert: <Cert String>
    [encrypted_macaroon]: <Encrypted Macaroon Base64 String>
    [external_socket]: <External RPC Socket String>
    macaroon: <Macaroon String>
    socket: <Socket String>
  }
*/
const lndCredentials = (args, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Figure out which node the credentials are for
      forNode: _cbk => {
        if (args.node) {
          return _cbk(null, args.node);
        }

        if (defaultNodeName) {
          return _cbk(null, defaultNodeName);
        }

        // Look for a config file to see if there is a default node
        const {path} = homePath({file: config});

        return fs.getFile(path, (err, res) => {
          // Exit early on errors, there is no config found
          if (err || !res) {
            return _cbk();
          }

          try {
            parse(res.toString());
          } catch (err) {
            return _cbk([400, 'ConfigurationFileIsInvalidFormat', {err}]);
          }

          const config = parse(res.toString());

          if (config.default_saved_node) {
            return _cbk(null, config.default_saved_node);
          }

          return _cbk();
        });
      },

      // Look for a special path
      getPath: ['forNode', ({forNode}, _cbk) => {
        // Exit early when a specific node is used
        if (forNode) {
          return _cbk(null, {});
        }

        // Exit early when there is a default LND path
        if (defaultLndDirPath) {
          return _cbk(null, {path: defaultLndDirPath});
        }

        return getPath({fs, os}, _cbk);
      }],

      // Get the default cert
      getCert: ['forNode', 'getPath', ({forNode, getPath}, _cbk) => {
        return getCert({fs, os, node: forNode, path: getPath.path}, _cbk);
      }],

      // Get the default macaroon
      getMacaroon: ['forNode', 'getPath', ({forNode, getPath}, _cbk) => {
        return getMacaroon({fs, os, node: forNode, path: getPath.path}, _cbk);
      }],

      // Get the node credentials, if applicable
      getNodeCredentials: ['forNode', ({forNode}, _cbk) => {
        // Disabled
        return _cbk();
      }],

      // Get the socket out of the ini file
      getSocket: ['forNode', 'getPath', ({forNode, getPath}, _cbk) => {
        return getSocket({fs, os, node: forNode, path: getPath.path}, _cbk);
      }],

      // Node credentials
      nodeCredentials: [
        'forNode',
        'getNodeCredentials',
        ({forNode, getNodeCredentials}, _cbk) =>
      {
        if (!forNode) {
          return _cbk();
        }

        if (!getNodeCredentials.credentials) {
          return _cbk([400, 'CredentialsForSpecifiedNodeNotFound']);
        }

        const {credentials} = getNodeCredentials;

        return _cbk(null, {
          cert: credentials.cert,
          macaroon: credentials.macaroon,
          socket: credentials.socket,
        });
      }],

      // Credentials to use
      credentials: [
        'forNode',
        'getCert',
        'getMacaroon',
        'getSocket',
        'nodeCredentials',
        ({forNode, getCert, getMacaroon, getSocket, nodeCredentials}, _cbk) =>
      {
        // Exit early with the default credentials when no node is specified
        if (!forNode) {
          return _cbk(null, {
            cert: getCert.cert,
            macaroon: getMacaroon.macaroon,
            socket: getSocket.socket || socket,
          });
        }

        return _cbk(null, {
          cert: nodeCredentials.cert,
          macaroon: nodeCredentials.macaroon,
          socket: getSocket.socket || nodeCredentials.socket,
        });
      }],

      // Macaroon with restriction
      macaroon: ['credentials', ({credentials}, _cbk) => {
        if (!args.expiry) {
          return _cbk(null, credentials.macaroon);
        }

        const {macaroon} = restrictMacaroon({
          expires_at: args.expiry,
          macaroon: credentials.macaroon,
        });

        return _cbk(null, macaroon);
      }],

      // Get read-only macaroon if necessary
      restrictMacaroon: [
        'credentials',
        'macaroon',
        ({credentials, macaroon}, _cbk) =>
      {
        const {allow} = credentialRestrictions({
          is_nospend: args.is_nospend,
          is_readonly: args.is_readonly,
          methods: args.methods,
        });

        // Exit early when readonly credentials are not requested
        if (!allow) {
          return _cbk(null, {macaroon});
        }

        const {lnd} = authenticatedLndGrpc({
          macaroon,
          cert: credentials.cert,
          socket: credentials.socket,
        });

        return grantAccess({
          lnd,
          methods: allow.methods,
          permissions: allow.permissions,
        },
        _cbk);
      }],

      // Final credentials with encryption applied
      finalCredentials: [
        'credentials',
        'getSocket',
        'restrictMacaroon',
        ({credentials, getSocket, restrictMacaroon}, _cbk) =>
      {
        // Exit early when the credentials are not encrypted
        if (!args.key) {
          return _cbk(null, {
            macaroon: restrictMacaroon.macaroon,
            cert: credentials.cert,
            socket: credentials.socket.trim(),
          });
        }

        const macaroonData = Buffer.from(restrictMacaroon.macaroon, 'base64');
        const {pem} = derAsPem({key: args.key});

        const encrypted = publicEncrypt(pem, macaroonData);

        return _cbk(null, {
          cert: credentials.cert,
          encrypted_macaroon: encrypted.toString('base64'),
          external_socket: getSocket.socket,
          socket: credentials.socket,
        });
      }],
    },
    returnResult({reject, resolve, of: 'finalCredentials'}, cbk));
  });
};

export { lndCredentials }
