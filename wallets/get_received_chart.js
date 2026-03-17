import asyncAuto from 'async/auto.js';
import asyncFilterLimit from 'async/filterLimit.js';
import asyncMap from 'async/map.js';
import { formatTokens, getAllInvoices } from 'ln-sync';
import { getPayment } from 'ln-service';
import moment from 'moment';
import { returnResult } from 'asyncjs-util';

import { segmentMeasure } from '../display/segment_measure.js';
import { sumsForSegment } from '../display/sums_for_segment.js';

const daysBetween = (a, b) => moment(a).diff(b, 'days') + 1;
const defaultDays = 60;
const flatten = arr => [].concat(...arr);
const {isArray} = Array;
const isDate = n => /^\d{4}(-(0[1-9]|1[0-2]))?(-(0[1-9]|[12][0-9]|3[01]))?$/.test(n);
const maxGetPayments = 100;
const mtokensAsTokens = n => Number(n / BigInt(1e3));
const notFound = 404;
const {now} = Date;
const parseDate = n => Date.parse(n);

/** Get data for received payments chart

  {
    [days]: <Received Over Days Count Number>
    [end_date]: <End Date YYYY-MM-DD String>
    lnds: [<Authenticated LND API Object>]
    [query]: <Match Description String>
    [start_date]: <Start Date YYYY-MM-DD String>
  }

  @returns via cbk or Promise
  {
    data: [<Received Tokens Number>]
    description: <Chart Description String>
    title: <Chart Title String>
  }
*/
const getReceivedChart = (args, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: _cbk => {
        if (!isArray(args.lnds)) {
          return _cbk([400, 'ExpectedLndToGetFeesChart']);
        }

        if (args.lnds.length === 0) {
          return _cbk([400, 'ExpectedAnLndToGetFeesChart']);
        }

        // Exit early when there is no end date and no start date
        if (!args.end_date && !args.start_date) {
          return _cbk();
        }

        if (args.days) {
          return _cbk([400, 'ExpectedEitherDaysOrDatesToGetFeesChart']);
        }

        if (!!args.end_date && !args.start_date) {
          return _cbk([400, 'ExpectedStartDateToRangeToEndDate']);
        }

        if (!isDate(args.start_date)) {
          return _cbk([400, 'ExpectedValidDateTypeForReceivedChartStartDate']);
        }

        if (!moment(args.start_date).isValid()) {
          return _cbk([400, 'ExpectedValidEndDateForReceivedChartEndDate']);
        }

        if (parseDate(args.start_date) > now()) {
          return _cbk([400, 'ExpectedPastStartDateToGetFeesChart']);
        }

        // Exit early when there is no end date
        if (!args.end_date) {
          return _cbk();
        }

        if (args.start_date > args.end_date) {
          return _cbk([400, 'ExpectedStartDateBeforeEndDateToGetFeesChart']);
        }

        if (!isDate(args.end_date)) {
          return _cbk([400, 'ExpectedValidDateFormatToForChartEndDate']);
        }

        if (!moment(args.end_date).isValid()) {
          return _cbk([400, 'ExpectedValidEndDateForReceivedChartEndDate']);
        }

        if (parseDate(args.end_date) > now()) {
          return _cbk([400, 'ExpectedPastEndDateToGetFeesChart']);
        }

        return _cbk();
      },

      // End date for received payments
      end: ['validate', ({}, _cbk) => {
        if (!args.end_date) {
          return _cbk();
        }

        return _cbk(null, moment(args.end_date).endOf('day'));
      }],

      // Segment measure
      segment: ['end', ({end}, _cbk) => {
        // Exit early when not looking at a date range
        if (!args.start_date && !args.end_date) {
          return _cbk(null, segmentMeasure({days: args.days || defaultDays}));
        }

        const days = daysBetween(end, args.start_date);

        return _cbk(null, segmentMeasure({
          days,
          end: end ? end.toISOString() : undefined,
          start: args.start_date,
        }));
      }],

      // Start date for received payments
      start: ['validate', ({}, _cbk) => {
        if (args.start_date) {
          return _cbk(null, moment(args.start_date));
        }

        return _cbk(null, moment().subtract(args.days || defaultDays, 'days'));
      }],

      // Get all the settled invoices using a subscription
      getSettled: ['end', 'start', ({end, start}, _cbk) => {
        return asyncMap(args.lnds, (lnd, __cbk) => {
          return getAllInvoices({
            lnd,
            confirmed_after: start.toISOString(),
            created_after: start.toISOString(),
          },
          __cbk);
        },
        (err, res) => {
          if (err) {
            return _cbk(err);
          }

          const settled = flatten(res.map(n => n.invoices)).filter(invoice => {
            if (!!args.query && !invoice.description.includes(args.query)) {
              return false;
            }

            // Exit early when considering all invoices without an end point
            if (!args.end_date) {
              return true;
            }

            return moment(invoice.confirmed_at).isSameOrBefore(end, 'day');
          });

          return _cbk(null, settled);
        });
      }],

      // Eliminate self-payments by looking for payments with invoice ids
      getReceived: ['getSettled', ({getSettled}, _cbk) => {
        return asyncFilterLimit(getSettled, maxGetPayments, (invoice, __cbk) => {
          return asyncMap(args.lnds, (lnd, ___cbk) => {
            return getPayment({id: invoice.id, lnd}, (err, res) => {
              if (isArray(err) && err.shift() === notFound) {
                return ___cbk(null, false);
              }

              if (err) {
                return ___cbk(err);
              }

              return ___cbk(null, res.payment);
            });
          },
          (err, payments) => {
            if (err) {
              return __cbk(err);
            }

            return __cbk(null, !payments.filter(n => !!n).length);
          });
        },
        _cbk);
      }],

      // Sum all of the invoices received amounts
      totalReceived: ['getReceived', ({getReceived}, _cbk) => {
        const total = getReceived.reduce((sum, invoice) => {
          return sum + BigInt(invoice.received_mtokens);
        },
        BigInt(Number()));

        return _cbk(null, mtokensAsTokens(total));
      }],

      // Earnings aggregated
      sum: ['end', 'getReceived', 'segment', ({end, getReceived, segment}, _cbk) => {
        return _cbk(null, sumsForSegment({
          end: end ? end.toISOString() : undefined,
          measure: segment.measure,
          records: getReceived.map(invoice => {
            return {date: invoice.confirmed_at, tokens: invoice.received};
          }),
          segments: segment.segments,
        }));
      }],

      // Summary description of the received payments
      description: [
        'end',
        'getReceived',
        'segment',
        'start',
        'sum',
        'totalReceived',
        ({end, getReceived, segment, start, totalReceived, sum}, _cbk) =>
      {
        const action = 'Received in';
        const {measure} = segment;
        const since = `from ${start.calendar().toLowerCase()}`;
        const to = end ? ` to ${end.calendar().toLowerCase()}` : '';

        if (args.is_count) {
          const duration = `${action} ${sum.count.length} ${measure}s`;
          const total = `Total: ${getReceived.length} received payments`;

          return _cbk(null, `${duration} ${since}${to}. ${total}`);
        }
        const duration = `${action} ${sum.sum.length} ${measure}s`;
        const total = formatTokens({tokens: totalReceived}).display || '0';

        return _cbk(null, `${duration} ${since}${to}. Total: ${total}`);
      }],

      // Total activity
      data: ['description', 'sum', ({description, sum}, _cbk) => {
        const title = [
          args.is_count ? 'Received' : 'Payments',
          args.query ? `for “${args.query}”` : '',
          args.is_count ? 'count' : 'received',
        ];

        return _cbk(null, {
          description,
          data: args.is_count ? sum.count : sum.sum,
          title: title.filter(n => !!n).join(' '),
        });
      }],
    },
    returnResult({reject, resolve, of: 'data'}, cbk));
  });
};

export { getReceivedChart }
