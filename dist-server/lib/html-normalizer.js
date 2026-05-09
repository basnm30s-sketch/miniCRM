"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRichTextHtml = normalizeRichTextHtml;
exports.normalizeOptionalRichTextHtml = normalizeOptionalRichTextHtml;
/**
 * Normalize rich-text HTML into a fragment-safe string.
 * Strips full-document wrappers that can break React hydration/rendering.
 */
function normalizeRichTextHtml(input) {
    if (typeof input !== 'string')
        return '';
    let value = input.trim();
    if (!value)
        return '';
    value = value
        .replace(/<!doctype[^>]*>/gi, '')
        .replace(/<html[^>]*>/gi, '')
        .replace(/<\/html>/gi, '')
        .replace(/<head[\s\S]*?<\/head>/gi, '');
    const bodyMatch = value.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
        value = bodyMatch[1];
    }
    return value.trim();
}
function normalizeOptionalRichTextHtml(input) {
    if (input === null || input === undefined)
        return undefined;
    const normalized = normalizeRichTextHtml(input);
    return normalized.length > 0 ? normalized : '';
}
