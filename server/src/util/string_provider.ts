import Result from './result';

/**
 * StringProvider for pull parsers
 * Note that, it is assumed that the source of the string will not be changed during providing string
 */
export default interface StringProvider {
    /**
     * Get the current character, and move the pointer to the next character.
     * Ok(str) for the current character.
     * Err(msg) when there is no more character to give.
     */
    getChar(): Result<string, string>;
    /**
     * Get line segment starting from the current character.
     * If the predicate returns Ok(true), it would continue to parse.
     * If the predicate returns Ok(false), the character parsed would be the current character and the end of the segment(exclusive), and Ok(segment) will be returned.
     * If the predicate returns Err(str), Err(str) would be returned, and the pointer would be moved back to the first character of the segment.
     * If it reaches the end of the string, Ok(segment) will be returned.
     * @param predicate Predicate for the segment
     */
    getSegment(predicate: (char: string)=>Result<boolean, string>): Result<string, string>;
    /**
     * Return the index of the current character
     */
    getIndex(): number;
    /**
     * Move the pointer to the character (make it the current character).
     * Ok(null) would be returned for success result, and Err(str) would be returned when the pos is not a valid position in the string provider.
     * @param pos Position of the character
     */
    moveTo(pos: number): Result<null, string>;
    /**
     * Get the remaining string from this string provider starting from the current character.
     * Note that this method has no side effect, it would not trigger any changes.
     */
    getRemaining(): string;
    /**
     * Returns whether there are more characters to be parsed.
     */
    isEnd(): boolean;
    /**
     * Returns the length of the whole string
     */
    length(): number;
}