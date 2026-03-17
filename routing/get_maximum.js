import asyncAuto from 'async/auto.js';
import asyncWhilst from 'async/whilst.js';
import { returnResult } from 'asyncjs-util';

/** Get maximum value

  {
    [accuracy]: <Close Enough Delta Number>
    from: <Minimum Number>
    to: <Maximum Number>
  }

  <Async Test Function> ({cursor}, (err, isLow) => {}) => {}

  @returns via cbk or Promise
  {
    maximum: <Maximum Number>
  }
*/
const getMaximum = ({accuracy, from, to}, test, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: _cbk => {
        if (from === undefined) {
          return _cbk([400, 'ExpectedLowerValueToGetMaximum']);
        }

        if (!test) {
          return _cbk([400, 'ExpectedTestFunctionToGetMaximumValue']);
        }

        if (to === undefined) {
          return _cbk([400, 'ExpectedUpperValueToGetMaximum']);
        }

        if (from > to) {
          return _cbk([400, 'ExpectedLowValueLowerThanUpperValueToGetMaximum']);
        }

        return _cbk();
      },

      // Search
      search: ['validate', ({}, _cbk) => {
        let cursor;
        let successes = 0;
        let lowerBound = from;
        let upperBound = to;

        return asyncWhilst(
          __cbk => __cbk(null, lowerBound < upperBound - (accuracy || 0)),
          __cbk => {
            // Set the cursor to the midpoint of the range
            cursor = (lowerBound + upperBound) >>> 1;

            // Find out where the cursor lies in the range
            return test({cursor}, (err, isLow) => {
              if (err) {
                return __cbk(err);
              }

              // Exit early and increase the lower bound when guess is too low
              if (isLow) {
                lowerBound = cursor + 1;
                successes = successes + 1;

                return __cbk();
              }

              upperBound = cursor - 1;

              return __cbk();
            });
          },
          err => {
            if (err) {
              return _cbk(err);
            }

            // Exit early with no result when no guess was too low
            if (!successes) {
              return _cbk(null, {});
            }

            _cbk(null, {maximum: lowerBound})
          }
        );
      }],
    },
    returnResult({reject, resolve, of: 'search'}, cbk));
  });
};

export { getMaximum }
