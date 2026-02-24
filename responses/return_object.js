import { getBorderCharacters, table as renderTable } from 'table';

import { writeJsonFile } from './write_json_file.js';

const border = getBorderCharacters('norc');
const emptyCell = ' ';
const {isArray} = Array;
const summary = n => `${n}_summary`;

/** Return an object result to a logger in a promise

  A write method is required if file is passed

  {
    [exit]: <Final Exit Function>
    [file]: <Write Result to JSON At Path String>
    reject: <Reject Function>
    resolve: <Resolve Function>
    [table]: <Show as Table From Result Attribute String>
    [write]: (path, data, (err) => {})
  }

  @returns
  <Standard Callback Function> (err, res) => {}
*/
const returnObject = ({exit, file, reject, resolve, table, write}) => {
  return (err, res) => {
    if (err) {
      console.error({err});

      return reject();
    }

    if (file) {
      return writeJsonFile({file, write, json: res}, err => {
        if (err) {
          return reject(err);
        }

        return resolve();
      });
    }

    // Exit early when the table is empty
    if (!!table && res[table].length === [table].length) {
      const [header] = res[table];

      console.info(renderTable([header, header.map(n => emptyCell)], {border}));

      return resolve();
    }

    // Exit early when a table output is requested
    if (table) {
      console.info(renderTable(res[table], {border}));

      if (isArray(res[summary(table)])) {
        console.info(renderTable(res[summary(table)], {border}));
      }

      return resolve();
    }

    if (typeof res === 'number') {
      console.info(`${res}`);
    } else {
      console.info(res);
    }

    if (exit) {
      exit();
    }

    return resolve();
  };
};

export { returnObject }
