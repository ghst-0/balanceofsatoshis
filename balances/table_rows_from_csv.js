import asyncAuto from 'async/auto.js';
import { returnResult } from 'asyncjs-util';
import { parse as csvParse } from 'csv-parse'

/** Get rows for table output from CSV

  {
    [csv]: <CSV String>
  }

  @returns via cbk or Promise
  {
    rows: [[<Column String>]]
  }
*/
const tableRowsFromCsv = ({csv}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Get the parse function
      // noinspection ES6RedundantAwait
      parse: async () => await csvParse,

      // Parse CSV
      entries: ['parse', ({parse}, cbk) => {
        if (!csv) {
          return cbk(null, []);
        }

        return parse(csv, (err, entries) => {
          if (err) {
            return cbk([400, 'FailedToParseCsv', {err}]);
          }

          return cbk(null, entries);
        });
      }],

      // Arrange rows
      rows: ['entries', ({entries}, cbk) => {
        if (entries.length === 0) {
          return cbk(null, {rows: [[]]});
        }

        const [header] = entries;

        const datedRecords = entries.slice([header].length).sort((a, b) => {
          if (a[2] > b[2]) {
            return 1;
          }

          if (b[2] > a[2]) {
            return -1;
          }

          return 0;
        });

        const rows = [].concat([header]).concat(datedRecords);

        return cbk(null, {rows});
      }],
    },
    returnResult({reject, resolve, of: 'rows'}, cbk));
  });
};

export { tableRowsFromCsv }
