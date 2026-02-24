import { homedir } from 'node:os';
import { join } from 'node:path';

const home = join(homedir(), '.bos');

/** Get the path of the bos storage directory

  {
    file: <File Name String>
  }

  @returns
  {
    path: <Home Directory Path String>
  }
*/
const homePath = ({file}) => {
  const dir = process.env.BOS_DATA_PATH || home;

  return {path: join(...[dir, file].filter(n => !!n))};
};

export { homePath }
