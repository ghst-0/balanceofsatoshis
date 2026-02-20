import asyncAuto from 'async/auto.js';
import asyncRetry from 'async/retry.js';
import { returnResult } from 'asyncjs-util';

const interval = n => 50 * 2 ** n;
const isNumber = n => !Number.isNaN(n);

/** Get mempool size

  {
    network: <Network Name String>
    request: <Request Function>
    [retries]: <Retries Count Number>
  }

  @returns via cbk or Promise
  {
    [vbytes]: <Size of Mempool Virtual Bytes Number>
  }
*/
export default ({network, request, retries}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!network) {
          return cbk([400, 'ExpectedNetworkNameToGetMempoolSize']);
        }

        if (!request) {
          return cbk([400, 'ExpectedRequestMethodToGetMempoolSize']);
        }

        return cbk();
      },

      // API for network
      api: ['validate', ({}, cbk) => {
        switch (network) {
        case 'btc':
          return cbk(null, 'https://blockstream.info');

        case 'btctestnet':
          return cbk(null, 'https://blockstream.info/testnet');

        default:
          return cbk();
        }
      }],

      // Get mempool size
      getMempool: ['api', ({api}, cbk) => {
        if (!api) {
          return cbk(null, {});
        }

        return asyncRetry({interval, times: retries}, cbk => {
          return request({
            json: true,
            url: `${api}/api/mempool`,
          },
          (err, r, mempool) => {
            if (err) {
              return cbk([503, 'FailedToGetMempoolSizeInfo', {err}]);
            }

            if (!mempool) {
              return cbk([503, 'ExpectedMempoolInfoInResponse']);
            }

            if (!isNumber(mempool.vsize)) {
              return cbk([503, 'ExpectedMempoolVirtualByteSize']);
            }

            return cbk(null, {vbytes: mempool.vsize});
          });
        },
        cbk);
      }],
    },
    returnResult({reject, resolve, of: 'getMempool'}, cbk));
  });
};
