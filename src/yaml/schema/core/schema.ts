import { map } from '../common/map';
import { nullTag } from '../common/null';
import { seq } from '../common/seq';
import { string } from '../common/string';
import { boolTag } from './bool';
import { float, floatExp, floatNaN } from './float';
import { int, intHex, intOct } from './int';

export const schema = [map, seq, string, nullTag, boolTag, intOct, int, intHex, floatNaN, floatExp, float];
