import { Buffer } from "buffer";

let nodeCrypto: any = null;
if (typeof window === "undefined") {
  try {
    nodeCrypto = await import(/* @vite-ignore */ "crypto");
  } catch (e) {}
}

/**
 * Pure JavaScript MD5 implementation.
 * Safe for use in the browser, web workers, and Node.js.
 */
export function md5(data: Uint8Array): Buffer {
  const T = [
    -680876936,-389564586,606105819,-1044525330,-176418897,1200080426,-1473231341,-45705983,
    1770035416,-1958414417,-42063,-1990404162,1804603682,-40341101,-1502002290,1236535329,
    -165796510,-1069501632,643717713,-373897302,-701558691,38016083,-660478335,-405537848,
    568446438,-1019803690,-187363961,1163531501,-1444681467,-51403784,1735328473,-1926607734,
    -378558,-2022574463,1839030562,-35309556,-1530992060,1272893353,-155497632,-1094730640,
    681279174,-358537222,-722521979,76029189,-640364487,-421815835,530742520,-995338651,
    -198630844,1126891415,-1416354905,-57434055,1700485571,-1894986606,-1051523,-2054922799,
    1873313359,-30611744,-1560198380,1309151649,-145523070,-1120210379,718787259,-343485551
  ];

  const S = [
    7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,
    5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,
    4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,
    6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21
  ];

  const len = data.length;
  const wordCount = ((len + 8) >> 6) * 16 + 16;
  const words = new Int32Array(wordCount);

  for (let i = 0; i < len; i++) {
    words[i >> 2] |= data[i] << ((i % 4) * 8);
  }
  words[len >> 2] |= 0x80 << ((len % 4) * 8);

  const bitsLow = (len * 8) | 0;
  const bitsHigh = ((len * 8) / 4294967296) | 0;
  words[wordCount - 2] = bitsLow;
  words[wordCount - 1] = bitsHigh;

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < wordCount; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;

    for (let j = 0; j < 64; j++) {
      let f = 0;
      let g = 0;
      if (j < 16) {
        f = (b & c) | (~b & d);
        g = j;
      } else if (j < 32) {
        f = (d & b) | (~d & c);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * j) % 16;
      }

      const temp = d;
      d = c;
      c = b;
      const sum = (a + f + T[j] + words[i + g]) | 0;
      const rol = (sum << S[j]) | (sum >>> (32 - S[j]));
      b = (b + rol) | 0;
      a = temp;
    }

    a = (a + olda) | 0;
    b = (b + oldb) | 0;
    c = (c + oldc) | 0;
    d = (d + oldd) | 0;
  }

  const result = Buffer.alloc(16);
  result.writeInt32LE(a, 0);
  result.writeInt32LE(b, 4);
  result.writeInt32LE(c, 8);
  result.writeInt32LE(d, 12);
  return result;
}

/**
 * Browser-safe random bytes generator. Uses Web Crypto API when available,
 * falls back to Node's crypto, and uses standard Math.random as a last resort.
 */
export function randomBytes(size: number): Buffer {
  const buf = Buffer.alloc(size);
  const cryptoObj = (globalThis as any).crypto || (typeof window !== "undefined" && window.crypto);
  if (cryptoObj && cryptoObj.getRandomValues) {
    cryptoObj.getRandomValues(buf);
  } else if (nodeCrypto && nodeCrypto.randomBytes) {
    return Buffer.from(nodeCrypto.randomBytes(size));
  } else {
    // Fallback pseudo-random generator
    for (let i = 0; i < size; i++) {
      buf[i] = Math.floor(Math.random() * 256);
    }
  }
  return buf;
}

