import test from 'node:test';
import { equal, rejects } from 'node:assert/strict';

import { encryptToPublicKeys } from '../../encryption/encrypt_to_public_keys.js';

const makeSpawn = args => {
  return () => {
    return {
      stdout: {on: (event, cbk) => {
        if (!!args.is_error && event === 'error') {
          return cbk('err');
        }

        if (!args.is_error && event === 'data') {
          return cbk(Buffer.from('cipher'));
        }

        if (!args.is_error && event === 'end') {
          return cbk();
        }
      }},
      stdin: {end: () => {}, setEncoding: () => {}, write: () => {}},
    };
  };
};

const tests = [
  {
    args: {},
    description: 'A plain text to encrypt required',
    error: [400, 'ExpectedPlainTextToEncrypt'],
  },
  {
    args: {plain: 'plain'},
    description: 'A spawn function to encrypt required',
    error: [400, 'ExpectedSpawnFunctionToEncryptToPublicKeys'],
  },
  {
    args: {plain: 'plain', spawn: makeSpawn({})},
    description: 'A set of recipients to encrypt to required',
    error: [400, 'ExpectedRecipientOfEncryptedData'],
  },
  {
    args: {plain: 'plain', spawn: makeSpawn({}), to: []},
    description: 'A recipient to encrypt to required',
    error: [400, 'ExpectedRecipientOfEncryptedData'],
  },
  {
    args: {plain: 'plain', spawn: makeSpawn({is_error: true}), to: ['to']},
    description: 'Encryption error passed back',
    error: [503, 'EncryptingErr', {err: 'err'}],
  },
  {
    args: {plain: 'plain', spawn: makeSpawn({}), to: ['to']},
    description: 'Cipher text is returned from plain text',
    expected: {cipher: 'cipher'},
  },
];

for (const { args, description, error, expected } of tests) {
  test(description, async () => {
    if (error) {
      await rejects(encryptToPublicKeys(args), error, 'Got expected error');
    } else {
      const {cipher} = await encryptToPublicKeys(args);

      equal(cipher, expected.cipher, 'Got expected cipher output');
    }
  });
}
