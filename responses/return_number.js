/** Return a count result to a logger in a promise

  {
    number: <Number Attribute String>
    reject: <Reject Function>
    resolve: <Resolve Function>
  }

  @returns
  <Standard Callback Function> (err, res) => {}
*/
const returnNumber = ({number, reject, resolve}) => {
  return (err, res) => {
    if (err) {
      console.error(err);

      return reject();
    }

    console.info(`${res[number]}`);

    return resolve();
  };
};

export { returnNumber }

