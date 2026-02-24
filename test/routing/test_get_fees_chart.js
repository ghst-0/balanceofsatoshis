import test from 'node:test';
import { equal, rejects } from 'node:assert/strict';

import chanInfoResponse from '../fixtures/chan_info_response.json' with { type: 'json' };
import getNodeInfoResponse from '../fixtures/get_node_info_response.json' with { type: 'json' };
import versionInfoResponse from '../fixtures/version_info_response.json' with { type: 'json' };
import { getFeesChart } from '../../routing/get_fees_chart.js';

const fs = {getFile: ({}, cbk) => cbk('err')};

const lnds = [{
  default: {
    closedChannels: ({}, cbk) => cbk(null, {channels: []}),
    forwardingHistory: ({}, cbk) => cbk(null, {
      forwarding_events: [],
      last_offset_index: '0',
    }),
    getChanInfo: ({}, cbk) => cbk(null, chanInfoResponse),
    getNodeInfo: ({}, cbk) => cbk(null, getNodeInfoResponse),
    listChannels: ({}, cbk) => cbk(null, {channels: []}),
  },
  version: {
    getVersion: ({}, cbk) => cbk(null, versionInfoResponse),
  }
}];

const tests = [
  {
    args: {fs, days: 1},
    description: 'LND is required to get fees chart',
    error: [400, 'ExpectedLndToGetFeesChart'],
  },
  {
    args: {fs, lnds, days: 1},
    description: 'Fee earnings chart data is returned',
    expected: {
      data: '0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0',
      title: 'Routing fees earned',
    },
  },
  {
    args: {
      fs,
      days: 100,
      lnds: [{
        default: {
          closedChannels: ({}, cbk) => cbk(null, {channels: []}),
          forwardingHistory: ({}, cbk) => cbk(null, {
            forwarding_events: [],
            last_offset_index: '0',
          }),
          getNodeInfo: ({}, cbk) => {
            return cbk(null, {
              channels: [],
              node: {
                addresses: [],
                alias: '',
                color: '#000000',
                features: {},
                last_update: '1',
                pub_key: Buffer.alloc(33).toString('hex'),
              },
              num_channels: 1,
              total_capacity: '1',
            });
          },
          listChannels: ({}, cbk) => cbk(null, {channels: []}),
        },
        version: {
          getVersion: ({}, cbk) => cbk(null, versionInfoResponse),
        },
      }],
      via: Buffer.alloc(33).toString('hex'),
    },
    description: 'No alias uses pubkey instead',
    expected: {
      data: '0,0,0,0,0,0,0,0,0,0,0,0,0,0',
      title: 'Routing fees earned via 000000000000000000000000000000000000000000000000000000000000000000',
    },
  },
  {
    args: {fs, lnds, days: 7},
    description: 'Fee earnings chart data over a week is returned',
    expected: {data: '0,0,0,0,0,0,0', title: 'Routing fees earned'},
  },
  {
    args: {fs, lnds, days: 100, via: Buffer.alloc(33).toString('hex')},
    description: 'Fee earnings chart data via a peer is returned',
    expected: {
      data: '0,0,0,0,0,0,0,0,0,0,0,0,0,0',
      title: 'Routing fees earned via alias',
    },
  },
];

for (let i = 0; i < tests.length; i++){
  const { args, description, error, expected } = tests[i]
  test(description, async () => {
    console.log('i: ', i)
    if (error) {
      await rejects(getFeesChart(args), error, 'Got expected error');
      console.log('Got expected error')
    } else {
      const { data, description, title } = await getFeesChart(args);

      equal(data.join(','), expected.data, 'Got expected fees');
      console.log('Got expected fees')
      equal(!!description, true, 'Got description');
      console.log('Got description')
      equal(title, expected.title, 'Got expected title');
      console.log('Got expected title')
    }
  })
}
