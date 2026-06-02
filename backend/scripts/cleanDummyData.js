/**
 * cleanDummyData.js
 * Safe database cleanup script to remove dummy/transactional data while preserving master data.
 * This script truncates operational tables but preserves Users and SystemConfig.
 *
 * Usage: node backend/cleanDummyData.js
 */

const sequelize = require('../config/db');

const cleanData = async () => {
    try {
        console.log('[CleanData] Connecting to database...');
        await sequelize.authenticate();
        console.log('[CleanData] Database connection established.\n');

        // Transactional tables to truncate (order matters for foreign key dependencies)
        const tablesToTruncate = [
            'Vouchers',              // Gamification vouchers
            'CorrectiveActions',     // CAPA records
            'HazardReports',         // Hazard reports
            'IncidentReports',       // Incident reports
            'WorkPermits',           // e-PTW permits
            'Attendances',           // Attendance records
            'LeaveRequests',         // Leave/Izin requests
            'Certifications',        // Safety certifications
            'Audits',               // Audit records
            'AuditLogs',            // Audit trail logs
            'EmergencyCalls',       // Emergency SOS calls
            'FatigueLogs',          // Fatigue monitoring logs
            'ContractorCSMS',       // Contractor safety management
        ];

        console.log('[CleanData] Starting cleanup of transactional tables...\n');

        for (const table of tablesToTruncate) {
            try {
                await sequelize.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
                console.log(`[CleanData] ✓ ${table} - Cleared (ID reset to 1)`);
            } catch (err) {
                console.error(`[CleanData] ✗ ${table} - Failed: ${err.message}`);
            }
        }

        console.log('\n[CleanData] ==========================================');
        console.log('[CleanData] Cleanup complete!');
        console.log('[CleanData] - Transactional data removed');
        console.log('[CleanData] - Auto-increment IDs reset to 1');
        console.log('[CleanData] - Users and SystemConfig PRESERVED');
        console.log('[CleanData] ==========================================\n');

        process.exit(0);
    } catch (error) {
        console.error('[CleanData] Fatal error:', error.message);
        process.exit(1);
    }
};

cleanData();
