"use strict";
/**
 * Shared line-item helper for the Quote / Invoice / Purchase Order forms.
 *
 * When the user picks a vehicle on a line item, the form must auto-fill
 * description, rate, and the cached vehicle metadata. Previously this
 * logic was duplicated in three forms and contained `if (!description)` /
 * `if (unitPrice === 0)` guards that prevented the second vehicle from
 * overwriting the first one's values.
 *
 * The semantics implemented here are:
 *
 *   - Vehicle selected (matching record found): overwrite every
 *     auto-fillable field (description, vehicleType, vehicleTypeId,
 *     vehicleTypeLabel, make, model, year, basePrice, unitPrice) from the
 *     master record, regardless of the current value.
 *   - Vehicle cleared (empty value, or PO's `__manual__` sentinel): clear
 *     every auto-fillable field and reset unitPrice to 0.
 *   - Non-empty value but no matching vehicle in the list: only the field
 *     the user typed into is updated. Existing manual entries are kept.
 *
 * Callers should always recompute the line totals after applying the
 * patch when the vehicle field changed, since unitPrice may have been
 * overwritten or zeroed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeVehicleAutofillPatch = computeVehicleAutofillPatch;
exports.recomputeLineTotals = recomputeLineTotals;
const MANUAL_SENTINELS = new Set(['', '__manual__']);
function buildClearPatch(field, value) {
    return {
        [field]: value === '__manual__' ? '' : value,
        vehicleNumber: field === 'vehicleNumber' ? (value === '__manual__' ? '' : value) : '',
        vehicleTypeId: field === 'vehicleTypeId' ? (value === '__manual__' ? '' : value) : '',
        vehicleTypeLabel: '',
        vehicleType: null,
        make: null,
        model: null,
        year: null,
        basePrice: null,
        description: '',
        unitPrice: 0,
    };
}
function buildOverwritePatch(vehicle, field) {
    const vehicleNumber = vehicle.vehicleNumber ?? '';
    const vehicleTypeLabel = vehicle.vehicleType || vehicle.vehicleNumber || '';
    const patch = {
        vehicleTypeId: vehicle.id,
        vehicleTypeLabel,
        vehicleType: vehicle.vehicleType ?? null,
        make: vehicle.make ?? null,
        model: vehicle.model ?? null,
        year: vehicle.year ?? null,
        basePrice: vehicle.basePrice ?? null,
        description: vehicle.description ?? '',
        unitPrice: vehicle.basePrice ?? 0,
    };
    // Always sync vehicleNumber so legacy code paths (selecting via
    // vehicleTypeId) keep both identifiers in sync.
    patch.vehicleNumber = vehicleNumber;
    if (field === 'vehicleNumber') {
        patch.vehicleNumber = vehicleNumber;
    }
    return patch;
}
/**
 * Compute the patch to apply to a line item when the user changes its
 * vehicle. See file-level comment for behaviour rules.
 */
function computeVehicleAutofillPatch(input) {
    const { vehicles, field, value } = input;
    if (MANUAL_SENTINELS.has(value)) {
        return buildClearPatch(field, value);
    }
    const vehicle = vehicles.find((v) => field === 'vehicleNumber' ? v.vehicleNumber === value : v.id === value);
    if (!vehicle) {
        // Unknown value — preserve existing manual edits, only update the
        // field the user typed into.
        return { [field]: value };
    }
    return buildOverwritePatch(vehicle, field);
}
/**
 * Pure helper to recompute the per-line totals. Callers should run this
 * after applying a vehicle autofill patch (since unitPrice may have
 * changed) and after manual quantity / unitPrice / taxPercent edits.
 */
function recomputeLineTotals(item) {
    const quantity = item.quantity ?? 0;
    const unitPrice = item.unitPrice ?? 0;
    const taxPercent = item.taxPercent ?? 0;
    const grossAmount = quantity * unitPrice;
    const lineTaxAmount = grossAmount * (taxPercent / 100);
    const lineTotal = grossAmount + lineTaxAmount;
    return {
        ...item,
        grossAmount,
        lineTaxAmount,
        lineTotal,
    };
}
