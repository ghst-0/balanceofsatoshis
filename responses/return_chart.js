import { plot } from 'asciichart';

const height = 15;
const newLine = '\n';
const padLen = (lineLen, desc) => (Math.max(0, lineLen - desc.length) + 3) / 2;

/** Return an output result to a logger in a promise

  {
    data: <Chart Data Attribute String>
    reject: <Reject Function>
    resolve: <Resolve Function>
  }

  @returns
  <Standard Callback Function> (err, res) => {}
*/
export default ({data, reject, resolve}) => {
  return (err, res) => {
    if (err) {
      console.error({err});

      return reject();
    }

    const chart = plot(res[data], {height});

    const [line] = chart.split(newLine);

    if (res.title) {
      const padding = ' '.repeat(padLen(line.length, res.title));

      console.info(`${newLine}${padding}${res.title}`);
    }

    console.info(String());
    console.info(plot(res[data], {height}));

    if (res.description) {
      const padding = ' '.repeat(padLen(line.length, res.description));

      console.info(`${newLine}${padding}${res.description}`);
    }

    console.info(String());

    return resolve();
  };
};
