/**
 * Type definition for parser result
 */

import ParsingError from './parsing_error';

export default interface ParserResult<T> {
    /**
     * Parser result data, may include node and other data, definitions for example
     */
    result: T;
    /**
     * Errors while parsing
     */
    errors: ParsingError[];
}