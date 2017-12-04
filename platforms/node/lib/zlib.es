import zlib from 'zlib';

const deflate = x => zlib.deflateSync(Buffer.from(x));
const inflate = x => zlib.inflateSync(Buffer.from(x));

export { inflate, deflate };
