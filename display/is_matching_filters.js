import { Parser } from 'hot-formula-parser';

import { describeParseError } from './describe_parse_error.js';

const {assign} = Object;
const defaultVariables = {btc: 1e8, k: 1e3, m: 1e6, mm: 1e6};
const {keys} = Object;

/** Determine if variables are consistent with filters

  {
    filters: [<Filter Expression String>]
    variables: [{
      <Variable Name String>: <Variable Value Number>
    }]
  }

  @returns
  {
    [failure]: {
      error: <Error String>
      formula: <Errored Formula String>
    }
    [is_matching]: <Variables Are Consistent With Filters Bool>
  }
*/
const isMatchingFilters = ({filters, variables}) => {
  // Exit early when there is nothing to match on
  if (filters.length === 0) {
    return {is_matching: true};
  }

  const vars = {};

  for (const n of [defaultVariables, variables]) {
    assign(vars, n)
  }

  const filtered = filters.map(formula => {
    const parser = new Parser();

    for (const key of keys(vars)) {
      parser.setVariable(key.toLowerCase(), vars[key]);
      parser.setVariable(key.toUpperCase(), vars[key]);
    }

    const parsed = parser.parse(formula);

    if (parsed.error) {
      return {formula, error: describeParseError({error: parsed.error})};
    }

    return parsed.result === false;
  });

  const [errored] = filtered.filter(n => !!n.error);

  // Exit early when a filter resulted in an error
  if (errored && errored.error) {
    return {failure: {error: errored.error, formula: errored.formula}};
  }

  // Exit early when there is a filter hit
  if (filtered.some(n => n !== false)) {
    return {is_matching: false};
  }

  return {is_matching: true};
};

export { isMatchingFilters }
