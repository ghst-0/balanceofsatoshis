import asyncAuto from 'async/auto.js';
import { diffieHellmanComputeSecret, getIdentity } from 'ln-service';
import { returnResult } from 'asyncjs-util';
import encryptToSecret from './encrypt_to_secret.js';

/** Encrypt data to a node

  {
    lnd: <Authenticated LND gRPC API Object>
    message: <Message to Encrypt String>
    [to]: <Encrypt to Public Key Hex String>
  }

  @returns via cbk or Promise
  {
    encrypted: <Encrypted Data String>
    to: <Encrypted To Node Hex String>
  }
*/
export default ({lnd, message, to}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd) {
          return cbk([400, 'ExpectedLndToEncryptToNode']);
        }

        if (!message) {
          return cbk([400, 'ExpectedMessageToEncryptToNode']);
        }

        return cbk();
      },

      // Get own public key
      getPublicKey: ['validate', ({}, cbk) => getIdentity({lnd}, cbk)],

      // Encode to public key
      toPublicKey: ['getPublicKey', ({getPublicKey}, cbk) => {
        if (to) {
          return cbk(null, {public_key: to});
        }

        return cbk(null, {public_key: getPublicKey.public_key});
      }],

      // Get the secret
      getSecret: ['toPublicKey', ({toPublicKey}, cbk) => {
        return diffieHellmanComputeSecret({
          lnd,
          partner_public_key: toPublicKey.public_key,
        },
        cbk);
      }],

      // Encrypt to the secret
      encryptToSecret: [
        'getPublicKey',
        'getSecret',
        'toPublicKey',
        ({getPublicKey, getSecret, toPublicKey}, cbk) =>
      {
        return encryptToSecret({
          encoding: 'utf8',
          from: getPublicKey.public_key,
          plain: Buffer.from(message, 'utf8').toString('hex'),
          secret: getSecret.secret,
          to: toPublicKey.public_key,
        },
        cbk);
      }],

      // Encrypted
      encrypted: [
        'encryptToSecret',
        'toPublicKey',
        ({encryptToSecret, toPublicKey}, cbk) =>
      {
        return cbk(null, {
          encrypted: encryptToSecret.cipher,
          to: toPublicKey.public_key,
        });
      }],
    },
    returnResult({reject, resolve, of: 'encrypted'}, cbk));
  });
};
