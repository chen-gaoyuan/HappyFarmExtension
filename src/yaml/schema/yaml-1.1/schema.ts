import { map } from '../common/map';
import { nullTag } from '../common/null';
import { seq } from '../common/seq';
import { string } from '../common/string';
import { binary } from './binary';
import { falseTag, trueTag } from './bool';
import { float, floatExp, floatNaN } from './float';
import { intBin, int, intHex, intOct } from './int';
import { omap } from './omap';
import { pairs } from './pairs';
import { set } from './set';
import { intTime, floatTime, timestamp } from './timestamp';

export const schema = [
    map,
    seq,
    string,
    nullTag,
    trueTag,
    falseTag,
    intBin,
    intOct,
    int,
    intHex,
    floatNaN,
    floatExp,
    float,
    binary,
    omap,
    pairs,
    set,
    intTime,
    floatTime,
    timestamp,
];
