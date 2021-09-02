/* global globalThis */

JSBI = require('jsbi');

let jsbi;

/**
 * If BigInt is natively supported, change JSBI to use native expressions
 * @see https://github.com/GoogleChromeLabs/jsbi/blob/master/jsbi.d.ts
 * @see https://github.com/GoogleChromeLabs/babel-plugin-transform-jsbi-to-bigint/blob/master/src/index.js
 */
if (globalThis.BigInt) {
  jsbi = {};

  // constructor
  jsbi['BigInt'] = (a) => BigInt(a);

  // note: JSBI toString is already the same: a.toString()
  jsbi['toNumber'] = (a) => Number(a);

  // binary functions to expressions
  jsbi['add'] = (a, b) => a + b;
  jsbi['subtract'] = (a, b) => a - b;
  jsbi['multiply'] = (a, b) => a * b;
  jsbi['divide'] = (a, b) => a / b;
  jsbi['remainder'] = (a, b) => a % b;
  jsbi['exponentiate'] = (a, b) => a ** b;
  jsbi['leftShift'] = (a, b) => a << b;
  jsbi['signedRightShift'] = (a, b) => a >> b;
  jsbi['bitwiseAnd'] = (a, b) => a & b;
  jsbi['bitwiseOr'] = (a, b) => a | b;
  jsbi['bitwiseXor'] = (a, b) => a ^ b;
  jsbi['equal'] = (a, b) => a === b;
  jsbi['notEqual'] = (a, b) => a !== b;
  jsbi['lessThan'] = (a, b) => a < b;
  jsbi['lessThanOrEqual'] = (a, b) => a <= b;
  jsbi['greaterThan'] = (a, b) => a > b;
  jsbi['greaterThanOrEqual'] = (a, b) => a >= b;
  jsbi['EQ'] = (a, b) => a == b;
  jsbi['NE'] = (a, b) => a != b;
  jsbi['LT'] = (a, b) => a < b;
  jsbi['LE'] = (a, b) => a <= b;
  jsbi['GT'] = (a, b) => a > b;
  jsbi['GE'] = (a, b) => a >= b;
  jsbi['ADD'] = (a, b) => a + b;

  // unary functions to expressions
  jsbi['unaryMinus'] = (a) => -a;
  jsbi['bitwiseNot'] = (a) => ~a;

  // static methods
  jsbi['asIntN'] = (a, b) => BigInt.asIntN(a, b);
  jsbi['asUintN'] = (a, b) => BigInt.asUintN(a, b);
} else {
  jsbi = JSBI;
}

jsbi.dataViewSetBigUint64 = function(dataview, byteOffset, value, littleEndian) {
    if (typeof value === 'bigint' && typeof dataview.setBigUint64 !== 'undefined') {
        // Native bigint with setBigUint64
        dataview.setBigUint64(byteOffset, value, littleEndian);
    } else if (typeof value === 'bigint' && typeof dataview.setBigUint64 === 'undefined') {
        // Native bigint without setBigUint64
        const mask = BigInt(0xffffffff);
        const bits = 32;
        const lowWord = Number(BigInt.asUintN(bits, value & mask));
        const highWord = Number(BigInt.asUintN(bits, (value >> BigInt(bits)) & mask));
        dataview.setUint32(byteOffset + (littleEndian ? 0 : 4), lowWord, littleEndian);
        dataview.setUint32(byteOffset + (littleEndian ? 4 : 0), highWord, littleEndian);
    } else if (value.constructor === JSBI && typeof value.sign === 'bigint' && typeof dataview.setBigUint64 !== 'undefined') {
        // JSBI wrapping a native bigint with setBigUint64
        dataview.setBigUint64(byteOffset, value.sign, littleEndian);
    } else if (value.constructor === JSBI && typeof value.sign === 'bigint' && typeof dataview.setBigUint64 === 'undefined') {
        // JSBI wrapping a native bigint without setBigUint64
        const mask = jsbi.BigInt(0xffffffff);
        const bits = 32;
        const lowWord = Number(jsbi.asUintN(jsbi.bitwiseAnd(value.sign, mask)));
        const shifted = jsbi.rightShift(value.sign, bits);
        const highWord = Number(jsbi.asUintN(jsbi.bitwiseAnd(shifted, mask)));
        dataview.setUint32(byteOffset + (littleEndian ? 0 : 4), lowWord, littleEndian);
        dataview.setUint32(byteOffset + (littleEndian ? 4 : 0), highWord, littleEndian);
    } else if (value.constructor === JSBI) {
        // JSBI polyfill implementation
        const lowWord = value[0];
        let highWord = 0;
        if (value.length >= 2) {
          highWord = value[1];
        }
        dataview.setUint32(byteOffset + (littleEndian ? 0 : 4), lowWord, littleEndian);
        dataview.setUint32(byteOffset + (littleEndian ? 4 : 0), highWord, littleEndian);
    } else {
        throw TypeError('Value needs to be either BigInt or JSBI');
    }
}

jsbi.dataViewGetBigUint64 = function (dataview, byteOffset, littleEndian) {
    let res = null;
    if (typeof dataview.getBigUint64 !== 'undefined') {
        res = dataview.getBigUint64(byteOffset, littleEndian);
    } else {
        const lowWord = jsbi.BigInt(dataview.getUint32(byteOffset + (littleEndian ? 0 : 4), littleEndian));
        const highWord = jsbi.BigInt(dataview.getUint32(byteOffset + (littleEndian ? 4 : 0), littleEndian));
        res = jsbi.add(jsbi.leftShift(highWord, jsbi.BigInt(32)), lowWord);
    }
    return res;
}

module.exports = {
    jsbi,
};
