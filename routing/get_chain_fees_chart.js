import asyncAuto from 'async/auto.js';
import asyncMap from 'async/map.js';
import { formatTokens, getNetwork } from 'ln-sync';
import { getChainTransactions } from 'ln-accounting';
import moment from 'moment';
import { returnResult } from 'asyncjs-util';

import { feesForSegment } from './fees_for_segment.js';

const daysBetween = (a, b) => moment(a).diff(b, 'days') + 1;
const daysPerWeek = 7;
const defaultDays = 60;
const isDate = n => /^\d{4}(-(0[1-9]|1[0-2]))?(-(0[1-9]|[12][0-9]|3[01]))?$/.test(n);
const flatten = arr => [].concat(...arr);
const {floor} = Math;
const hoursCount = (a, b) => moment(a).diff(b, 'hours') + 1;
const hoursPerDay = 24;
const {isArray} = Array;
const minChartDays = 4;
const maxChartDays = 90;
const {now} = Date;
const parseDate = n => Date.parse(n);

/** Get Blockchain fees paid

  {
    [days]: <Chain Fees Paid Over Days Count Number>
    [end_date]: <End Date YYYY-MM-DD String>
    is_monochrome: <Omit Colors Bool>
    lnds: [<Authenticated LND API Object>]
    request: <Request Function>
    [start_date]: <Start Date YYYY-MM-DD String>
  }

  @returns via cbk or Promise
  {
    data: [<Chain Fee Tokens Number>]
    description: <Chart Description String>
    title: <Chart Title String>
  }
*/
const getChainFeesChart = (args, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: _cbk => {
        if (!isArray(args.lnds) || args.lnds.length === 0) {
          return _cbk([400, 'ExpectedLndToGetChainFeesChart']);
        }

        if (!args.request) {
          return _cbk([400, 'ExpectedRequestFunctionToGetChainFees']);
        }

        // Exit early when there is no end date and no start date
        if (!args.end_date && !args.start_date) {
          return _cbk();
        }

        if (args.days) {
          return _cbk([400, 'ExpectedEitherDaysOrDatesToGetChainFeesChart']);
        }

        if (!!args.end_date && !args.start_date) {
          return _cbk([400, 'ExpectedStartDateToRangeToEndDateForChainChart']);
        }

        if (!isDate(args.start_date)) {
          return _cbk([400, 'ExpectedValidDateTypeForChainFeeChartStartDate']);
        }

        if (!moment(args.start_date).isValid()) {
          return _cbk([400, 'ExpectedValidEndDateForReceivedChartEndDate']);
        }

        if (parseDate(args.start_date) > now()) {
          return _cbk([400, 'ExpectedPastStartDateToGetChainFeesChart']);
        }

        // Exit early when there is no end date
        if (!args.end_date) {
          return _cbk();
        }

        if (args.start_date > args.end_date) {
          return _cbk([400, 'ExpectedStartDateBeforeEndDateForChainFeesChart']);
        }

        if (!isDate(args.end_date)) {
          return _cbk([400, 'ExpectedValidDateFormatForChainFeeChartEndDate']);
        }

        if (!moment(args.end_date).isValid()) {
          return _cbk([400, 'ExpectedValidEndDateForChainFeeChartEndDate']);
        }

        if (parseDate(args.end_date) > now()) {
          return _cbk([400, 'ExpectedPastEndDateToGetChainFeesChart']);
        }

        return _cbk();
      },

      // End date for chain transactions
      end: ['validate', ({}, _cbk) => {
        if (!args.end_date) {
          return _cbk();
        }

        return _cbk(null, moment(args.end_date).endOf('day'));
      }],

      // Calculate the start date
      start: ['validate', ({}, _cbk) => {
        if (args.start_date) {
          return _cbk(null, moment(args.start_date));
        }

        return _cbk(null, moment().subtract(args.days || defaultDays, 'days'));
      }],

      // Determine how many days to chart over
      days: ['validate', ({}, _cbk) => {
        // Exit early when not using a date range
        if (!args.start_date) {
          return _cbk(null, args.days || defaultDays);
        }

        return _cbk(null, daysBetween(args.end_date, args.start_date));
      }],

      // Segment measure
      measure: ['days', ({days}, _cbk) => {
        if (days > maxChartDays) {
          return _cbk(null, 'week');
        } else if (days < minChartDays) {
          return _cbk(null, 'hour');
        }
        return _cbk(null, 'day');
      }],

      // Get chain transactions
      getTransactions: ['start', ({start}, _cbk) => {
        return asyncMap(args.lnds, (lnd, __cbk) => {
          return getNetwork({lnd}, (err, res) => {
            if (err) {
              return __cbk(err);
            }

            return getChainTransactions({
              lnd,
              after: start.toISOString(),
              network: res.network,
              request: args.request,
            },
            __cbk);
          });
        },
        (err, res) => {
          if (err) {
            return _cbk(err);
          }

          return _cbk(null, flatten(res.map(({transactions}) => transactions)));
        });
      }],

      // Total number of segments
      segments: ['days', 'end', 'measure', ({days, end, measure}, _cbk) => {
        switch (measure) {
        case 'hour':
          // Exit early when using full days
          if (!args.start_date) {
            return _cbk(null, hoursPerDay * days);
          }

          return _cbk(null, hoursCount(end, args.start_date));

        case 'week':
          return _cbk(null, floor(days / daysPerWeek));

        default:
          return _cbk(null, days);
        }
      }],

      // Filter the transactions by date
      transactions: [
        'end',
        'getTransactions',
        'start',
        ({end, getTransactions, start}, _cbk) =>
      {
        const transactions = getTransactions.filter(tx => {
          // Exit early when no fee was paid
          if (!tx.is_confirmed || !tx.fee) {
            return false;
          }

          // Exit early when the transaction is before the range start
          if (moment(tx.created_at).isBefore(start)) {
            return false;
          }

          // Exit early when the transaction is after the range end
          if (!!end && moment(tx.created_at).isAfter(end, 'day')) {
            return false;
          }

          return true;
        });

        return _cbk(null, transactions);
      }],

      // Total paid
      total: ['transactions', ({transactions}, _cbk) => {
        const paid = transactions.reduce((sum, {fee}) => sum + fee, Number());

        return _cbk(null, paid);
      }],

      // Payments activity aggregated
      sum: [
        'end',
        'measure',
        'segments',
        'transactions',
        ({end, measure, segments, transactions}, _cbk) =>
      {
        return _cbk(null, feesForSegment({
          measure,
          segments,
          end: end ? end.toISOString() : undefined,
          forwards: transactions,
        }));
      }],

      // Summary description of the chain fees paid
      description: [
        'end',
        'measure',
        'start',
        'sum',
        'total',
        async ({end, measure, start, sum, total}) =>
      {
        const duration = `Chain fees paid in ${sum.fees.length} ${measure}s`;
        const since = `from ${start.calendar().toLowerCase()}`;
        const to = end ? ` to ${end.calendar().toLowerCase()}` : '';

        const {display} = formatTokens({
          is_monochrome: args.is_monochrome,
          tokens: total,
        });

        return `${duration} ${since}${to}. Total: ${display}`;
      }],

      // Fees paid
      data: ['description', 'sum', ({description, sum}, _cbk) => {
        const data = sum.fees;
        const title = 'Chain fees paid';

        return _cbk(null, {data, description, title});
      }],
    },
    returnResult({reject, resolve, of: 'data'}, cbk));
  });
};

export { getChainFeesChart }
