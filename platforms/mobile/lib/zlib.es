import pako from 'pako';

const inflate = pako.inflate;
const deflate = pako.deflate;

export { inflate, deflate };
