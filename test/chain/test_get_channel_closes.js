import test from 'node:test';
import { deepEqual, rejects } from 'node:assert/strict';

import { getChannelCloses } from './../../chain/index.js';
import { getInfoResponse } from './../fixtures/index.js';

const getInfoRes = () => JSON.parse(JSON.stringify(getInfoResponse));

const makeLnd = ({}) => {
  return {
    default: {getInfo: ({}, cbk) => getInfoRes()},
  };
};

const tests = [
  {
    args: {},
    description: 'LND is required',
    error: [400, 'ExpectedLndToGetChannelCloses'],
  },
  {
    args: {lnd: makeLnd({})},
    description: 'Request is required',
    error: [400, 'ExpectedRequestFunctionToGetChannelCloses'],
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (error) {
      await rejects(getChannelCloses(args), error, 'Got expected error');
    } else {
      const closes = await getChannelCloses(args);

      deepEqual(closes, expected, 'Got expected closed channels');
    }
  });
});
