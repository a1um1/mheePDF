import { createHash } from "crypto";

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
  let hash = createHash("md5").update(paddedOwner).digest();

  if (revision >= 3) {
    for (let i = 0; i < 50; i++) {
      hash = createHash("md5").update(hash).digest();
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

  const hashBuilder = createHash("md5");
  hashBuilder.update(paddedUser);
  hashBuilder.update(oValue);
  hashBuilder.update(pBuf);
  hashBuilder.update(documentId);

  let hash = hashBuilder.digest();

  if (revision >= 3) {
    for (let i = 0; i < 50; i++) {
      hash = createHash("md5").update(hash).digest();
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

  const hash = createHash("md5")
    .update(PASSWORD_PADDING)
    .update(documentId)
    .digest();

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

  const hash = createHash("md5").update(concat).digest();
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
