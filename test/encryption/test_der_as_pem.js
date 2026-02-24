import test from 'node:test';
import { equal } from 'node:assert/strict';

import { derAsPem } from '../../encryption/der_as_pem.js';

const tests = [
  {
    args: {cert: Buffer.from('6b3V+MpX+++++++ENDCERTIFICATE+++++++', 'base64').toString('hex')},
    description: 'A DER is mapped to a PEM string',
    expected: {pem: '-----BEGIN CERTIFICATE-----\n6b3V+MpX\n-----END CERTIFICATE-----'},
  },
  {
    args: {cert: Buffer.from('6b3V+MpX', 'base64').toString('hex')},
    description: 'A DER is mapped to a PEM string',
    expected: {pem: '-----BEGIN CERTIFICATE-----\n6b3V+MpX\n-----END CERTIFICATE-----'},
  },
  {
    args: {key: Buffer.from('6b3V+MpX', 'base64').toString('hex')},
    description: 'A DER is mapped to a PEM string',
    expected: {pem: '-----BEGIN PUBLIC KEY-----\n6b3V+MpX\n-----END PUBLIC KEY-----'},
  },
];

for (const { args, description, error, expected } of tests) {
  test(description, (t, end) => {
    const {pem} = derAsPem(args);

    equal(pem, expected.pem, 'Got expected pem');

    return end();
  });
}
