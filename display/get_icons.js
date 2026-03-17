import asyncAuto from 'async/auto.js';
import { returnResult } from 'asyncjs-util';

import { homePath } from '../storage/home_path.js';

const flatten = arr => [].concat(...arr);
const {isArray} = Array;
const {parse} = JSON;
const tagFilePath = () => homePath({file: 'tags.json'}).path;
const uniq = arr => Array.from(new Set(arr));

/** Get icons for public keys from tags

  {
    fs: {
      getFile: <Read File Contents Function> (path, cbk) => {}
    }
  }

  @returns via cbk or Promise
  {
    nodes: [{
      aliases: [<Alias String>]
      icons: [<Icon String>]
      public_key: <Public Key Hex String>
    }]
  }
*/
const getIcons = ({fs}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: _cbk => {
        if (!fs) {
          return _cbk([400, 'ExpectedFileSystemMethodsToGetIconsForNodes']);
        }

        return _cbk();
      },

      // Get icons from the tags file
      getIcons: ['validate', ({}, _cbk) => {
        return fs.getFile(tagFilePath(), (err, res) => {
          // Exit early when there is no tag file
          if (err || !res) {
            return _cbk(null, {nodes: []});
          }

          try {
            const file = parse(res.toString());

            const keys = uniq(flatten(file.tags.map(n => n.nodes)));

            const nodes = keys.map(key => {
              // Only tags this node is included in
              const meta = file.tags.filter(tag => {
                return isArray(tag.nodes) && tag.nodes.includes(key);
              });

              return {
                aliases: uniq(meta.map(n => n.alias)),
                icons: uniq(meta.map(n => n.icon)),
                public_key: key,
              };
            });

            return _cbk(null, {nodes});
          } catch {
            return _cbk(null, {nodes: []});
          }
        });
      }],
    },
    returnResult({reject, resolve, of: 'getIcons'}, cbk));
  });
};

export { getIcons }
