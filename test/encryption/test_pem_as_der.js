import test from 'node:test';
import { equal } from 'node:assert/strict';

import { pemAsDer } from '../../encryption/pem_as_der.js';

const tests = [
  {
    args: {pem: 'pem\npem\npem'},
    description: 'A PEM is mapped to a DER buffer',
    expected: {der: 'a5e9'},
  },
];

for (const { args, description, error, expected } of tests) {
  test(description, (t, end) => {
    const {der} = pemAsDer(args);

    equal(der.toString('hex'), expected.der, 'Got expected der encoded pem');

    return end();
  });
}
