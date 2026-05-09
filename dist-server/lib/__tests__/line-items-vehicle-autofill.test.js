"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vehicle_autofill_1 = require("../line-items/vehicle-autofill");
const vehicles = [
    {
        id: 'veh-A',
        vehicleNumber: 'AAA-111',
        vehicleType: 'Truck',
        make: 'Volvo',
        model: 'FH16',
        year: 2020,
        basePrice: 1000,
        description: 'Vehicle A description',
    },
    {
        id: 'veh-B',
        vehicleNumber: 'BBB-222',
        vehicleType: 'Pickup',
        make: 'Toyota',
        model: 'Hilux',
        year: 2022,
        basePrice: 500,
        description: 'Vehicle B description',
    },
    {
        id: 'veh-no-desc',
        vehicleNumber: 'NDESC-333',
        vehicleType: 'Van',
        make: 'Ford',
        model: 'Transit',
        year: 2021,
        basePrice: 750,
        description: null,
    },
    {
        id: 'veh-no-price',
        vehicleNumber: 'NPRICE-444',
        vehicleType: 'Sedan',
        make: 'Honda',
        model: 'Civic',
        year: 2019,
        basePrice: null,
        description: 'No price vehicle',
    },
];
describe('computeVehicleAutofillPatch', () => {
    describe('selecting a vehicle on an empty line item', () => {
        test('populates description, metadata, and rate from the master record', () => {
            const patch = (0, vehicle_autofill_1.computeVehicleAutofillPatch)({
                vehicles,
                field: 'vehicleNumber',
                value: 'AAA-111',
            });
            expect(patch).toMatchObject({
                vehicleNumber: 'AAA-111',
                vehicleTypeId: 'veh-A',
                vehicleTypeLabel: 'Truck',
                vehicleType: 'Truck',
                make: 'Volvo',
                model: 'FH16',
                year: 2020,
                basePrice: 1000,
                description: 'Vehicle A description',
                unitPrice: 1000,
            });
        });
    });
    describe('switching vehicles (regression for the reported bug)', () => {
        test('overwrites description when switching from vehicle A to vehicle B', () => {
            const fromA = (0, vehicle_autofill_1.computeVehicleAutofillPatch)({
                vehicles,
                field: 'vehicleNumber',
                value: 'AAA-111',
            });
            expect(fromA.description).toBe('Vehicle A description');
            const fromB = (0, vehicle_autofill_1.computeVehicleAutofillPatch)({
                vehicles,
                field: 'vehicleNumber',
                value: 'BBB-222',
            });
            expect(fromB.description).toBe('Vehicle B description');
        });
        test("overwrites unitPrice with new vehicle's basePrice even when previously set", () => {
            const fromB = (0, vehicle_autofill_1.computeVehicleAutofillPatch)({
                vehicles,
                field: 'vehicleNumber',
                value: 'BBB-222',
            });
            expect(fromB.unitPrice).toBe(500);
            expect(fromB.basePrice).toBe(500);
        });
        test('switching to a vehicle with null description sets description to empty string', () => {
            const patch = (0, vehicle_autofill_1.computeVehicleAutofillPatch)({
                vehicles,
                field: 'vehicleNumber',
                value: 'NDESC-333',
            });
            expect(patch.description).toBe('');
        });
        test('switching to a vehicle with null basePrice sets unitPrice to 0', () => {
            const patch = (0, vehicle_autofill_1.computeVehicleAutofillPatch)({
                vehicles,
                field: 'vehicleNumber',
                value: 'NPRICE-444',
            });
            expect(patch.unitPrice).toBe(0);
            expect(patch.basePrice).toBeNull();
        });
    });
    describe('clearing the vehicle', () => {
        test('clears all auto-filled fields when value is empty string', () => {
            const patch = (0, vehicle_autofill_1.computeVehicleAutofillPatch)({
                vehicles,
                field: 'vehicleNumber',
                value: '',
            });
            expect(patch).toEqual({
                vehicleNumber: '',
                vehicleTypeId: '',
                vehicleTypeLabel: '',
                vehicleType: null,
                make: null,
                model: null,
                year: null,
                basePrice: null,
                description: '',
                unitPrice: 0,
            });
        });
        test('PO "Manual Entry" sentinel "__manual__" behaves the same as clearing', () => {
            const patch = (0, vehicle_autofill_1.computeVehicleAutofillPatch)({
                vehicles,
                field: 'vehicleNumber',
                value: '__manual__',
            });
            expect(patch.description).toBe('');
            expect(patch.unitPrice).toBe(0);
            expect(patch.vehicleNumber).toBe('');
            expect(patch.vehicleTypeId).toBe('');
            expect(patch.vehicleType).toBeNull();
            expect(patch.make).toBeNull();
            expect(patch.model).toBeNull();
            expect(patch.year).toBeNull();
            expect(patch.basePrice).toBeNull();
        });
    });
    describe('value with no matching vehicle', () => {
        test('only updates the field the user typed into; preserves existing manual entries', () => {
            const patch = (0, vehicle_autofill_1.computeVehicleAutofillPatch)({
                vehicles,
                field: 'vehicleNumber',
                value: 'UNKNOWN-999',
            });
            expect(patch).toEqual({ vehicleNumber: 'UNKNOWN-999' });
            expect(patch.description).toBeUndefined();
            expect(patch.unitPrice).toBeUndefined();
            expect(patch.make).toBeUndefined();
        });
    });
    describe('legacy vehicleTypeId path (Quote / PO)', () => {
        test('selecting via vehicleTypeId sets vehicleNumber from the matched vehicle', () => {
            const patch = (0, vehicle_autofill_1.computeVehicleAutofillPatch)({
                vehicles,
                field: 'vehicleTypeId',
                value: 'veh-B',
            });
            expect(patch.vehicleTypeId).toBe('veh-B');
            expect(patch.vehicleNumber).toBe('BBB-222');
            expect(patch.description).toBe('Vehicle B description');
            expect(patch.unitPrice).toBe(500);
        });
        test('clearing via vehicleTypeId also clears vehicleNumber', () => {
            const patch = (0, vehicle_autofill_1.computeVehicleAutofillPatch)({
                vehicles,
                field: 'vehicleTypeId',
                value: '',
            });
            expect(patch.vehicleNumber).toBe('');
            expect(patch.vehicleTypeId).toBe('');
        });
    });
});
describe('recomputeLineTotals', () => {
    test('produces correct totals for typical inputs', () => {
        const result = (0, vehicle_autofill_1.recomputeLineTotals)({
            quantity: 3,
            unitPrice: 100,
            taxPercent: 5,
        });
        expect(result.grossAmount).toBe(300);
        expect(result.lineTaxAmount).toBe(15);
        expect(result.lineTotal).toBe(315);
    });
    test('handles zero taxPercent', () => {
        const result = (0, vehicle_autofill_1.recomputeLineTotals)({
            quantity: 2,
            unitPrice: 50,
            taxPercent: 0,
        });
        expect(result.grossAmount).toBe(100);
        expect(result.lineTaxAmount).toBe(0);
        expect(result.lineTotal).toBe(100);
    });
    test('handles null taxPercent (treats as 0)', () => {
        const result = (0, vehicle_autofill_1.recomputeLineTotals)({
            quantity: 2,
            unitPrice: 50,
            taxPercent: null,
        });
        expect(result.lineTaxAmount).toBe(0);
        expect(result.lineTotal).toBe(100);
    });
    test('handles undefined taxPercent (treats as 0)', () => {
        const result = (0, vehicle_autofill_1.recomputeLineTotals)({
            quantity: 4,
            unitPrice: 25,
        });
        expect(result.grossAmount).toBe(100);
        expect(result.lineTaxAmount).toBe(0);
        expect(result.lineTotal).toBe(100);
    });
    test('handles zero quantity / unitPrice', () => {
        const result = (0, vehicle_autofill_1.recomputeLineTotals)({
            quantity: 0,
            unitPrice: 100,
            taxPercent: 5,
        });
        expect(result.grossAmount).toBe(0);
        expect(result.lineTaxAmount).toBe(0);
        expect(result.lineTotal).toBe(0);
    });
    test('preserves additional fields on the input item', () => {
        const result = (0, vehicle_autofill_1.recomputeLineTotals)({
            id: 'line-1',
            description: 'foo',
            quantity: 1,
            unitPrice: 10,
            taxPercent: 0,
        });
        expect(result.id).toBe('line-1');
        expect(result.description).toBe('foo');
    });
});
