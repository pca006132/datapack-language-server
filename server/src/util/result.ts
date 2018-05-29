/**
 * Type definition for Result, inspired from Rust
 */

/**
 * Result represents either success(Ok) or failure(Err).
 * T: Type of the value
 * E: Type of the error
 *
 * Use createOk and createErr to create the result.
 */
export default abstract class Result<T, E> {
    /**
     * If the result is ok (not error)
     */
    abstract isOk(): boolean;
    /**
     * If the result is an error
     */
    abstract isErr(): boolean;
    /**
     * Returns the value of the result, and throw an error if the result is an error
     */
    abstract unwrap(): T;
    /**
     * Returns the value of the result, or the default value if the result is an error
     * @param defaultValue default value to be returned when the result is an error
     */
    abstract unwrapDefault(defaultValue: T): T;
    /**
     * Returns the error of the result, or throw an error if the result is not error
     */
    abstract getError(): E;

    /**
     * Create a success result
     * @param value success value
     */
    static createOk<T, E>(value: T): Result<T, E> {
        return new Ok(value);
    }
    /**
     * Create an error result
     * @param err error value
     */
    static createErr<T, E>(err: E): Result<T, E> {
        return new Err(err);
    }
}

/**
 * Object containing the success value
 */
class Ok<T, E> extends Result<T, E> {
    value: T;
    constructor(value: T) {
        super();
        this.value = value;
    }
    isOk() {
        return true;
    }
    isErr() {
        return false;
    }
    unwrap() {
        return this.value;
    }
    unwrapDefault(defaultValue: T) {
        return this.value;
    }
    getError(): E {
        throw new Error('The result is Ok instead of error');
    }
}

/**
 * Object containing the error value
 */
class Err<T, E> extends Result<T, E> {
    error: E;
    constructor(error: E) {
        super();
        this.error = error;
    }
    isOk() {
        return false;
    }
    isErr() {
        return true;
    }
    unwrap(): T {
        throw this.error;
    }
    unwrapDefault(defaultValue: T) {
        return defaultValue;
    }
    getError() {
        return this.error;
    }
}