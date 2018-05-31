import CommandNode from'./command_node';
import StringProvider from '../util/string_provider';
import ParsingError from '../util/parsing_error';
import Result from '../util/result';

export interface CommandArgument {
    /**
     * Get string provider for the source string of the argument
     */
    source(): StringProvider;
    modify(start: number, end: number, text: string): Result<null, string>;
    clone(): this;
    modified: boolean;
    /**
     * Parsed data object
     */
    parsedData?: any;

    /**
     * Data for refactoring and usage analysis
     * Keys are the types, such as objective and tag
     */
    data?: {
        definitions: {[key: string]: string[]},
        references: {[key: string]: string[]},
        resourceLocations: {[key: string]: string[]}
    };

    /**
     * Command node of this argument
     */
    node?: CommandNode;

    /**
     * Get Error list of the argument
     */
    getErrors(): ParsingError[];
}

export class SimpleCommandArgument implements CommandArgument {
    private _source: string;
    modified = false;
    constructor(source: string) {
        this._source = source;
    }
    clone() {
        return new SimpleCommandArgument(this._source) as this;
    }
    source() {
        return new SimpleProvider(this._source);
    }
    getErrors() {
        return [];
    }
    modify(start: number, end: number, text: string) {
        if (!(start >= 0 && start < this._source.length && end > start && end <= this._source.length))
            return Result.createErr<null, string>('Invalid start/end');
        this._source = this._source.substring(0, start) + text + this._source.substring(end);
        this.modified = true;
        return Result.createOk<null, string>(null);
    }
}

class SimpleProvider implements StringProvider {
    private source: string;
    private index: number;
    constructor(source: string) {
        this.source = source;
        this.index = 0;
    }
    getChar() {
        if (this.index < this.source.length) {
            return Result.createOk<string, string>(this.source[this.index++]);
        }
        return Result.createErr<string, string>('End of string');
    }
    getIndex() {
        return this.index;
    }
    getRemaining() {
        return this.source.substring(this.index);
    }
    length() {
        return this.source.length;
    }
    moveTo(index: number) {
        if (index > this.source.length)
            return Result.createErr<null, string>('Index out of range');
        this.index = index;
        return Result.createOk<null, string>(null);
    }
    isEnd() {
        return this.index >= this.source.length;
    }
    getSegment(predicate: (char: string)=>Result<boolean, string>) {
        const index = this.index;
        while (!this.isEnd()) {
            const result = predicate(this.getChar().unwrap());
            if (result.isErr()) {
                this.index = index;
                return result as Result<any, string> as Result<string, string>;
            }
            if (!result.unwrap()) {
                return Result.createOk<string, string>(this.source.substring(index, this.index--));
            }
        }
        return Result.createOk<string, string>(this.source.substring(index));
    }
}