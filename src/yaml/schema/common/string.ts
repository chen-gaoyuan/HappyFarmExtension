import { stringifyString } from '../../stringify/stringifyString';
import type { ScalarTag } from '../types';

export const string: ScalarTag = {
    identify: (value) => typeof value === 'string',
    default: true,
    tag: 'tag:yaml.org,2002:str',
    resolve: (str) => str,
    stringify(item, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString(item, ctx, onComment, onChompKeep);
    },
};
