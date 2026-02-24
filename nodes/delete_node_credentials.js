import { join } from 'node:path';
import asyncAuto from 'async/auto.js';
import { returnResult } from 'asyncjs-util';

import { homePath } from '../storage/home_path.js';

const credentialsFileName = 'credentials.json';

/** Delete node credentials

  {
    fs: {
      removeDirectory: <Remove Directory Function>
      removeFile: <Remove File Function>
    }
    node: <Node Name String>
  }

  @returns via cbk or Promise
*/
const deleteNodeCredentials = ({fs, node}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!fs) {
          return cbk([400, 'ExpectedFsMethodsToDeleteNodeCredentials']);
        }

        if (!node) {
          return cbk([400, 'ExpectedNodeNameToDeleteNodeCredentials']);
        }

        return cbk();
      },

      // Remove credentials file
      removeCredentials: ['validate', ({}, cbk) => {
        const path = join(homePath({}).path, node, credentialsFileName);

        return fs.removeFile(path, err => {
          if (err) {
            return cbk([503, 'FailedToRemoveCredentialsFile', {err}]);
          }

          return cbk();
        });
      }],

      // Remove credentials directory
      removeDirectory: ['removeCredentials', ({}, cbk) => {
        return fs.removeDirectory(homePath({file: node}).path, err => {
          if (err) {
            return cbk([503, 'FailedToRemoveCredentialsDirectory', {err}]);
          }

          return cbk();
        });
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};

export { deleteNodeCredentials }
