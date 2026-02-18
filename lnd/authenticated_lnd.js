import asyncAuto from 'async/auto.js';
import { authenticatedLndGrpc } from 'ln-service';
import { returnResult } from 'asyncjs-util';
import lndCredentials from './lnd_credentials.js';

/** Authenticated LND

  {
    [node]: <Node Name String>
  }

  @returns via cbk or Promise
  {
    lnd: <Authenticated LND gRPC API Object>
  }
*/
export default ({node}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Credentials
      credentials: cbk => lndCredentials({node}, cbk),

      // Lnd
      lnd: ['credentials', ({credentials}, cbk) => {
        return cbk(null, authenticatedLndGrpc({
          cert: credentials.cert,
          macaroon: credentials.macaroon,
          socket: credentials.socket,
        }));
      }],
    },
    returnResult({reject, resolve, of: 'lnd'}, cbk));
  });
};
