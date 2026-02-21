import test from 'node:test';
import { rejects } from 'node:assert/strict';

import cbor from 'cbor';

import registerNode from '../../nodes/register_node.js';

const { encode } = cbor;
const tests = [
  {
    args: {},
    description: 'Expected ask function',
    error: [400, 'ExpectedAskFunctionToRegisterSavedNode'],
  },
  {
    args: {ask: () => {}},
    description: 'Expected cryptography methods',
    error: [400, 'ExpectedCryptographyFunctionsToRegisterNode'],
  },
  {
    args: {ask: () => {}, cryptography: {}},
    description: 'Expected file system methods',
    error: [400, 'ExpectedFileSystemMethodsToRegisterSavedNode'],
  },
  {
    args: {
      ask: ({}, cbk) => cbk({}),
      cryptography: {},
      fs: {makeDirectory: (path, cbk) => cbk()},
    },
    description: 'Start acknowledgement is required',
    error: [400, 'CanceledNodeRegistration'],
  },
  {
    args: {
      ask: ({}, cbk) => cbk({start: true}),
      cryptography: {generateKeyPair: ({}, {}, cbk) => cbk('err')},
      fs: {makeDirectory: (path, cbk) => cbk()},
    },
    description: 'Key generation errors are passed back',
    error: [503, 'FailedToGenerateCredentialsKey', {err: 'err'}],
  },
  {
    args: {
      ask: ({}, cbk) => cbk({start: true}),
      cryptography: {generateKeyPair: ({}, {}, cbk) => cbk(null, '1', '2')},
      fs: {makeDirectory: (path, cbk) => cbk()},
    },
    description: 'Copy acknowledgement is required',
    error: [400, 'CanceledNodeRegistration'],
  },
  {
    args: {
      ask: ({}, cbk) => cbk({copied: true, start: true}),
      cryptography: {generateKeyPair: ({}, {}, cbk) => cbk(null, '1', '2')},
      fs: {makeDirectory: (path, cbk) => cbk()},
    },
    description: 'Credentials entry is required',
    error: [400, 'ExpectedCredentialsForRemoteNode'],
  },
  {
    args: {
      ask: ({}, cbk) => cbk({
        copied: true,
        credentials: '888888888888888888888888',
        start: true,
      }),
      cryptography: {generateKeyPair: ({}, {}, cbk) => cbk(null, '1', '2')},
      fs: {makeDirectory: (path, cbk) => cbk()},
    },
    description: 'Valid CBOR encoding required',
    error: [400, 'ExpectedValidEncodedCredentials'],
  },
  {
    args: {
      ask: ({}, cbk) => cbk({
        copied: true,
        credentials: encode({}),
        start: true,
      }),
      cryptography: {generateKeyPair: ({}, {}, cbk) => cbk(null, '1', '2')},
      fs: {makeDirectory: (path, cbk) => cbk()}
    },
    description: 'Credentials requires TLS cert',
    error: [400, 'ExpectedTlsCertInCredentials'],
  },
  {
    args: {
      ask: ({}, cbk) => cbk({
        copied: true,
        credentials: encode({cert: 'cert'}),
        start: true,
      }),
      cryptography: {generateKeyPair: ({}, {}, cbk) => cbk(null, '1', '2')},
      fs: {makeDirectory: (path, cbk) => cbk()},
    },
    description: 'Encrypted macaroon required',
    error: [400, 'ExpectedEncryptedMacaroonInCredentials'],
  },
  {
    args: {
      ask: ({}, cbk) => cbk({
        copied: true,
        credentials: encode({
          cert: 'cert',
          encrypted_macaroon: 'macaroon',
          socket: '::::::::',
        }),
        start: true,
      }),
      cryptography: {generateKeyPair: ({}, {}, cbk) => cbk(null, '1', '2')},
      fs: {makeDirectory: (path, cbk) => cbk()},
    },
    description: 'Standard socket type required',
    error: [400, 'ExpectedStandardSocketInCredentials'],
  },
  {
    args: {
      ask: ({}, cbk) => cbk({
        copied: true,
        credentials: encode({
          cert: 'cert',
          encrypted_macaroon: 'macaroon',
          socket: 'localhost:10009',
        }),
        start: true,
      }),
      cryptography: {
        generateKeyPair: ({}, {}, cbk) => cbk(null, '1', '2'),
        privateDecrypt: ({}, {}) => {
          throw new Error('err');
        },
      },
      fs: {makeDirectory: (path, cbk) => cbk()},
    },
    description: 'Valid encrypted macaroon required',
    error: [400, 'FailedToDecryptNodeMacaroon'],
  },
  {
    args: {
      ask: ({}, cbk) => cbk({
        copied: true,
        credentials: encode({
          cert: 'cert',
          encrypted_macaroon: 'macaroon',
        }),
        start: true,
      }),
      cryptography: {
        generateKeyPair: ({}, {}, cbk) => cbk(null, '1', '2'),
        privateDecrypt: ({}, {}) => 'macaroon',
      },
      fs: {makeDirectory: (path, cbk) => cbk()},
    },
    description: 'Valid host required',
    error: [400, 'ExpectedHostForNodeCredentials'],
  },
  {
    args: {
      ask: ({}, cbk) => cbk({
        copied: true,
        credentials: encode({
          cert: 'cert',
          encrypted_macaroon: 'macaroon',
        }),
        host: 'localhost',
        start: true,
      }),
      cryptography: {
        generateKeyPair: ({}, {}, cbk) => cbk(null, '1', '2'),
        privateDecrypt: ({}, {}) => 'macaroon',
      },
      fs: {makeDirectory: (path, cbk) => cbk()},
    },
    description: 'Valid port required',
    error: [400, 'ExpectedPortForNodeCredentials'],
  },
  {
    args: {
      ask: ({}, cbk) => cbk({
        copied: true,
        credentials: encode({
          cert: 'cert',
          encrypted_macaroon: 'macaroon',
        }),
        host: 'localhost',
        port: 10009,
        start: true,
      }),
      cryptography: {
        generateKeyPair: ({}, {}, cbk) => cbk(null, '1', '2'),
        privateDecrypt: ({}, {}) => 'macaroon',
      },
      fs: {makeDirectory: (path, cbk) => cbk()},
    },
    description: 'Node registration confirmation required',
    error: [400, 'CanceledNodeRegistration'],
  },
  {
    args: {
      ask: ({}, cbk) => cbk({
        copied: true,
        credentials: encode({
          cert: 'cert',
          encrypted_macaroon: 'macaroon',
        }),
        host: 'host',
        moniker: 'moniker',
        port: 10009,
        start: true,
      }),
      cryptography: {
        generateKeyPair: ({}, {}, cbk) => cbk(null, '1', '2'),
        privateDecrypt: ({}, {}) => 'macaroon',
      },
      fs: {
        makeDirectory: (path, cbk) => cbk(),
        writeFile: (path, file, cbk) => cbk(),
      },
    },
    description: 'Node registration ok',
  },
  {
    args: {
      ask: ({}, cbk) => cbk({
        copied: true,
        credentials: encode({
          cert: 'cert',
          encrypted_macaroon: 'macaroon',
        }),
        host: 'host',
        moniker: 'moniker',
        port: 10009,
        start: true,
      }),
      cryptography: {
        generateKeyPair: ({}, {}, cbk) => cbk(null, '1', '2'),
        privateDecrypt: ({}, {}) => 'macaroon',
      },
      fs: {
        makeDirectory: (path, cbk) => cbk(),
        writeFile: (path, file, cbk) => cbk(),
      },
      node: 'node',
    },
    description: 'Node registration ok when node name is specified',
  },
  {
    args: {
      ask: ({}, cbk) => cbk({
        copied: true,
        credentials: encode({
          cert: 'cert',
          encrypted_macaroon: 'macaroon',
          socket: 'localhost',
        }),
        host: 'host',
        moniker: 'moniker',
        port: 10009,
        start: true,
      }),
      cryptography: {
        generateKeyPair: ({}, {}, cbk) => cbk(null, '1', '2'),
        privateDecrypt: ({}, {}) => 'macaroon',
      },
      fs: {
        makeDirectory: (path, cbk) => cbk(),
        writeFile: (path, file, cbk) => cbk(),
      },
      node: 'node',
    },
    description: 'When no port is specified, default port is used',
  },
  {
    args: {
      ask: ({}, cbk) => cbk({
        copied: true,
        credentials: encode({
          cert: 'cert',
          encrypted_macaroon: 'macaroon',
        }),
        host: 'host',
        moniker: '/////.....///::://',
        port: 10009,
        start: true,
      }),
      cryptography: {
        generateKeyPair: ({}, {}, cbk) => cbk(null, '1', '2'),
        privateDecrypt: ({}, {}) => 'macaroon',
      },
      fs: {
        makeDirectory: (path, cbk) => cbk(),
        writeFile: (path, file, cbk) => cbk(),
      },
    },
    description: 'Valid directory name required for node',
    error: [400, 'InvalidNameForNode'],
  },
];

for (const { args, description, error, expected } of tests) {
  test(description, async () => {
    if (error) {
      await rejects(registerNode(args), error, 'Got expected error');
    } else {
      await registerNode(args);
    }
  });
}
