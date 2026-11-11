import { type PtRect, type PtText } from './scope.js';
/** Headline box; its width is what the tags and logos leave free. */
export declare const DATA_HEADLINE: PtText;
/** A headline shrinks on one line down to this size, then wraps to two lines (down to DATA_HEADLINE_MIN_PT). */
export declare const DATA_HEADLINE_ONE_LINE_MIN_PT = 40;
export declare const DATA_HEADLINE_GLYPH_EM = 0.54;
export declare const DATA_HEADLINE_MIN_PT = 32;
/** The headline never gets narrower than this; more tags/logos is a build error. */
export declare const DATA_HEADLINE_MIN_W = 760;
/** Tags + logos: one row, right-aligned at the margin, centred on this y. */
export declare const DATA_CLUSTER: {
    readonly right: number;
    readonly centerY: 82;
    readonly gap: 18;
    readonly headlineGap: 36;
};
export declare const DATA_PILL: {
    readonly h: 46;
    readonly sizePt: 24;
    readonly padX: 22;
    readonly font: "medium";
    readonly fill: "#e8eaed";
    readonly color: "#3c4043";
    readonly glyphEm: 0.56;
};
export declare const DATA_LOGO: {
    readonly wordmarkH: 42;
    readonly stackedH: 64;
    readonly stackedAspect: 3;
    readonly iconH: 46;
    readonly labelSizePt: 24;
    readonly labelGap: 10;
    readonly labelColor: "#5e5e5e";
    readonly glyphEm: 0.56;
};
export declare const DATA_CONTEXT: PtText;
export declare const DATA_CONCLUSION: PtText;
export declare const DATA_CONCLUSION_MIN_PT = 24;
/** Evidence band: images, table, or bullets. */
export declare const DATA_BODY: PtRect;
export declare const DATA_IMAGE_GAP = 36;
export declare const DATA_TABLE: {
    readonly sizePt: 24;
    readonly minPt: 16;
    readonly rowEm: 1.9;
    readonly padPt: 10;
    readonly gapAbove: 24;
    readonly headerFill: "#f2f2f2";
    readonly border: "#c8c8c8";
    readonly borderPt: 1;
    readonly color: "#000000";
};
/** Change values in tables: red / green, grey below this many % or pp (Google palette). */
export declare const DATA_CHANGE: {
    readonly negative: "#d93025";
    readonly positive: "#188038";
    readonly same: "#80868b";
    readonly sameBelow: 1;
};
export declare const DATA_BULLETS: {
    readonly sizePt: 40;
    readonly minPt: 24;
    readonly spaceBeforePt: 24;
    readonly indentPt: 40;
    readonly bulletSizePct: 125;
};
/** Source line; stops short of the deck logo bottom-right. */
export declare const DATA_SOURCE: PtText;
