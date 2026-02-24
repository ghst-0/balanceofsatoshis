const {stringify} = JSON;
const spacer = '  ';

/** Return an output result to a logger in a promise

  {
    reject: <Reject Function>
    resolve: <Resolve Function>
  }

  @returns
  <Standard Callback Function> (err, res) => {}
*/
const returnJson =  ({reject, resolve}) => {
  return (err, res) => {
    if (err) {
      console.error(err);

      return reject();
    }

    console.info(stringify(res, null, spacer));

    return resolve();
  };
};

export { returnJson }
