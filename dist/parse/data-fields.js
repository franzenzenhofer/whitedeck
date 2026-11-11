import { builtInLogo, LOGO_IDS, logoPath } from '../theme/logos.js';
export const DATA_FIELD = /^(Tags|Logos|Context|Conclusion|Notes):\s*(.*)$/;
const LIST_SEPARATOR = '|';
const listItems = (field, value) => {
    const items = value.split(LIST_SEPARATOR).map((item) => item.trim());
    if (items.some((item) => item === '')) {
        throw new Error(`${field}: empty item in "${value}" - separate items with " | "`);
    }
    return items;
};
export const parseTags = (value) => listItems('Tags', value);
const LOGO_ITEM = /^(.+?)(?:\s+"([^"]*)")?$/;
const parseLogo = (item) => {
    const match = LOGO_ITEM.exec(item);
    const ref = match?.[1]?.trim() ?? item;
    const label = match?.[2];
    const known = builtInLogo(ref);
    if (known !== undefined) {
        const shown = label ?? (known.kind === 'icon' ? known.label : undefined);
        return { path: logoPath(known), ...(shown !== undefined && shown !== '' && { label: shown }) };
    }
    if (!/[./\\]/.test(ref)) {
        throw new Error(`Logos: unknown logo "${ref}". Built in: ${LOGO_IDS.join(', ')}; or give an image path`);
    }
    return { path: ref, ...(label !== undefined && label !== '' && { label }) };
};
export const parseLogos = (value) => listItems('Logos', value).map(parseLogo);
/** Split a table row into cells; `\|` is a literal pipe inside a cell. */
const cells = (line) => {
    const body = line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '');
    return body.split(/(?<!\\)\|/).map((cell) => cell.trim().replaceAll('\\|', '|'));
};
const alignOf = (delimiter) => {
    const left = delimiter.startsWith(':');
    const right = delimiter.endsWith(':');
    if (left && right)
        return 'center';
    return right ? 'right' : 'left';
};
const DELIMITER_CELL = /^:?-+:?$/;
/** Table lines (header, delimiter, rows) to a DeckTable; a ragged row is an error, never a guess. */
export const parseTable = (lines) => {
    const [headLine, delimiterLine, ...rowLines] = lines;
    if (headLine === undefined || delimiterLine === undefined)
        throw new Error('table needs a header row and a delimiter row');
    const header = cells(headLine);
    const delimiters = cells(delimiterLine);
    if (!delimiters.every((d) => DELIMITER_CELL.test(d))) {
        throw new Error(`table: second row must be the delimiter row (| --- | ---: |), got "${delimiterLine.trim()}"`);
    }
    const width = header.length;
    if (delimiters.length !== width)
        throw new Error(`table: delimiter row has ${delimiters.length} cells, header has ${width}`);
    const rows = rowLines.map((line) => {
        const row = cells(line);
        if (row.length !== width)
            throw new Error(`table: row "${line.trim()}" has ${row.length} cells, header has ${width}`);
        return row;
    });
    return { header, rows, align: delimiters.map(alignOf) };
};
