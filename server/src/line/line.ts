/**
 * Line definition
 */

import Result from '../util/result';
import ParsingError from '../util/parsing_error';
import ParserResult from '../util/parser_result';
import StringProvider from '../util/string_provider';
import CommandNode from'./command_node';

type Argument = CommandArgument | {source: string, definitions?: {[key: string]: string[]}};
export interface CommandArgument {
    /**
     * Source string of the argument
     */
    source: string;
    /**
     * Parsed data object
     */
    parsedData: any;

    /**
     * Data for refactoring and usage analysis
     * Keys are the types, such as objective and tag
     */
    data: {
        definitions: {[key: string]: string[]},
        references: {[key: string]: string[]},
        resourceLocations: {[key: string]: string[]}
    };

    /**
     * Command node of this argument
     */
    node: CommandNode;

    /**
     * Get Error list of the argument
     */
    getErrors(): ParsingError[];
}

const SPACE_ARGUMENT: Argument = {source: ' '};

class Line {
    arguments: (Argument&{modified: boolean})[] = [];
    comment: boolean = false;
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


}

class Provider implements StringProvider {
    line: Line;
    lineNum: number;
    index=0;
    offset = 0;
    argumentIndex = 0;
    currentArgument: Argument&{modified: boolean}|undefined;

    constructor(line: Line, lineNum: number) {
        this.line = line;
        this.lineNum = lineNum;
        if (line.arguments.length > 0)
            this.currentArgument = line.arguments[0];
    }

    getChar() {
        if (!this.currentArgument) {
            return Result.createErr<string, string>('End of string');
        }
        this.index++;
        //fix invalid offset caused by the previous run of getChar()
        if (this.offset >= this.currentArgument.source.length) {
            this.offset = 0;
            if (++this.argumentIndex >= this.line.arguments.length) {
                return Result.createErr<string, string>('End of string');
            }
            this.currentArgument = this.line.arguments[this.argumentIndex];
        }
        return Result.createOk<string, string>(this.currentArgument.source[this.offset++]);
    }
    moveTo(pos: number) {
        const iterate = ()=>{
            if (!this.currentArgument) {
                return Result.createErr<null, string>('End of string');
            }
            while (this.offset >= this.currentArgument.source.length) {
                this.offset-=this.currentArgument.source.length;
                if (++this.argumentIndex >= this.line.arguments.length) {
                    return Result.createErr<null, string>('End of string');
                }
                this.currentArgument = this.line.arguments[this.argumentIndex];
            }
            return Result.createOk<null, string>(null);
        }
        if (this.index === pos) {
            return Result.createOk<null, string>(null);
        }
        if (this.index > pos) {
            this.offset += (pos - this.index);
        } else {
            this.argumentIndex = 0;
            this.offset = pos;
            this.currentArgument = this.line.arguments[0];
        }
        this.index = pos;
        return iterate();
    }
    getSegment(predicate: (char: string)=>Result<boolean, string>) {
        const start = this.getPos();
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
                this.offset--;
                this.index--;
                if (this.offset === -1) {
                    this.currentArgument = this.line.arguments[--this.argumentIndex];
                    this.offset = this.currentArgument.source.length - 1;
                }
                break;
            }
            chars.push(char);
        }
        return Result.createOk<string, string>(chars.join(''));
    }
    getRemaining() {
        if (!this.currentArgument) {
            return '';
        }
        //handle the current argument: substring
        let portion = this.currentArgument.source.substring(this.offset);
        //handle the remaining arguments: full string
        for (let i = this.argumentIndex + 1; i++; i < this.line.arguments.length) {
            portion += this.line.arguments[i].source;
        }
        return portion;
    }
    getPos() {
        return this.index;
    }
    isEnd() {
        return Boolean(this.currentArgument && this.offset >= this.currentArgument.source.length && this.argumentIndex === this.line.arguments.length - 1)
    }
}