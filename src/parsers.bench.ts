import { bench, describe } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from './index';
import { parseIpuz } from './ipuz';
import { parsePuz } from './puz';
import { parseJpz } from './jpz';
import { parseXd } from './xd';

const testDataDir = join(__dirname, '..', 'testdata');

// Pre-load test data to avoid I/O in benchmarks
const testData = {
  ipuz: {
    small: readFileSync(join(testDataDir, 'ipuz', 'example.ipuz'), 'utf-8'),
    large: readFileSync(join(testDataDir, 'ipuz', 'marching-bands.ipuz'), 'utf-8'),
  },
  puz: {
    av110622: readFileSync(join(testDataDir, 'puz', 'av110622.puz')),
    cs080904: readFileSync(join(testDataDir, 'puz', 'cs080904.puz')),
    diagramless: readFileSync(join(testDataDir, 'puz', 'nyt_diagramless.puz')),
  },
  jpz: {
    fm: readFileSync(join(testDataDir, 'jpz', 'FM.jpz'), 'utf-8'),
  },
  xd: {
    usa: readFileSync(join(testDataDir, 'xd', 'usa2024-05-13.xd'), 'utf-8'),
    cs: readFileSync(join(testDataDir, 'xd', 'cs2007-05-11.xd'), 'utf-8'),
  },
};

describe('iPUZ Parser Performance', () => {
  bench(
    'small iPUZ file (example.ipuz)',
    () => {
      parseIpuz(testData.ipuz.small);
    },
    {
      warmupIterations: 10,
      iterations: 100,
      time: 2000, // Run for 2 seconds
    },
  );

  bench(
    'large iPUZ file (marching-bands.ipuz)',
    () => {
      parseIpuz(testData.ipuz.large);
    },
    {
      warmupIterations: 10,
      iterations: 100,
      time: 2000,
    },
  );
});

describe('PUZ Parser Performance', () => {
  bench(
    'standard PUZ file (av110622.puz)',
    () => {
      parsePuz(testData.puz.av110622);
    },
    {
      warmupIterations: 10,
      iterations: 100,
      time: 2000,
    },
  );

  bench(
    'diagramless PUZ file',
    () => {
      parsePuz(testData.puz.diagramless);
    },
    {
      warmupIterations: 10,
      iterations: 100,
      time: 2000,
    },
  );

  bench(
    'batch PUZ parsing (3 files)',
    () => {
      parsePuz(testData.puz.av110622);
      parsePuz(testData.puz.cs080904);
      parsePuz(testData.puz.diagramless);
    },
    {
      warmupIterations: 5,
      iterations: 50,
      time: 2000,
    },
  );
});

describe('JPZ Parser Performance', () => {
  bench(
    'JPZ XML file (FM.jpz)',
    () => {
      parseJpz(testData.jpz.fm);
    },
    {
      warmupIterations: 10,
      iterations: 100,
      time: 2000,
    },
  );
});

describe('XD Parser Performance', () => {
  bench(
    'XD text file (usa2024-05-13.xd)',
    () => {
      parseXd(testData.xd.usa);
    },
    {
      warmupIterations: 10,
      iterations: 100,
      time: 2000,
    },
  );

  bench(
    'XD text file (cs2007-05-11.xd)',
    () => {
      parseXd(testData.xd.cs);
    },
    {
      warmupIterations: 10,
      iterations: 100,
      time: 2000,
    },
  );
});

describe('Auto-detection Performance', () => {
  bench(
    'auto-detect iPUZ',
    () => {
      parse(testData.ipuz.small);
    },
    {
      warmupIterations: 10,
      iterations: 100,
      time: 2000,
    },
  );

  bench(
    'auto-detect PUZ',
    () => {
      parse(testData.puz.av110622);
    },
    {
      warmupIterations: 10,
      iterations: 100,
      time: 2000,
    },
  );

  bench(
    'auto-detect JPZ',
    () => {
      parse(testData.jpz.fm);
    },
    {
      warmupIterations: 10,
      iterations: 100,
      time: 2000,
    },
  );

  bench(
    'auto-detect XD',
    () => {
      parse(testData.xd.usa);
    },
    {
      warmupIterations: 10,
      iterations: 100,
      time: 2000,
    },
  );
});

describe('Format Hint Performance', () => {
  bench(
    'PUZ without hint',
    () => {
      parse(testData.puz.av110622);
    },
    {
      warmupIterations: 10,
      iterations: 100,
      time: 2000,
    },
  );

  bench(
    'PUZ with filename hint',
    () => {
      parse(testData.puz.av110622, { filename: 'test.puz' });
    },
    {
      warmupIterations: 10,
      iterations: 100,
      time: 2000,
    },
  );
});

describe('Direct vs Auto-detect Comparison', () => {
  describe.each([
    {
      name: 'iPUZ',
      data: testData.ipuz.small,
      directParse: (d: string | Buffer) => parseIpuz(d as string),
    },
    {
      name: 'PUZ',
      data: testData.puz.av110622,
      directParse: (d: string | Buffer) => parsePuz(d as Buffer),
    },
    {
      name: 'JPZ',
      data: testData.jpz.fm,
      directParse: (d: string | Buffer) => parseJpz(d as string),
    },
    {
      name: 'XD',
      data: testData.xd.usa,
      directParse: (d: string | Buffer) => parseXd(d as string),
    },
  ])('$name format', ({ name, data, directParse }) => {
    bench(
      `${name} direct parse`,
      () => {
        directParse(data);
      },
      {
        warmupIterations: 10,
        iterations: 100,
        time: 1000,
      },
    );

    bench(
      `${name} auto-detect parse`,
      () => {
        parse(data);
      },
      {
        warmupIterations: 10,
        iterations: 100,
        time: 1000,
      },
    );
  });
});
