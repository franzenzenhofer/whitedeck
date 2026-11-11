import { builtInLogo, LOGO_IDS, logoPath } from '../theme/logos.js';

/*
 * The header fields of a `data` slide and its native table. Every one of them is
 * painted as native text (tags as text inside a rounded shape), so the whole header
 * stays editable in Keynote and PowerPoint; only logos and charts are pictures.
 *
 *   Tags: 28 days | YoY
 *   Logos: ga4 | search | assets/crux.png "CrUX"
 *   Context: 13 Oct - 9 Nov 2026 vs 14 Oct - 10 Nov 2025, same weekdays
 *   Conclusion: Organic search: 11,145,246 of 80,456,931 sessions (13.85 %)
 *   Notes: presenter notes, one paragraph per Notes: line
 */

/** A header logo: a picture, and its name as text beside it (icons) or none (wordmarks). */
export interface DeckLogo {
  readonly path: string;
  readonly label?: string;
}

export type CellAlign = 'left' | 'center' | 'right';

/** A GFM table, cells as inline markdown. */
export interface DeckTable {
  readonly header: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly align: readonly CellAlign[];
}

export const DATA_FIELD = /^(Tags|Logos|Context|Conclusion|Notes):\s*(.*)$/;

const LIST_SEPARATOR = '|';

const listItems = (field: string, value: string): string[] => {
  const items = value.split(LIST_SEPARATOR).map((item) => item.trim());
  if (items.some((item) => item === '')) {
    throw new Error(`${field}: empty item in "${value}" - separate items with " | "`);
  }
  return items;
};

export const parseTags = (value: string): string[] => listItems('Tags', value);

const LOGO_ITEM = /^(.+?)(?:\s+"([^"]*)")?$/;

const parseLogo = (item: string): DeckLogo => {
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

export const parseLogos = (value: string): DeckLogo[] => listItems('Logos', value).map(parseLogo);

/** Split a table row into cells; `\|` is a literal pipe inside a cell. */
const cells = (line: string): string[] => {
  const body = line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '');
  return body.split(/(?<!\\)\|/).map((cell) => cell.trim().replaceAll('\\|', '|'));
};

const alignOf = (delimiter: string): CellAlign => {
  const left = delimiter.startsWith(':');
  const right = delimiter.endsWith(':');
  if (left && right) return 'center';
  return right ? 'right' : 'left';
};

const DELIMITER_CELL = /^:?-+:?$/;

/** Table lines (header, delimiter, rows) to a DeckTable; a ragged row is an error, never a guess. */
export const parseTable = (lines: readonly string[]): DeckTable => {
  const [headLine, delimiterLine, ...rowLines] = lines;
  if (headLine === undefined || delimiterLine === undefined) throw new Error('table needs a header row and a delimiter row');
  const header = cells(headLine);
  const delimiters = cells(delimiterLine);
  if (!delimiters.every((d) => DELIMITER_CELL.test(d))) {
    throw new Error(`table: second row must be the delimiter row (| --- | ---: |), got "${delimiterLine.trim()}"`);
  }
  const width = header.length;
  if (delimiters.length !== width) throw new Error(`table: delimiter row has ${delimiters.length} cells, header has ${width}`);
  const rows = rowLines.map((line) => {
    const row = cells(line);
    if (row.length !== width) throw new Error(`table: row "${line.trim()}" has ${row.length} cells, header has ${width}`);
    return row;
  });
  return { header, rows, align: delimiters.map(alignOf) };
};
