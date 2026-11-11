import { parseInline } from '../parse/inline.js';
import { imageSize } from './geometry.js';
/** Pixel size of a picture, or a loud error naming the file. */
export const requireImageSize = (path) => {
    const size = imageSize(path);
    if (size === undefined || size.w === 0 || size.h === 0) {
        throw new Error(`image is not a readable PNG or JPEG: ${path}`);
    }
    return size;
};
/** Contain-fit an image into a frame; a right-aligned fit keeps the right edge. */
export const fitInto = (path, frame, alignRight = false) => {
    const size = requireImageSize(path);
    const scale = Math.min(frame.w / size.w, frame.h / size.h);
    const w = size.w * scale;
    const h = size.h * scale;
    const x = alignRight ? frame.x + frame.w - w : frame.x + (frame.w - w) / 2;
    return { x, y: frame.y + (frame.h - h) / 2, w, h };
};
export const text = (box, value) => ({ kind: 'text', box, text: value });
/** The first link target in inline markdown: a picture links to where its data lives. */
export const firstUrl = (value) => value === undefined ? undefined : parseInline(value).find((seg) => seg.url !== undefined)?.url;