export const PASSWORD_PADDING = Buffer.from([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41,
  0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
  0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80,
  0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

export function rc4(key: Buffer | Uint8Array, data: Buffer | Uint8Array): Buffer {
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    s[i] = i;
  }
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) % 256;
    const temp = s[i];
    s[i] = s[j];
    s[j] = temp;
  }

  const result = Buffer.alloc(data.length);
  let i = 0;
  j = 0;
  for (let k = 0; k < data.length; k++) {
    i = (i + 1) % 256;
    j = (j + s[i]) % 256;
    const temp = s[i];
    s[i] = s[j];
    s[j] = temp;
    const rnd = s[(s[i] + s[j]) % 256];
    result[k] = data[k] ^ rnd;
  }
  return result;
}

export function padPassword(password: string): Buffer {
  const buf = Buffer.alloc(32);
  const pwdBuf = Buffer.from(password, "utf-8");
  if (pwdBuf.length >= 32) {
    pwdBuf.copy(buf, 0, 0, 32);
  } else {
    pwdBuf.copy(buf, 0);
    PASSWORD_PADDING.copy(buf, pwdBuf.length, 0, 32 - pwdBuf.length);
  }
  return buf;
}

export function computeOValue(
  userPass: string,
  ownerPass: string,
  keyLengthBytes: number = 16,
  revision: number = 3,
): Buffer {
  const paddedOwner = padPassword(ownerPass || userPass);
  let hash = md5(paddedOwner);

  if (revision >= 3) {
    for (let i = 0; i < 50; i++) {
      hash = md5(hash);
    }
  }

  const ownerKey = hash.subarray(0, keyLengthBytes);
  let currentVal = padPassword(userPass);

  if (revision === 2) {
    currentVal = rc4(ownerKey, currentVal);
  } else if (revision >= 3) {
    for (let i = 0; i <= 19; i++) {
      const tempKey = Buffer.alloc(keyLengthBytes);
      for (let j = 0; j < keyLengthBytes; j++) {
        tempKey[j] = ownerKey[j] ^ i;
      }
      currentVal = rc4(tempKey, currentVal);
    }
  }
  return currentVal;
}

export function computeEncryptionKey(
  userPass: string,
  oValue: Buffer,
  permissions: number,
  documentId: Buffer,
  keyLengthBytes: number = 16,
  revision: number = 3,
): Buffer {
  const paddedUser = padPassword(userPass);
  const pBuf = Buffer.alloc(4);
  pBuf.writeInt32LE(permissions, 0);

  const concat = Buffer.concat([paddedUser, oValue, pBuf, documentId]);
  let hash = md5(concat);

  if (revision >= 3) {
    for (let i = 0; i < 50; i++) {
      hash = md5(hash);
    }
  }

  return hash.subarray(0, keyLengthBytes);
}

export function computeUValue(
  encryptionKey: Buffer,
  documentId: Buffer,
  keyLengthBytes: number = 16,
  revision: number = 3,
): Buffer {
  if (revision === 2) {
    return rc4(encryptionKey, PASSWORD_PADDING);
  }

  const hash = md5(Buffer.concat([PASSWORD_PADDING, documentId]));
  let currentVal = rc4(encryptionKey, hash);

  for (let i = 1; i <= 19; i++) {
    const tempKey = Buffer.alloc(keyLengthBytes);
    for (let j = 0; j < keyLengthBytes; j++) {
      tempKey[j] = encryptionKey[j] ^ i;
    }
    currentVal = rc4(tempKey, currentVal);
  }

  const result = Buffer.alloc(32);
  currentVal.copy(result, 0);
  return result;
}

export function deriveObjectKey(
  encryptionKey: Buffer,
  id: number,
  generation: number,
  keyLengthBytes: number = 16,
): Buffer {
  const objBuf = Buffer.alloc(5);
  objBuf.writeUInt32LE(id, 0);
  objBuf.writeUInt16LE(generation, 3);

  const concat = Buffer.concat([
    encryptionKey,
    objBuf.subarray(0, 3),
    objBuf.subarray(3, 5),
  ]);

  const hash = md5(concat);
  return hash.subarray(0, Math.min(16, keyLengthBytes + 5));
}

export function formatDateToPDFString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `D:${year}${month}${day}${hours}${minutes}${seconds}Z`;
}
