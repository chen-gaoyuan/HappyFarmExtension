export { Composer } from './compose/composer';

export { Document } from './doc/Document';
export { Schema } from './schema/Schema';

export { ErrorCode, YAMLError, YAMLParseError, YAMLWarning } from './errors';

export { Alias } from './nodes/Alias';
export {
    isAlias,
    isCollection,
    isDocument,
    isMap,
    isNode,
    isPair,
    isScalar,
    isSeq,
    Node,
    ParsedNode,
    Range,
} from './nodes/Node';
export { Pair } from './nodes/Pair';
export { Scalar } from './nodes/Scalar';
export { YAMLMap } from './nodes/YAMLMap';
export { YAMLSeq } from './nodes/YAMLSeq';

export type {
    CreateNodeOptions,
    DocumentOptions,
    ParseOptions,
    SchemaOptions,
    ToJSOptions,
    ToStringOptions,
} from './options';

export * as CST from './parse/cst';
export { Lexer } from './parse/lexer';
export { LineCounter } from './parse/line-counter';
export { Parser } from './parse/parser';

export { EmptyStream, parse, parseAllDocuments, parseDocument, stringify } from './public-api';

export type { TagId, Tags } from './schema/tags';
export type { CollectionTag, ScalarTag } from './schema/types';
export type { YAMLOMap } from './schema/yaml-1.1/omap';
export type { YAMLSet } from './schema/yaml-1.1/set';

export { asyncVisitor, asyncVisitorFn, visit, visitAsync, visitor, visitorFn } from './visit';
