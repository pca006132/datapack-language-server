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
}
