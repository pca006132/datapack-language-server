import {
    TextDocumentContentChangeEvent
} from 'vscode-languageserver';

export type LineEdit = {
    action: 'delete all'
} | {
    action: 'insert after',
    lineNum: number,
    text: string
} | {
    action: 'change',
    lineNum: number,
    start: number,
    end: number,
    text: string
} | {
    action: 'delete'
    lineNum: number,
} | {
    action: 'merge',
    lineNum: number,
    lineNum2: number,
    start: number,
    end: number,
    seperator: string
} | {
    action: 'split'
    lineNum: number,
    start: number,
    end: number,
};

/**
 * Split edits into line edits
 * @param e Event
 */
export function splitEdit(e: TextDocumentContentChangeEvent) {
    let edits: LineEdit[] = [];
    const lines = e.text.split(/'\r?\n'/g);
    if (!e.range || !e.rangeLength) {
        edits = lines.map((v, i) => {
            if (i === 0) return {
                action: 'change',
                lineNum: 0,
                start: 0,
                end: Number.MAX_VALUE,
                text: v
            };
            return {
                action: 'insert after',
                lineNum: 0,
                text: v
            };
        }) as LineEdit[];
        edits.push({
            action: 'delete all'
        });
    } else {
        if (lines.length === 1) {
            if (e.range.start.line === e.range.end.line) {
                //change
                edits.push({action: 'change', lineNum: e.range.start.line, start: e.range.start.character, end: e.range.end.character, text: e.text});
            } else {
                //merge
                edits.push({action: 'merge', lineNum: e.range.start.line, lineNum2: e.range.end.line,
                    start: e.range.start.character, end: e.range.end.character, seperator: e.text});
            }
        } else {
            const first = lines.shift()!;
            const last = lines.pop()!;
            edits = lines.map(v=>({action: 'insert after', lineNum: e.range!.start.line, text: v} as LineEdit));
            edits.push({action: 'change', lineNum: e.range.start.line, start: e.range.start.character, end: Number.MAX_VALUE, text: first});
            if (e.range.start.line === e.range.end.line) {
                //split line
                edits.push({action: 'change', lineNum: e.range.start.line+1, start: 0, end: e.range.end.character, text: last});
                edits.push({action: 'split', lineNum: e.range.start.line, start: e.range.start.character, end: e.range.end.character});
            } else {
                edits.push({action: 'change', lineNum: e.range.end.line, start: 0, end: e.range.end.character, text: last});
            }
        }
    }

    return edits.reverse();
}