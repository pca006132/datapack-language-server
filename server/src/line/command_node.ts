/**
 * Nodes of commands.json
 */
export default interface CommandNode {
    /**
     * Literal argument
     */
    data?: string | string[];
    /**
     * Name of the reference file, for example `EntityId`.
     * Literal node, with value in the reference file
     */
    reference?: string;
    /**
     * Regex pattern of the argument
     */
    format?: string;
    /**
     * Parser for this argument
     */
    parser?: string;
    /**
     * Properties for the parser
     */
    properties?: object;

    /**
     * If the command could be executed with this argument
     */
    executable: boolean;
    /**
     * The children of this argument
     */
    children?: CommandNode[];
    /**
     * Redirect children to root[redirect].children
     */
    redirect?: string;

    /**
     * Identifier for the node, will be generated when loading the json file
     */
    id: number;

    /**
     * Description of the node
     */
    description?: string;
}
