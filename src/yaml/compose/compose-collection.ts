import { isMap, isNode, ParsedNode } from '../nodes/Node';
import { Scalar } from '../nodes/Scalar';
import type { YAMLMap } from '../nodes/YAMLMap';
import type { YAMLSeq } from '../nodes/YAMLSeq';
import type { BlockMap, BlockSequence, FlowCollection, SourceToken } from '../parse/cst';
import { CollectionTag } from '../schema/types';
import type { ComposeContext, ComposeNode } from './compose-node';
import type { ComposeErrorHandler } from './composer';
import { resolveBlockMap } from './resolve-block-map';
import { resolveBlockSeq } from './resolve-block-seq';
import { resolveFlowCollection } from './resolve-flow-collection';

export function composeCollection(
    CN: ComposeNode,
    ctx: ComposeContext,
    token: BlockMap | BlockSequence | FlowCollection,
    tagToken: SourceToken | null,
    onError: ComposeErrorHandler,
) {
    let coll: YAMLMap.Parsed | YAMLSeq.Parsed;
    switch (token.type) {
        case 'block-map': {
            coll = resolveBlockMap(CN, ctx, token, onError);
            break;
        }
        case 'block-seq': {
            coll = resolveBlockSeq(CN, ctx, token, onError);
            break;
        }
        case 'flow-collection': {
            coll = resolveFlowCollection(CN, ctx, token, onError);
            break;
        }
    }

    if (!tagToken) return coll;
    const tagName = ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, 'TAG_RESOLVE_FAILED', msg));
    if (!tagName) return coll;

    // Cast needed due to: https://github.com/Microsoft/TypeScript/issues/3841
    const Coll = coll.constructor as typeof YAMLMap | typeof YAMLSeq;
    if (tagName === '!' || tagName === Coll.tagName) {
        coll.tag = Coll.tagName;
        return coll;
    }

    const expType = isMap(coll) ? 'map' : 'seq';
    let tag = ctx.schema.tags.find((t) => t.collection === expType && t.tag === tagName) as CollectionTag | undefined;
    if (!tag) {
        const kt = ctx.schema.knownTags[tagName];
        if (kt && kt.collection === expType) {
            ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
            tag = kt;
        } else {
            onError(tagToken, 'TAG_RESOLVE_FAILED', `Unresolved tag: ${tagName}`, true);
            coll.tag = tagName;
            return coll;
        }
    }

    const res = tag.resolve(coll, (msg) => onError(tagToken, 'TAG_RESOLVE_FAILED', msg), ctx.options);
    const node = isNode(res) ? (res as ParsedNode) : (new Scalar(res) as Scalar.Parsed);
    node.range = coll.range;
    node.tag = tagName;
    if (tag?.format) (node as Scalar).format = tag.format;
    return node;
}
