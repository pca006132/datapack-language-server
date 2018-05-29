import CommandNode from'./command_node';
import ParsingError from '../util/parsing_error';

export interface CommandArgument {
    /**
     * Source string of the argument
     */
    source: string;
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

    /**
     * Edit the source of the argument allowing parsers to edit complicated parsedData efficiently by incremental parsing.
     * defaultEditSource function is provided for simple nodes.
     * @param start Starting position of the edit
     * @param end Ending position of the edit (inclusive)
     * @param text Replacement text
     */
    editSource(start: number, end: number, text: string): void;
}

export function defaultEditSource(arg: CommandArgument, start: number, end: number, text: string) {
    arg.source = arg.source.substring(0, start) + text + arg.source.substring(end+1);
}