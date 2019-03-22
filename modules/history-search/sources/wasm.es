/* eslint-disable */
// Auto-Generated code

let wasm;

const lTextEncoder = typeof TextEncoder === 'undefined' ? require('util').TextEncoder : TextEncoder;

let cachedTextEncoder = new lTextEncoder('utf-8');

let cachegetUint8Memory = null;
function getUint8Memory() {
    if (cachegetUint8Memory === null || cachegetUint8Memory.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory;
}

let WASM_VECTOR_LEN = 0;

function passStringToWasm(arg) {

    const buf = cachedTextEncoder.encode(arg);
    const ptr = wasm.__wbindgen_malloc(buf.length);
    getUint8Memory().set(buf, ptr);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
}
/**
* @param {string} arg0
* @param {string} arg1
* @param {number} arg2
* @param {string} arg3
* @param {boolean} arg4
* @param {number} arg5
* @returns {void}
*/
export function add_history_item(arg0, arg1, arg2, arg3, arg4, arg5) {
    const ptr0 = passStringToWasm(arg0);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm(arg1);
    const len1 = WASM_VECTOR_LEN;
    const ptr3 = passStringToWasm(arg3);
    const len3 = WASM_VECTOR_LEN;
    try {
        return wasm.add_history_item(ptr0, len0, ptr1, len1, arg2, ptr3, len3, arg4, arg5);

    } finally {
        wasm.__wbindgen_free(ptr0, len0 * 1);
        wasm.__wbindgen_free(ptr1, len1 * 1);
        wasm.__wbindgen_free(ptr3, len3 * 1);

    }

}

/**
* @param {string} arg0
* @returns {void}
*/
export function remove_history_item(arg0) {
    const ptr0 = passStringToWasm(arg0);
    const len0 = WASM_VECTOR_LEN;
    try {
        return wasm.remove_history_item(ptr0, len0);

    } finally {
        wasm.__wbindgen_free(ptr0, len0 * 1);

    }

}

/**
* @param {string} arg0
* @param {string} arg1
* @param {number} arg2
* @param {string} arg3
* @param {boolean} arg4
* @param {number} arg5
* @returns {void}
*/
export function update_history_item(arg0, arg1, arg2, arg3, arg4, arg5) {
    const ptr0 = passStringToWasm(arg0);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm(arg1);
    const len1 = WASM_VECTOR_LEN;
    const ptr3 = passStringToWasm(arg3);
    const len3 = WASM_VECTOR_LEN;
    try {
        return wasm.update_history_item(ptr0, len0, ptr1, len1, arg2, ptr3, len3, arg4, arg5);

    } finally {
        wasm.__wbindgen_free(ptr0, len0 * 1);
        wasm.__wbindgen_free(ptr1, len1 * 1);
        wasm.__wbindgen_free(ptr3, len3 * 1);

    }

}

/**
* @returns {number}
*/
export function size() {
    return wasm.size();
}

const lTextDecoder = typeof TextDecoder === 'undefined' ? require('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8');

function getStringFromWasm(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory().subarray(ptr, ptr + len));
}

let cachedGlobalArgumentPtr = null;
function globalArgumentPtr() {
    if (cachedGlobalArgumentPtr === null) {
        cachedGlobalArgumentPtr = wasm.__wbindgen_global_argument_ptr();
    }
    return cachedGlobalArgumentPtr;
}

let cachegetUint32Memory = null;
function getUint32Memory() {
    if (cachegetUint32Memory === null || cachegetUint32Memory.buffer !== wasm.memory.buffer) {
        cachegetUint32Memory = new Uint32Array(wasm.memory.buffer);
    }
    return cachegetUint32Memory;
}
/**
* @param {string} arg0
* @param {number} arg1
* @param {string} arg2
* @returns {string}
*/
export function search(arg0, arg1, arg2) {
    const ptr0 = passStringToWasm(arg0);
    const len0 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm(arg2);
    const len2 = WASM_VECTOR_LEN;
    const retptr = globalArgumentPtr();
    try {
        wasm.search(retptr, ptr0, len0, arg1, ptr2, len2);
        const mem = getUint32Memory();
        const rustptr = mem[retptr / 4];
        const rustlen = mem[retptr / 4 + 1];

        const realRet = getStringFromWasm(rustptr, rustlen).slice();
        wasm.__wbindgen_free(rustptr, rustlen * 1);
        return realRet;


    } finally {
        wasm.__wbindgen_free(ptr0, len0 * 1);
        wasm.__wbindgen_free(ptr2, len2 * 1);

    }

}

export const init = async () => {
    try {
        const response = await fetch('./history_bg.wasm');
        const bytes = await response.arrayBuffer();
        const results = await WebAssembly.instantiate(bytes);
        wasm = results.instance.exports;
    } catch (e) {
        console.error('wasm loading error', e);
    }
};
