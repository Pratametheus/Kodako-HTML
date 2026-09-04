import { Buffer } from 'node:buffer';
import zlib from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SIZE = 1024;
const BACKGROUND = [76, 151, 255]; // #4C97FF
const WHITE = [255, 255, 255];
const YELLOW = [255, 213, 0]; // #FFD500

// favicon rect(x=7,y=9,w=18,h=5) on a 32x32 canvas, scaled x32
const WHITE_RECT = { x: 224, y: 288, w: 576, h: 160 };
// favicon rect(x=7,y=18,w=12,h=5) on a 32x32 canvas, scaled x32
const YELLOW_RECT = { x: 224, y: 576, w: 384, h: 160 };

function insideRect(x, y, rect) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) {
    const byte = buffer[index];
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function buildIhdr() {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(SIZE, 0); // width
  data.writeUInt32BE(SIZE, 4); // height
  data.writeUInt8(8, 8); // bit depth
  data.writeUInt8(2, 9); // colour type: truecolor
  data.writeUInt8(0, 10); // compression
  data.writeUInt8(0, 11); // filter
  data.writeUInt8(0, 12); // interlace
  return data;
}

function buildRawScanlines() {
  const rowBytes = 1 + SIZE * 3;
  const raw = Buffer.alloc(rowBytes * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    const rowStart = y * rowBytes;
    raw[rowStart] = 0x00; // filter type: none
    for (let x = 0; x < SIZE; x += 1) {
      let colour = BACKGROUND;
      if (insideRect(x, y, WHITE_RECT)) colour = WHITE;
      else if (insideRect(x, y, YELLOW_RECT)) colour = YELLOW;
      const pixelStart = rowStart + 1 + x * 3;
      raw[pixelStart] = colour[0];
      raw[pixelStart + 1] = colour[1];
      raw[pixelStart + 2] = colour[2];
    }
  }
  return raw;
}

export function renderIconPng() {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = chunk('IHDR', buildIhdr());
  const idatData = zlib.deflateSync(buildRawScanlines());
  const idat = chunk('IDAT', idatData);
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdr, idat, iend]);
}

async function main() {
  const outputPath = resolve(process.argv[2] ?? 'src-tauri/icon-source.png');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderIconPng());
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
