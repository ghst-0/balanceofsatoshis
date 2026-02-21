import { join } from 'node:path';
import { readdirSync } from 'node:fs';
import { run } from 'node:test';
import { tap } from 'node:test/reporters';

const concurrency = 3;
const timeout = 1000 * 60 * 5;

const dirs = ['integration'];

const asPath = file => join(file.path || file.parentPath, file.name);
const flatten = arr => [].concat(...arr);

const files = flatten(dirs.map(dir => {
  return readdirSync(join(import.meta.dirname, dir), {withFileTypes: true}).map(asPath);
}));

run({concurrency, files, timeout}).compose(tap).pipe(process.stdout);
