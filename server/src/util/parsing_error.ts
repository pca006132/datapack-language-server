import {Range, DiagnosticSeverity, Diagnostic} from 'vscode-languageserver';

/**
 * Definition for parsing error
 */
export default class ParsingError {
    range: {start: number, end: number};
    problem: string;
    severity: DiagnosticSeverity;
    solution?: string;

    /**
     * Constructor of ParsingError
     * @param range Range of the error, start and end are the index of the starting and ending character (inclusive)
     * @param problem Error problem, `invalid escape sequence` for example
     * @param hint Possible solution
     * @param severity Severity of the problem, default `error`
     */
    constructor(range: {start: number, end: number}, problem: string, solution?: string, severity: DiagnosticSeverity = 1) {
        this.range = range;
        this.problem = problem;
        this.solution = solution;
        this.severity = severity;
    }

    getMsg() {
        return this.problem + (this.solution? '\nPossible solution: ' + this.solution : '');
    }

    /**
     * Get compiler diagnostic
     * @param lineNum Line number of the diagnostic
     */
    getDiagnostic(lineNum: number): Diagnostic {
        return {
            range: {start: {character: this.range.start, line: lineNum}, end: {character: this.range.end, line: lineNum}},
            severity: this.severity,
            source: 'datapack',
            message: this.getMsg()
        }
    }
}