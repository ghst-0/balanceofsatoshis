/** Get ask function

  {}

  @returns
  <Interrogation Function>
*/
const interrogate = ({}) => {
  return new Promise(async resolve => {
    const inquirer = (await import('inquirer')).default;

    return resolve((n, cbk) => inquirer.prompt([n]).then(res => cbk(res)));
  });
};

export { interrogate }
