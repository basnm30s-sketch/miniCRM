"use strict";
/**
 * Express API Server for iManage
 * Handles all database operations and file uploads
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const database_1 = require("../lib/database");
// Import routes
const customers_1 = __importDefault(require("./routes/customers"));
const vendors_1 = __importDefault(require("./routes/vendors"));
const employees_1 = __importDefault(require("./routes/employees"));
const vehicles_1 = __importDefault(require("./routes/vehicles"));
const quotes_1 = __importDefault(require("./routes/quotes"));
const purchase_orders_1 = __importDefault(require("./routes/purchase-orders"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const admin_1 = __importDefault(require("./routes/admin"));
const uploads_1 = __importDefault(require("./routes/uploads"));
const payslips_1 = __importDefault(require("./routes/payslips"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' })); // Increased limit for large requests
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Initialize database
try {
    (0, database_1.initDatabase)();
    console.log('✓ Database initialized successfully');
}
catch (error) {
    console.error('✗ Failed to initialize database:', error);
    console.error('Continuing without database (will use client-side storage)...');
    // Don't exit - allow server to run without database
}
// ============================================
// SERVE STATIC FRONTEND BUILD (CRITICAL FOR ELECTRON)
// ============================================
// In packaged mode, __dirname is dist-server/api/, so we need to go up two levels
// to get to the app root where 'out' folder is located
const frontendPath = path_1.default.join(__dirname, '..', '..', 'out');
console.log('[Server] Serving static files from:', frontendPath);
// Serve static assets (CSS, JS, images, fonts) with correct MIME types
app.use(express_1.default.static(frontendPath, {
    setHeaders: (res, filePath) => {
        // Ensure correct MIME types for assets
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
        else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
        else if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
        }
        else if (filePath.endsWith('.woff2')) {
            res.setHeader('Content-Type', 'font/woff2');
        }
        else if (filePath.endsWith('.woff')) {
            res.setHeader('Content-Type', 'font/woff');
        }
    }
}));
// API Routes
app.use('/api/customers', customers_1.default);
app.use('/api/vendors', vendors_1.default);
app.use('/api/employees', employees_1.default);
app.use('/api/vehicles', vehicles_1.default);
app.use('/api/quotes', quotes_1.default);
app.use('/api/purchase-orders', purchase_orders_1.default);
app.use('/api/invoices', invoices_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/uploads', uploads_1.default);
app.use('/api/payslips', payslips_1.default);
console.log('Payslips routes registered at /api/payslips');
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API server is running' });
});
// ============================================
// SPA CATCH-ALL ROUTE (MUST BE AFTER API ROUTES)
// ============================================
// For client-side routes like /customers, /invoices, etc.
// This allows Next.js client-side routing to work
// Note: Express 5 requires named wildcard parameter syntax
app.get('/{*splat}', (req, res, next) => {
    // Skip if it's an API route (already handled above)
    if (req.path.startsWith('/api/')) {
        return next();
    }
    // Serve index.html for all other routes (SPA catch-all)
    const indexPath = path_1.default.join(frontendPath, 'index.html');
    console.log('[Server] Catch-all route hit:', req.path, '-> serving index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('[Server] Error serving index.html:', err);
            res.status(500).send('Error loading application');
        }
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});
// Start server
if (require.main === module) {
    const server = app.listen(PORT, () => {
        console.log('========================================');
        console.log(`✓ API server running on http://localhost:${PORT}`);
        console.log(`✓ Frontend path: ${path_1.default.join(__dirname, '..', 'out')}`);
        console.log(`✓ Node version: ${process.version}`);
        console.log(`✓ Process ID: ${process.pid}`);
        console.log('========================================');
    });
    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`✗ Port ${PORT} is already in use`);
            console.error('Another instance may be running');
        }
        else {
            console.error('✗ Server error:', error);
        }
        process.exit(1);
    });
    // Handle process termination
    process.on('SIGTERM', () => {
        console.log('SIGTERM received, closing server...');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });
    process.on('SIGINT', () => {
        console.log('SIGINT received, closing server...');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });
}
exports.default = app;
