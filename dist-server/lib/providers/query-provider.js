'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryProvider = QueryProvider;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_query_1 = require("@tanstack/react-query");
const react_1 = require("react");
function QueryEventBridge({ queryClient }) {
    (0, react_1.useEffect)(() => {
        if (typeof window === 'undefined')
            return;
        const handleAdminSettingsUpdated = () => {
            queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
        };
        const handleDataUpdated = (event) => {
            const e = event;
            const entity = e?.detail?.entity;
            if (!entity)
                return;
            queryClient.invalidateQueries({ queryKey: [entity] });
        };
        window.addEventListener('adminSettingsUpdated', handleAdminSettingsUpdated);
        window.addEventListener('dataUpdated', handleDataUpdated);
        return () => {
            window.removeEventListener('adminSettingsUpdated', handleAdminSettingsUpdated);
            window.removeEventListener('dataUpdated', handleDataUpdated);
        };
    }, [queryClient]);
    return null;
}
function QueryProvider({ children }) {
    const [queryClient] = (0, react_1.useState)(() => new react_query_1.QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 5, // 5 minutes
                gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
                refetchOnWindowFocus: false,
                retry: 1,
            },
        },
    }));
    return ((0, jsx_runtime_1.jsxs)(react_query_1.QueryClientProvider, { client: queryClient, children: [(0, jsx_runtime_1.jsx)(QueryEventBridge, { queryClient: queryClient }), children] }));
}
