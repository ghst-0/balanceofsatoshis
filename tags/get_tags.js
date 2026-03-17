import asyncAuto from 'async/auto.js';
import { returnResult } from 'asyncjs-util';

import { homePath } from '../storage/home_path.js';

const defaultTags = {tags: []};
const {isArray} = Array;
const {parse} = JSON;
const tagFilePath = () => homePath({file: 'tags.json'}).path;

/** Get tagged nodes

  {
    fs: {
      getFile: <Get File Function>
    }
  }

  @returns via cbk or Promise
  {
    tags: [{
      alias: <Tag Alias String>
      id: <Tag Id String>
      [is_avoided]: <Avoid Node in Routing Bool>
      nodes: [<Node Public Key Hex String>]
    }]
  }
*/
const getTags = ({fs}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: _cbk => {
        if (!fs) {
          return _cbk([400, 'ExpectedFileSystemMethodsToGetTags']);
        }

        return _cbk();
      },

      // Fetch the tags
      getTags: ['validate', ({}, _cbk) => {
        return fs.getFile(tagFilePath(), (err, res) => {
          // Fail back to no tags when there is an error
          if (err || !res) {
            return _cbk(null, defaultTags);
          }

          try {
            const {tags} = parse(res.toString());

            // Exit early when tags are not well-formed
            if (!isArray(tags) || tags.filter(n => !n).length > 0) {
              return _cbk(null, defaultTags);
            }

            return _cbk(null, {tags});
          } catch {
            return _cbk(null, defaultTags);
          }
        });
      }],
    },
    returnResult({reject, resolve, of: 'getTags'}, cbk));
  });
};

export { getTags }
