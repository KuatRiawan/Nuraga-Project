/**
 * Ensures PostgreSQL FK constraints honor ON DELETE CASCADE / SET NULL
 * when an Admin deletes a User (C3).
 *
 * Safe to re-run: drops named constraints if present, then re-adds them.
 */

const USER_CHILD_CASCADE = [
    { table: 'HazardReports', column: 'id_user' },
    { table: 'IncidentReports', column: 'id_user' },
    { table: 'Certifications', column: 'id_user' },
    { table: 'WorkPermits', column: 'id_user' },
    { table: 'Vouchers', column: 'id_user' },
    { table: 'Attendances', column: 'id_user' },
    { table: 'LeaveRequests', column: 'id_user' },
    { table: 'FatigueLogs', column: 'id_user' },
    { table: 'Audits', column: 'auditor_id' },
    { table: 'CorrectiveActions', column: 'assigned_to' },
];

const USER_CHILD_SET_NULL = [
    { table: 'WorkPermits', column: 'approved_by' },
    { table: 'EmergencyCalls', column: 'handled_by' },
    { table: 'AuditLogs', column: 'id_user' },
];

const HAZARD_CHILD_CASCADE = [
    { table: 'CorrectiveActions', column: 'id_hazard' },
];

const INCIDENT_CHILD_CASCADE = [
    { table: 'CorrectiveActions', column: 'id_incident' },
];

function constraintName(table, column) {
    return `${table}_${column}_fkey`;
}

async function replaceForeignKey(sequelize, { table, column, refTable, refColumn, onDelete }) {
    const name = constraintName(table, column);
    await sequelize.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${name}";`);

    const invalidRows = await sequelize.query(
        `SELECT COUNT(*) AS count FROM "${table}" t
         WHERE t."${column}" IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM "${refTable}" r WHERE r."${refColumn}" = t."${column}"
           );`,
        { type: sequelize.QueryTypes.SELECT }
    );

    if (Number(invalidRows[0]?.count) > 0) {
        console.warn(
            `[FK Migration] Skipping ${table}.${column}: ${invalidRows[0].count} orphan row(s) — clean data manually first.`
        );
        return;
    }

    await sequelize.query(
        `ALTER TABLE "${table}"
         ADD CONSTRAINT "${name}"
         FOREIGN KEY ("${column}") REFERENCES "${refTable}"("${refColumn}")
         ON DELETE ${onDelete};`
    );
    console.log(`[FK Migration] ${table}.${column} → ${refTable} ON DELETE ${onDelete}`);
}

async function applyUserCascadeConstraints(sequelize) {
    console.log('[FK Migration] Applying User cascade / set-null constraints...');

    for (const fk of USER_CHILD_CASCADE) {
        try {
            await replaceForeignKey(sequelize, {
                ...fk,
                refTable: 'Users',
                refColumn: 'id_user',
                onDelete: 'CASCADE',
            });
        } catch (err) {
            console.warn(`[FK Migration] ${fk.table}.${fk.column} CASCADE:`, err.message);
        }
    }

    for (const fk of USER_CHILD_SET_NULL) {
        try {
            await replaceForeignKey(sequelize, {
                ...fk,
                refTable: 'Users',
                refColumn: 'id_user',
                onDelete: 'SET NULL',
            });
        } catch (err) {
            console.warn(`[FK Migration] ${fk.table}.${fk.column} SET NULL:`, err.message);
        }
    }

    for (const fk of HAZARD_CHILD_CASCADE) {
        try {
            await replaceForeignKey(sequelize, {
                ...fk,
                refTable: 'HazardReports',
                refColumn: 'id_hazard',
                onDelete: 'CASCADE',
            });
        } catch (err) {
            console.warn(`[FK Migration] ${fk.table}.${fk.column} (hazard) CASCADE:`, err.message);
        }
    }

    for (const fk of INCIDENT_CHILD_CASCADE) {
        try {
            await replaceForeignKey(sequelize, {
                ...fk,
                refTable: 'IncidentReports',
                refColumn: 'id_incident',
                onDelete: 'CASCADE',
            });
        } catch (err) {
            console.warn(`[FK Migration] ${fk.table}.${fk.column} (incident) CASCADE:`, err.message);
        }
    }

    console.log('[FK Migration] User cascade constraints applied.');
}

module.exports = { applyUserCascadeConstraints };
