import asyncAuto from 'async/auto.js';
import { returnResult } from 'asyncjs-util';
import { certExpiration, pemAsDer } from './../encryption/index.js';
import lndCredentials from './lnd_credentials.js';

const base64AsString = base64 => Buffer.from(base64, 'base64').toString();
const bufferAsHex = buffer => buffer.toString('hex');
const msPerDay = 1000 * 60 * 60 * 24;
const {round} = Math;

/** Get the number of days a node's cert is still valid

  {
    [below]: <Days Above Watermark Number>
    [logger]: <Winston Logger Object>
    [node]: <Saved Node Name String>
  }

  @returns via cbk or Promise
  {
    days: <Days Valid Number>
  }
*/
export default ({below, logger, node}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Get the cert
      getCredentials: cbk => lndCredentials({logger, node}, cbk),

      // Determine the number of days remaining for the cert to be valid
      certValidity: ['getCredentials', ({getCredentials}, cbk) => {
        const pem = base64AsString(getCredentials.cert);

        const cert = bufferAsHex(pemAsDer({pem}).der);

        const expiryDate = new Date(certExpiration({cert}).expires_at);

        const valid = round((expiryDate - new Date()) / msPerDay);

        const days = !below ? valid : (valid < below ? below - valid : 0);

        return cbk(null, {days: round(days)});
      }],
    },
    returnResult({reject, resolve, of: 'certValidity'}, cbk));
  });
};
