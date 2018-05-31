import ParsingError from './parsing_error';
import StringProvider from './string_provider';

/**
 * Parser result, where T is the result type
 */
export interface ParserResult<T> {
    /**
     * Parser result data, may include node and other data, definitions for example
     */
    result?: T;
    /**
     * Errors while parsing
     */
    errors: ParsingError[];
}

/**
 * General Parser Parameters, where T is the node type
 */
export interface ParserParameter<T> {
    /**
     * Current node
     */
    current: T;
    /**
     * Position of the current character in the current node
     */
    pos: number;
    /**
     * String provider for the parser
     */
    provider: StringProvider;
}