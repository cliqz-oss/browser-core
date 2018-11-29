import pako from 'pako';

const inflate = pako.inflate.bind(pako);
const deflate = pako.deflate.bind(pako);

export { inflate, deflate };
