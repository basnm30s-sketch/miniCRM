"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
describe('General Utilities', () => {
    describe('cn (ClassName utility)', () => {
        test('should merge class names correctly', () => {
            expect((0, utils_1.cn)('px-2', 'py-1')).toBe('px-2 py-1');
        });
        test('should handle conditional classes', () => {
            const isActive = true;
            const isExternal = false;
            expect((0, utils_1.cn)('base', isActive && 'active', isExternal && 'external')).toBe('base active');
        });
        test('should handle arrays and objects if supported (clsx behavior)', () => {
            expect((0, utils_1.cn)(['foo', 'bar'])).toBe('foo bar');
            expect((0, utils_1.cn)({ foo: true, bar: false })).toBe('foo');
        });
        test('should merge tailwind conflicts correctly', () => {
            // p-4 should override p-2
            expect((0, utils_1.cn)('p-2', 'p-4')).toBe('p-4');
            // text-red-500 should override text-blue-500
            expect((0, utils_1.cn)('text-blue-500', 'text-red-500')).toBe('text-red-500');
        });
    });
});
