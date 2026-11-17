import { DATA_TABLE } from '../theme/data.js';

/*
 * Role colours in tables (W11 QA, 17 Nov 2026, T3): the IS24 task anatomy paints what IS red and what SHOULD be green,
 * and answer words stand out.
 * - a row whose first cell is "IS" (or starts "IS (") -> its other cells red; "SHOULD" -> green
 * - a column whose header is exactly "IS" -> red cells; exactly "SHOULD", "change", "change to pass" -> green cells
 *   (a label column such as "change (Search Console)" stays ink)
 * - an answer cell ("YES", "NO", "YES, negative", "YES, positive", "PASS", "FAIL") -> bold; red when negative / FAIL,
 *   green when positive / PASS
 * Cells the author coloured ([x]{#hex}) or that already carry a change colour stay as written.
 */
const RED_ROW = /^IS\b/;
const GREEN_ROW = /^SHOULD\b/;
const RED_HEAD = /^IS$/;
const GREEN_HEAD = /^(SHOULD|change|change to pass)$/i;
const ANSWER = /^(YES(, (negative|positive))?|NO|PASS|FAIL)$/;

const coloured = (cell: string): boolean => /\]\{#[0-9A-Fa-f]{6}\}/.test(cell);
const LINK = /(\[[^\]]*\]\([^)]*\))/;
/* Plain text runs take the colour; a link inside the cell stays a (blue, underlined) link. */
const paint = (cell: string, hex: string): string => {
  if (cell.trim() === '' || coloured(cell)) return cell;
  return cell
    .trim()
    .split(LINK)
    .map((part) => (part === '' || LINK.test(part) || part.trim() === '' ? part : `[${part}]{${hex}}`))
    .join('');
};

const answer = (cell: string): string => {
  const word = cell.trim();
  if (!ANSWER.test(word)) return cell;
  if (/negative|FAIL/.test(word)) return `**[${word}]{${DATA_TABLE.is}}**`;
  if (/positive|PASS/.test(word)) return `**[${word}]{${DATA_TABLE.should}}**`;
  return `**${word}**`;
};

export const colourRoles = (header: readonly string[], rows: readonly (readonly string[])[]): string[][] => {
  const headRole = header.map((h) => (RED_HEAD.test(h.trim()) ? DATA_TABLE.is : GREEN_HEAD.test(h.trim()) ? DATA_TABLE.should : undefined));
  return rows.map((row) => {
    const first = (row[0] ?? '').replace(/\*/g, '').trim();
    const rowRole = RED_ROW.test(first) ? DATA_TABLE.is : GREEN_ROW.test(first) ? DATA_TABLE.should : undefined;
    return row.map((cell, col) => {
      const role = col > 0 ? (rowRole ?? headRole[col]) : undefined;  // the first column is the row label
      return role === undefined ? answer(cell) : paint(cell, role);
    });
  });
};
