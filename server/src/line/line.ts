/**
 * Line definition
 */

import Result from '../util/result';
import ParsingError from '../util/parsing_error';
import {ParserResult} from '../util/parser';
import StringProvider from '../util/string_provider';
import {CommandArgument, SimpleCommandArgument} from './command_argument';

class Line {
    //spaces should be included in the argument before the space character
    arguments: CommandArgument[] = [];
    //Whether this line is a comment
    comment: boolean = false;
    //list of errors in this line
    errors: ParsingError[] = [];
    data: {
        definitions: {[key: string]: string[]},
        references: {[key: string]: string[]},
        resourceLocations: {[key: string]: string[]}
    } = {definitions: {}, references: {}, resourceLocations: {}};

    diagnosticCallback: ()=>void;
    dataCallback: ()=>void;

    constructor(diagnosticCallback: ()=>void, dataCallback: ()=>void) {
        this.diagnosticCallback = diagnosticCallback;
        this.dataCallback = dataCallback;
    }

    modify(start: number, end: number, text: string) {
        const result = Provider.getProvider(this);
        if (result.isErr()) {
            //empty arguments
            this.arguments.push(new SimpleCommandArgument(text));
        } else {
            const provider = result.unwrap();
            //find starting argument
            if (provider.moveTo(start).isErr()) {
                return Result.createErr<null, string>('Index out of range');
            }
            const beginning = provider.getArgumentIndex();
            this.arguments[beginning].modify(provider.getIndexInArgument(), Number.MAX_VALUE, text);
            provider.moveTo(end);
            const ending = provider.getArgumentIndex();
            this.arguments[beginning].modify(0, provider.getIndexInArgument(), '');

            for (let i = ending - 1; i > start; i--) {
                //delete the arguments between start and end
                this.arguments.splice(i, 1);
            }

            //TODO: Reparse the affected portion
        }
        return Result.createOk<null, string>(null);
    }
}

class Provider implements StringProvider {
    private line: Line;
    private argumentIndex = 0;
    private index = 0;
    private currentArgumentProvider: StringProvider;

    private constructor(line: Line) {
        this.line = line;
        this.currentArgumentProvider = line.arguments[0].source();
    }

    getChar() {
        if (!this.currentArgumentProvider) {
            return Result.createErr<string, string>('End of string');
        }
        this.index++;
        //check if it is needed to move to the next argument
        while (this.currentArgumentProvider.isEnd()) {
            if (++this.argumentIndex >= this.line.arguments.length) {
                return Result.createErr<string, string>('End of string');
            }
            this.currentArgumentProvider = this.line.arguments[this.argumentIndex].source();
        }
        return this.currentArgumentProvider.getChar();
    }
    moveTo(pos: number) {
        if (pos < 0) {
            return Result.createErr<null, string>('Invalid pos');
        }
        //handle number.max pos...
        pos = Math.min(pos, this.length());
        if (this.index === pos) {
            return Result.createOk<null, string>(null);
        }
        let diff = pos - (this.index - this.currentArgumentProvider.getIndex());
        while (diff < 0) {
            this.currentArgumentProvider = this.line.arguments[--this.argumentIndex].source();
            diff += this.currentArgumentProvider.length();
        }
        while (diff > this.currentArgumentProvider.length()) {
            diff -= this.currentArgumentProvider.length();
            this.currentArgumentProvider = this.line.arguments[++this.argumentIndex].source();
        }
        this.currentArgumentProvider.moveTo(diff);
        return Result.createOk<null, string>(null);
    }
    getSegment(predicate: (char: string)=>Result<boolean, string>) {
        const start = this.getIndex();
        let chars: string[] = [];
        while (!this.isEnd()) {
            //As we have checked if it is ended, so it would never be Err
            const char = this.getChar().unwrap();
            const r = predicate(char);
            if (r.isErr()) {
                //rewind
                this.moveTo(start);
                return r as Result<any, string> as Result<string, string>;
            }
            if (!r.unwrap()) {
                //rewind 1 character and return
                this.moveTo(this.index--);
                break;
            }
            chars.push(char);
        }
        return Result.createOk<string, string>(chars.join(''));
    }
    getRemaining() {
        //handle the current argument: substring
        let portion = this.currentArgumentProvider.getRemaining();
        //handle the remaining arguments: full string
        for (let i = this.argumentIndex + 1; i++; i < this.line.arguments.length) {
            portion += this.line.arguments[i].source().getRemaining();
        }
        return portion;
    }
    getIndex() {
        return this.index;
    }
    isEnd() {
        return this.argumentIndex === this.line.arguments.length - 1 && this.currentArgumentProvider.isEnd();
    }
    length() {
        return this.line.arguments.map(c=>c.source().length()).reduce((previous, current)=>previous + current);
    }

    /**
     * Get the current argument index
     */
    getArgumentIndex() {
        return this.argumentIndex;
    }
    /**
     * Return the index in the current argument
     */
    getIndexInArgument() {
        return this.currentArgumentProvider.getIndex();
    }
    /**
     * Returns if the effect of the modification is finished
     */
    isModificationFinished() {
        return !this.line.arguments[this.argumentIndex].modified && this.currentArgumentProvider.getIndex() === 0;
    }

    static getProvider(line: Line) {
        if (line.arguments.length > 0) {
            return Result.createOk<Provider, string>(new Provider(line));
        }
        return Result.createErr<Provider, string>('No string provider for empty arguments');
    }
}