'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryProvider = QueryProvider;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_query_1 = require("@tanstack/react-query");
const react_1 = require("react");
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
    return (0, jsx_runtime_1.jsx)(react_query_1.QueryClientProvider, { client: queryClient, children: children });
}
