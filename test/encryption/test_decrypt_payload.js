import test from 'node:test';
import { equal, throws } from 'node:assert/strict';

import { decryptPayload } from '../../encryption/index.js';
import fixtures from './fixtures.json' with { type: 'json' };

const encrypted = fixtures.encrypted
const secret = fixtures.secret
const {parse} = JSON;

const tests = [
  {
    args: {},
    description: 'An encrypted payload is required',
    error: 'ExpectedEncryptedPayloadToDecrypt',
  },
  {
    args: {encrypted},
    description: 'A secret key is required',
    error: 'ExpectedDecryptionSecretKeyToDecrypt',
  },
  {
    args: {encrypted, secret: 'ff'},
    description: 'A valid secret key is required',
    error: 'FailedToDecryptCipherTextWithSecretKey',
  },
  {
    args: {
      secret,
      encrypted: Buffer.from(encrypted, 'base64').toString('hex'),
    },
    description: 'Payload is decrypted',
    expected: {
      pair: 'BTCUSD',
      price: 4004.14,
      timestamp: '2019-01-10T00:00:11.000Z',
    },
  },
];

for (const { args, description, error, expected } of tests) {
  test(description, (t, end) => {
    if (error) {
      throws(() => decryptPayload(args), new Error(error), 'Got error');
    } else {
      const [{pair, price, timestamp}] = parse(decryptPayload(args).payload);

      equal(pair, expected.pair, 'Got expected pair');
      equal(price, expected.price, 'Got expected price');
      equal(timestamp, expected.timestamp, 'Got expected timestamp');
    }

    return end();
  });
}
