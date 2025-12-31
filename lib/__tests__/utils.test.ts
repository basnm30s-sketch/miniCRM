import { cn } from '../utils';

describe('General Utilities', () => {
    describe('cn (ClassName utility)', () => {
        test('should merge class names correctly', () => {
            expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
        });

        test('should handle conditional classes', () => {
            const isActive = true;
            const isExternal = false;
            expect(cn('base', isActive && 'active', isExternal && 'external')).toBe('base active');
        });

        test('should handle arrays and objects if supported (clsx behavior)', () => {
            expect(cn(['foo', 'bar'])).toBe('foo bar');
            expect(cn({ foo: true, bar: false })).toBe('foo');
        });

        test('should merge tailwind conflicts correctly', () => {
            // p-4 should override p-2
            expect(cn('p-2', 'p-4')).toBe('p-4');
            // text-red-500 should override text-blue-500
            expect(cn('text-blue-500', 'text-red-500')).toBe('text-red-500');
        });
    });
});
