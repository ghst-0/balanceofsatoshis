import CryptoJS from 'crypto-js';

const takeCipherWords = words => words.slice(4);
const takeIvWords = words => words.slice(0, 4);
const trim = (hex, index) => hex.slice(0, index === 0 ? undefined : index);
const zeroIndex = h => h.split('').slice().reverse().findIndex(n => n !== '0');

/** Decrypt encrypted payload

  {
    encrypted: <Encrypted Data Hex String>
    secret: <Secret Key String>
  }

  @throws
  <Error>

  @returns
  {
    payload: <UTF8 Payload String>
  }
*/
export default ({encrypted, secret}) => {
  if (!encrypted) {
    throw new Error('ExpectedEncryptedPayloadToDecrypt');
  }

  if (!secret) {
    throw new Error('ExpectedDecryptionSecretKeyToDecrypt');
  }

  const [key, payload] = [secret, encrypted].map(CryptoJS.enc.Hex.parse);

  const hex = CryptoJS.lib.WordArray.create(takeCipherWords(payload.words)).toString(CryptoJS.enc.Hex);
  const iv = CryptoJS.lib.WordArray.create(takeIvWords(payload.words));

  const ciphertext = CryptoJS.enc.Hex.parse(trim(hex, hex.length - zeroIndex(hex)));

  try {
    const clear = CryptoJS.AES.decrypt({ciphertext}, key, {iv, padding: CryptoJS.pad.NoPadding, mode: CryptoJS.mode.CFB});

    return {payload: clear.toString(CryptoJS.enc.Utf8)};
  } catch {
    throw new Error('FailedToDecryptCipherTextWithSecretKey');
  }
};
