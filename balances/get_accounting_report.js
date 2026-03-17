import asyncAuto from 'async/auto.js';
import { getAccountingReport as ln_getAccountingReport } from 'ln-accounting';
import { getNetwork as ln_getNetwork } from 'ln-sync';
import { returnResult } from 'asyncjs-util';

import { rangeForDate } from './range_for_date.js';
import { tableRowsFromCsv } from './table_rows_from_csv.js';
import categories from './accounting_categories.json' with { type: 'json' };
import constants from './constants.json' with { type: 'json' };

const { defaultCurrency, defaultFiat } = constants;
const assetType = 'BTC';
const currentDate = new Date().toISOString();
const empty = '';
const round = n => Number.parseFloat(n).toFixed(2);
const sumOf = arr => arr.reduce((sum, n) => sum + n, 0);
const summaryHeadings = ['Total', 'Asset', 'Report Date', 'Total Fiat'];

/** Get an accounting report

  {
    category: <Accounting Category Type String>
    [currency]: <Currency Label String>
    [date]: <Day of Month String>
    [fiat]: <Fiat Type String>
    [is_csv]: <Return CSV Output Bool>
    [is_fiat_disabled]: <Omit Fiat Conversion Bool>
    lnd: <Authenticated LND API Object>
    [month]: <Month for Report String>
    [node]: <Node Name String>
    [rate_provider]: <Rate Provider String>
    request: <Request Function>
    [year]: <Year for Report String>
  }

  @returns via cbk or Promise
  {
    [rows]: [[<Column String>]]
    [rows_summary]: [[<Column String>]]
  }
*/
const getAccountingReport = (args, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Validate
      validate: _cbk => {
        if (!args.category || !categories[args.category]) {
          return _cbk([400, 'ExpectedKnownAccountingRecordsCategory']);
        }

        if (!!args.date && !args.month) {
          return _cbk([400, 'ExpectedMonthForDateToGetAccountingReport']);
        }

        if (!args.lnd) {
          return _cbk([400, 'ExpectedAuthenticatedLndToGetAccountingReport']);
        }

        if (!args.request) {
          return _cbk([400, 'ExpectedRequestFunctionToGetAccountingReport']);
        }

        return _cbk();
      },

      // Get date range
      dateRange: ['validate', ({}, _cbk) => {
        try {
          return _cbk(null, rangeForDate({
            date: args.date,
            month: args.month,
            year: args.year,
          }));
        } catch (err) {
          return _cbk([400, err.message]);
        }
      }],

      // Get the network name
      getNetwork: ['validate', ({}, _cbk) => ln_getNetwork({lnd: args.lnd}, _cbk)],

      // Get accounting info
      getAccounting: [
        'dateRange',
        'getNetwork',
        ({dateRange, getNetwork}, _cbk) =>
      {
        return ln_getAccountingReport({
          after: dateRange.after,
          before: dateRange.before,
          category: categories[args.category],
          currency: args.currency || defaultCurrency,
          fiat: args.is_fiat_disabled ? null : (args.fiat || defaultFiat),
          lnd: args.lnd,
          network: getNetwork.network,
          rate_provider: args.rate_provider || undefined,
          request: args.request,
        },
        _cbk);
      }],

      // Convert the accounting CSV into rows for table display output
      accounting: ['getAccounting', ({getAccounting}, _cbk) => {
        const csvType = `${categories[args.category]}_csv`;

        // Exit early when a CSV dump is requested
        if (args.is_csv) {
          return _cbk(null, getAccounting[csvType]);
        }

        return tableRowsFromCsv({csv: getAccounting[csvType]}, _cbk);
      }],

      // Calculate total amounts
      total: ['getAccounting', ({getAccounting}, _cbk) => {
        // Exit early when a CSV dump is requested
        if (args.is_csv) {
          return _cbk();
        }

        const rows = getAccounting[categories[args.category]];

        // Token values are represented as amounts
        const tokens = sumOf(rows.map(n => n.amount));

        // Exit early when there is no fiat data
        if (args.is_fiat_disabled) {
          return _cbk(null, {tokens, fiat: empty});
        }

        // Fiat values are represented as fiat amounts
        const fiat = round(sumOf(rows.map(n => n.fiat_amount)));

        return _cbk(null, {fiat, tokens});
      }],

      // Clean rows for display if necessary
      report: ['accounting', 'total',({accounting, total}, _cbk) => {
        // Exit early when there is no cleaning necessary
        if (args.is_csv) {
          return _cbk(null, accounting);
        }

        const [header] = accounting.rows;

        const fiatIndex = header.findIndex(row => row === 'Fiat Amount');

        const rows = accounting.rows.map((row, i) => {
          return row.map((col, j) => {
            if (!i) {
              return col;
            }

            if (j === fiatIndex && !!col) {
              return round(col);
            }

            return col.slice(0, 32);
          });
        });

        const summary = [
          summaryHeadings,
          [total.tokens, assetType, currentDate, total.fiat],
        ];

        return _cbk(null, {rows, rows_summary: summary});
      }],
    },
    returnResult({reject, resolve, of: 'report'}, cbk));
  });
};

export { getAccountingReport }
