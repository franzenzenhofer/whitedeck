import { DATA_CHANGE } from '../theme/data.js';
/*
 * Change values in a table are coloured (Franz, 11 Nov 2026): a cell that is ONLY a signed
 * number - "-11.6 %", "+0.4 pp", "-1,469,441", "+12" - turns red (negative), green
 * (positive) or grey ("more or less the same": a % or pp change below DATA_CHANGE.sameBelow).
 * An absolute change takes the verdict of the % change in its row, so "-120" next to
 * "-0.3 %" is grey too. Cells with other text, and cells the author coloured
 * ([x]{#hex}), stay as written. The threshold belongs in the slide's footnote once.
 */
const SIGNED = /^([+\-−])\s?(\d[\d,]*(?:\.\d+)?)\s*(%|pp)?$/;
const parseChange = (cell) => {
    const m = SIGNED.exec(cell.trim());
    if (m?.[1] === undefined || m[2] === undefined)
        return undefined;
    return { sign: m[1] === '+' ? 1 : -1, value: Number(m[2].replaceAll(',', '')), relative: m[3] !== undefined };
};
const colourOf = (change, rowIsSame) => {
    const same = change.relative ? change.value < DATA_CHANGE.sameBelow : rowIsSame;
    if (same || change.value === 0)
        return DATA_CHANGE.same;
    return change.sign < 0 ? DATA_CHANGE.negative : DATA_CHANGE.positive;
};
/** The row with every change cell wrapped as a coloured run `[cell]{#hex}`. */
export const colourChanges = (row) => {
    const changes = row.map(parseChange);
    const rowIsSame = changes.some((c) => c?.relative === true && c.value < DATA_CHANGE.sameBelow);
    return row.map((cell, index) => {
        const change = changes[index];
        return change === undefined ? cell : `[${cell.trim()}]{${colourOf(change, rowIsSame)}}`;
    });
};
