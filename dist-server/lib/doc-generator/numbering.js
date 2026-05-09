"use strict";
// Shared numbering utility for doc-generator screens (quotes, invoices, POs).
//
// Generates the next sequential document number in the form `${prefix}-NNN` by
// scanning existing record numbers, taking the max numeric tail, and returning
// max + 1 (zero-padded to 3 digits). Non-conforming values in the input list
// are ignored, so user-entered freeform numbers do not break the sequence.
//
// The "edit becomes new last" behaviour is implicit: once an edited record is
// saved, its number is in the input list on the next call, so the next
// auto-generated number naturally picks up from there.
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeNextDocNumber = computeNextDocNumber;
const PAD_WIDTH = 3;
function computeNextDocNumber(prefix, existingNumbers, startingFloor = 1) {
    const re = new RegExp(`^${prefix}-(\\d+)$`, 'i');
    let max = startingFloor - 1;
    for (const value of existingNumbers) {
        const match = (value ?? '').match(re);
        if (!match)
            continue;
        const parsed = parseInt(match[1], 10);
        if (Number.isFinite(parsed) && parsed > max) {
            max = parsed;
        }
    }
    return `${prefix}-${String(max + 1).padStart(PAD_WIDTH, '0')}`;
}
