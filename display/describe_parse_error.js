import constants from './constants.json' with { type: 'json' };

const { parseErrors } = constants;
const defaultError = '#ERROR!';

/** Describe a hot formula parser error

  {
    error: <Error Type String>
  }

  @returns
  <Display String>
*/
export default ({error}) => {
  return parseErrors[error] || parseErrors[defaultError];
};
