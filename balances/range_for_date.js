import moment from 'moment';

import constants from './constants.json' with { type: 'json' };

const { monthNumbers, monthOffset, notFoundIndex } = constants;

/** Get a before and after range

  {
    [date]: <Day of Month String>
    [month]: <Month String>
    [year]: <Year String>
  }

  @throws
  <Error>

  @returns
  {
    [after]: <After ISO 8601 Date String>
    [before]: <Before ISO 8601 Date String>
  }
*/
const rangeForDate = ({date, month, year}) => {
  if (!date && !year && !month) {
    return {};
  }

  const after = moment.utc().startOf('year');

  if (year) {
    after.year(year);
  }

  try {
    after.toISOString();
  } catch {
    throw new Error('UnrecognizedFormatForAccountingYear');
  }

  const end = after.clone();

  if (!!month && monthNumbers.indexOf(month) !== notFoundIndex) {
    for (const n of [after, end]) {
      n.month(Number(month) - monthOffset)
    }
  } else if (month) {
    for (const n of [after, end]) {
      n.month(month)
    }
  }

  if (date) {
    for (const n of [after, end]) {
      n.date(date)
    }
  }

  if (date) {
    end.add([date].length, 'day');
  } else if (month) {
    end.add([month].length, 'months');
  } else {
    end.add([after].length, 'years');
  }

  try {
    after.toISOString();
  } catch {
    throw new Error('UnrecognizedFormatForAccountingMonth');
  }

  after.subtract([after].length, 'millisecond');

  return {after: after.toISOString(), before: end.toISOString()};
};

export { rangeForDate }
