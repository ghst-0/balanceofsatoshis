/** Return an output result to a logger in a promise

  {
    reject: <Reject Function>
    resolve: <Resolve Function>
  }

  @returns
  <Standard Callback Function> (err, res) => {}
*/
export default ({reject, resolve}) => {
  return (err, res) => {
    if (err) {
      console.error(err);

      return reject();
    }

    console.info(res);

    return resolve();
  };
};
