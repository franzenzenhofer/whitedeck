import type { Deck, DeckSlide } from './parse/deck.js';
import { inlineVisibleText } from './parse/inline.js';
import { dummyStringsIn } from './theme/dummy.js';

/*
 * `whitedeck validate` beyond parsing: the editorial rules of the skill's section
 * "HEADLINE = WHAT WE LOOK AT, CONCLUSION BELOW IT", checked on data slides.
 * - headline: says WHAT is shown, never the finding -> warning on a finding verb or a %
 * - conclusion: every % with its absolute numbers -> error on a % without an absolute
 * - ranges written out with units ("13 % to 16 %") -> error on "13-16 %" / "13 - 16 %"
 * A data slide without a conclusion line never gets here: the parser rejects it.
 */
export interface LintReport {
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

const FINDING_VERB =
  /\b(fell|falls|fall|rose|rises|lost|loses|dropped|drops|grew|grows|doubled|halved|increased|decreased|declined|gained|jumped|surged|plunged|collapsed|recovered|tripled)\b/i;
const PERCENT_TOKEN = /[-+]?\d+(?:[.,]\d+)?\s*(?:%|pp\b)/g;
/* An absolute: a number with thousands separators, 3+ digits, or a k / M / bn suffix. */
const ABSOLUTE = /\d{1,3}(?:,\d{3})+|\d{3,}|\d+(?:\.\d+)?\s?(?:k|K|M|bn)\b/;
const COMPACT_RANGE = /\d+(?:[.,]\d+)?\s*-\s*\d+(?:[.,]\d+)?\s*%/;

const headlineWarnings = (slide: DeckSlide, where: string): string[] => {
  const title = inlineVisibleText(slide.title ?? '');
  const warnings: string[] = [];
  const verb = FINDING_VERB.exec(title);
  if (verb !== null) warnings.push(`${where}: headline has the finding verb "${verb[0]}" - say what is shown, put the finding in Conclusion:`);
  if (title.includes('%')) warnings.push(`${where}: headline has a % - the number belongs in Conclusion:`);
  return warnings;
};

const conclusionErrors = (slide: DeckSlide, where: string): string[] => {
  const conclusion = inlineVisibleText(slide.conclusion ?? '');
  const errors: string[] = [];
  if (conclusion.includes('%') && !ABSOLUTE.test(conclusion.replace(PERCENT_TOKEN, ''))) {
    errors.push(`${where}: conclusion has a % without its absolute numbers ("40 % (1.2M of 3.0M)")`);
  }
  const range = COMPACT_RANGE.exec(conclusion);
  if (range !== null) errors.push(`${where}: write the range "${range[0]}" out with units ("13 % to 16 %")`);
  return errors;
};

export const lintDeck = (deck: Deck): LintReport => {
  const errors: string[] = [];
  const warnings: string[] = [];
  deck.slides.forEach((slide, index) => {
    const where = `slide ${index + 1}`;
    errors.push(...dummyStringsIn(JSON.stringify(slide)).map((dummy) => `${where}: theme dummy text "${dummy}"`));
    if (slide.layout !== 'data') return;
    warnings.push(...headlineWarnings(slide, where));
    errors.push(...conclusionErrors(slide, where));
  });
  return { errors, warnings };
};
