import {Range, DiagnosticSeverity, Diagnostic} from 'vscode-languageserver';

/**
 * Definition for parsing error
 */
export default class ParsingError {
    range: Range;
    problem: string;
    severity: DiagnosticSeverity;
    solution?: string;

    /**
     * Constructor of ParsingError
     * @param range Range of the error
     * @param problem Error problem, `invalid escape sequence` for example
     * @param hint Possible solution
     * @param severity Severity of the problem, default `error`
     */
    constructor(range: Range, problem: string, solution?: string, severity: DiagnosticSeverity = 1) {
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
     */
    getDiagnostic(): Diagnostic {
        return {
            range: this.range,
            severity: this.severity,
            source: 'datapack',
            message: this.getMsg()
        }
    }
}