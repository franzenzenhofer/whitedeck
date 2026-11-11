import { inlineVisibleText } from './parse/inline.js';
import { dummyStringsIn } from './theme/dummy.js';
const FINDING_VERB = /\b(fell|falls|fall|rose|rises|lost|loses|dropped|drops|grew|grows|doubled|halved|increased|decreased|declined|gained|jumped|surged|plunged|collapsed|recovered|tripled)\b/i;
const PERCENT_TOKEN = /[-+]?\d+(?:[.,]\d+)?\s*(?:%|pp\b)/g;
/* An absolute: a number with thousands separators, 3+ digits, or a k / M / bn suffix. */
const ABSOLUTE = /\d{1,3}(?:,\d{3})+|\d{3,}|\d+(?:\.\d+)?\s?(?:k|K|M|bn)\b/;
const COMPACT_RANGE = /\d+(?:[.,]\d+)?\s*-\s*\d+(?:[.,]\d+)?\s*%/;
const headlineWarnings = (slide, where) => {
    const title = inlineVisibleText(slide.title ?? '');
    const warnings = [];
    const verb = FINDING_VERB.exec(title);
    if (verb !== null)
        warnings.push(`${where}: headline has the finding verb "${verb[0]}" - say what is shown, put the finding in Conclusion:`);
    if (title.includes('%'))
        warnings.push(`${where}: headline has a % - the number belongs in Conclusion:`);
    return warnings;
};
const conclusionErrors = (slide, where) => {
    const conclusion = inlineVisibleText(slide.conclusion ?? '');
    const errors = [];
    if (conclusion.includes('%') && !ABSOLUTE.test(conclusion.replace(PERCENT_TOKEN, ''))) {
        errors.push(`${where}: conclusion has a % without its absolute numbers ("40 % (1.2M of 3.0M)")`);
    }
    const range = COMPACT_RANGE.exec(conclusion);
    if (range !== null)
        errors.push(`${where}: write the range "${range[0]}" out with units ("13 % to 16 %")`);
    return errors;
};
export const lintDeck = (deck) => {
    const errors = [];
    const warnings = [];
    deck.slides.forEach((slide, index) => {
        const where = `slide ${index + 1}`;
        errors.push(...dummyStringsIn(JSON.stringify(slide)).map((dummy) => `${where}: theme dummy text "${dummy}"`));
        if (slide.layout !== 'data')
            return;
        warnings.push(...headlineWarnings(slide, where));
        errors.push(...conclusionErrors(slide, where));
    });
    return { errors, warnings };
};
