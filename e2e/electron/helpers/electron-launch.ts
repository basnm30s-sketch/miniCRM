import { _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';

const DEFAULT_LAUNCH_OPTIONS = {
    args: ['.'],
    env: {
        ...process.env,
        NODE_ENV: 'development',
    },
};

/** Patterns that indicate a critical console error (fail the test). */
const CRITICAL_PATTERNS = [
    /Uncaught\s+/i,
    /React\s+Error\s+Boundary/i,
    /Cannot\s+read\s+(properties?\s+of\s+)?(undefined|null)/i,
    /undefined\s+is\s+not\s+(an\s+object|a\s+function)/i,
    /is\s+not\s+a\s+function/i,
    /Failed\s+to\s+fetch/i,
    /NetworkError/i,
    /Error:\s+/i,
    /TypeError:/i,
    /ReferenceError:/i,
];

/** Patterns to ignore (dev tools, known harmless, or transient in E2E). */
const IGNORE_PATTERNS = [
    /Download\s+the\s+React\s+DevTools/i,
    /\[HMR\]/i,
    /\[webpack\]/i,
    /API\s+Request\s+error\s+for\s+.*:\s*Failed\s+to\s+fetch/i,
    /Failed\s+to\s+fetch/i,
    /Failed\s+to\s+get\s+(employees|invoices|admin|vehicle-transactions|vehicles|payslips|customers|quotes)/i,
];

/**
 * Returns true if the console message text should be treated as critical.
 */
export function criticalErrorFilter(text: string, allowlist?: RegExp[]): boolean {
    const normalized = (text || '').trim();
    if (!normalized) return false;
    for (const re of IGNORE_PATTERNS) {
        if (re.test(normalized)) return false;
    }
    if (allowlist) {
        for (const re of allowlist) {
            if (re.test(normalized)) return false;
        }
    }
    for (const re of CRITICAL_PATTERNS) {
        if (re.test(normalized)) return true;
    }
    return false;
}

export interface ConsoleCapture {
    getErrors(): string[];
    clearErrors(): void;
    assertNoCriticalErrors(allowlist?: RegExp[]): void;
}

/**
 * Attach console listener to the Electron window and collect errors.
 */
export function captureConsoleErrors(window: Page): ConsoleCapture {
    const errors: string[] = [];
    const handler = (msg: { type: () => string; text: () => string }) => {
        const type = msg.type();
        if (type === 'error') {
            errors.push(msg.text());
        }
    };
    window.on('console', handler);
    return {
        getErrors: () => [...errors],
        clearErrors: () => errors.length = 0,
        assertNoCriticalErrors(allowlist?: RegExp[]) {
            const critical = errors.filter(t => criticalErrorFilter(t, allowlist));
            if (critical.length > 0) {
                throw new Error(
                    `Critical console errors (${critical.length}):\n${critical.map(e => `  - ${e}`).join('\n')}`
                );
            }
        },
    };
}

export interface LaunchResult {
    electronApp: ElectronApplication;
    window: Page;
}

/**
 * Launch the Electron app and return app and first window.
 */
export async function launchElectronApp(
    options?: { args?: string[]; env?: NodeJS.ProcessEnv }
): Promise<LaunchResult> {
    const electronApp = await electron.launch({
        ...DEFAULT_LAUNCH_OPTIONS,
        ...options,
    });
    const window = await electronApp.firstWindow();
    return { electronApp, window };
}

/** Base URL for the Electron app (Next/Express server). */
export const ELECTRON_BASE_URL = 'http://localhost:3001';
