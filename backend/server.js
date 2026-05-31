const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/db');
const { Server } = require('socket.io');

// Import models to sync
const User = require('./models/User');
const HazardReport = require('./models/HazardReport');
const IncidentReport = require('./models/IncidentReport');
const Audit = require('./models/Audit');
const CorrectiveAction = require('./models/CorrectiveAction');
const Certification = require('./models/Certification');
const EmergencyCall = require('./models/EmergencyCall');
const WorkPermit = require('./models/WorkPermit');
const Voucher = require('./models/Voucher');
const AuditLog = require('./models/AuditLog');
const SystemConfig = require('./models/SystemConfig');
const FatigueLog = require('./models/FatigueLog');
const Attendance = require('./models/Attendance');
const LeaveRequest = require('./models/LeaveRequest');
const { autoExpirePermits } = require('./controllers/workPermitController');
const whatsappService = require('./services/whatsappService');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads
app.use('/uploads', express.static('uploads'));

const { applyUserCascadeConstraints } = require('./migrations/applyUserCascadeConstraints');

// Associations — ON DELETE rules for User removal (C3)
const cascade = { onDelete: 'CASCADE', hooks: true };
const setNull = { onDelete: 'SET NULL', hooks: true };

User.hasMany(HazardReport, { foreignKey: 'id_user', sourceKey: 'id_user', ...cascade });
HazardReport.belongsTo(User, { foreignKey: 'id_user', targetKey: 'id_user', ...cascade });

User.hasMany(IncidentReport, { foreignKey: 'id_user', sourceKey: 'id_user', ...cascade });
IncidentReport.belongsTo(User, { foreignKey: 'id_user', targetKey: 'id_user', ...cascade });

HazardReport.hasMany(CorrectiveAction, { foreignKey: 'id_hazard', sourceKey: 'id_hazard', ...cascade });
CorrectiveAction.belongsTo(HazardReport, { foreignKey: 'id_hazard', targetKey: 'id_hazard', ...cascade });

IncidentReport.hasMany(CorrectiveAction, { foreignKey: 'id_incident', sourceKey: 'id_incident', ...cascade });
CorrectiveAction.belongsTo(IncidentReport, { foreignKey: 'id_incident', targetKey: 'id_incident', ...cascade });

User.hasMany(Audit, { as: 'auditsConducted', foreignKey: 'auditor_id', sourceKey: 'id_user', ...cascade });
Audit.belongsTo(User, { as: 'auditor', foreignKey: 'auditor_id', targetKey: 'id_user', ...cascade });

User.hasMany(CorrectiveAction, { as: 'assignedActions', foreignKey: 'assigned_to', sourceKey: 'id_user', ...cascade });
CorrectiveAction.belongsTo(User, { as: 'assignee', foreignKey: 'assigned_to', targetKey: 'id_user', ...cascade });

User.hasMany(Certification, { foreignKey: 'id_user', sourceKey: 'id_user', ...cascade });
Certification.belongsTo(User, { foreignKey: 'id_user', targetKey: 'id_user', ...cascade });

User.hasMany(WorkPermit, { foreignKey: 'id_user', sourceKey: 'id_user', ...cascade });
WorkPermit.belongsTo(User, { foreignKey: 'id_user', targetKey: 'id_user', ...cascade });

User.hasMany(WorkPermit, { as: 'approvedPermits', foreignKey: 'approved_by', sourceKey: 'id_user', ...setNull });
WorkPermit.belongsTo(User, { as: 'approver', foreignKey: 'approved_by', targetKey: 'id_user', ...setNull });

User.hasMany(EmergencyCall, { as: 'handledEmergencies', foreignKey: 'handled_by', sourceKey: 'id_user', ...setNull });
EmergencyCall.belongsTo(User, { as: 'responder', foreignKey: 'handled_by', targetKey: 'id_user', ...setNull });

User.hasMany(Voucher, { foreignKey: 'id_user', sourceKey: 'id_user', ...cascade });
Voucher.belongsTo(User, { foreignKey: 'id_user', targetKey: 'id_user', ...cascade });

User.hasMany(AuditLog, { foreignKey: 'id_user', sourceKey: 'id_user', ...setNull });
AuditLog.belongsTo(User, { foreignKey: 'id_user', targetKey: 'id_user', ...setNull });

User.hasMany(Attendance, { foreignKey: 'id_user', sourceKey: 'id_user', ...cascade });
Attendance.belongsTo(User, { foreignKey: 'id_user', targetKey: 'id_user', ...cascade });

User.hasMany(LeaveRequest, { foreignKey: 'id_user', sourceKey: 'id_user', ...cascade });
LeaveRequest.belongsTo(User, { foreignKey: 'id_user', targetKey: 'id_user', ...cascade });

User.hasMany(FatigueLog, { foreignKey: 'id_user', sourceKey: 'id_user', ...cascade });
FatigueLog.belongsTo(User, { foreignKey: 'id_user', targetKey: 'id_user', ...cascade });


// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/hazards', require('./routes/hazardRoutes'));
app.use('/api/incidents', require('./routes/incidentRoutes'));
app.use('/api/audits', require('./routes/auditRoutes'));
app.use('/api/actions', require('./routes/correctiveActionRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/certifications', require('./routes/certificationRoutes'));
app.use('/api/permits', require('./routes/workPermitRoutes'));
app.use('/api/emergency', require('./routes/emergencyRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/vouchers', require('./routes/voucherRoutes'));
app.use('/api/logs', require('./routes/logRoutes'));
app.use('/api/config', require('./routes/configRoutes'));
app.use('/api/wa', require('./routes/whatsappRoutes'));
app.use('/api/fatigue', require('./routes/fatigueRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));


app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Nuraga API' });
});

const PORT = parseInt(process.env.PORT, 10) || 5000;

// Sync Database & Start Server with robust port handling
// force:false = don't touch existing tables (safest for production-like use)
function startServer(port, retries = 5) {
    const server = app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });

    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('A user connected to WebSocket');
        socket.on('disconnect', () => {
            console.log('User disconnected from WebSocket');
        });
    });

    app.set('io', io);

    server.on('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
            if (retries > 0) {
                console.warn(`Port ${port} in use, trying port ${port + 1} (${retries} retries left)`);
                setTimeout(() => startServer(port + 1, retries - 1), 1000);
            } else {
                console.error(`Port ${port} in use and no retries left. Exiting.`);
                process.exit(1);
            }
        } else {
            console.error('Server error:', err);
            process.exit(1);
        }
    });

    return server;
}

sequelize.sync({ force: false }).then(async () => {
    console.log('Database synced');

    try {
        await applyUserCascadeConstraints(sequelize);
    } catch (err) {
        console.error('Failed to apply User cascade FK constraints:', err.message);
    }

    // Safety Migrations for Users
    try {
        await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "points" INTEGER DEFAULT 0;');
        await sequelize.query('UPDATE "Users" SET "points" = 1200 WHERE "points" = 0;');
        await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "no_whatsapp" VARCHAR(255) NULL;');
        await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "nik" VARCHAR(255) NULL;');
        await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "jabatan" VARCHAR(255) NULL;');
        await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "area_kerja" VARCHAR(255) NULL;');
        console.log('User schema columns verified successfully');
    } catch (err) {
        console.error('Failed to add columns to Users:', err.message);
    }

    // Safety Migrations for WorkPermits
    try {
        await sequelize.query('ALTER TABLE "WorkPermits" ADD COLUMN IF NOT EXISTS "close_applicant_sig" BOOLEAN DEFAULT false;');
        await sequelize.query('ALTER TABLE "WorkPermits" ADD COLUMN IF NOT EXISTS "close_supervisor_sig" BOOLEAN DEFAULT false;');
        await sequelize.query('ALTER TABLE "WorkPermits" ADD COLUMN IF NOT EXISTS "housekeeping_verified" BOOLEAN DEFAULT false;');
        await sequelize.query('ALTER TABLE "WorkPermits" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP WITH TIME ZONE NULL;');
        console.log('WorkPermit close-out columns verified successfully');
    } catch (err) {
        console.error('Failed to add close-out columns to WorkPermits:', err.message);
    }

    // Safety Migrations for HazardReports
    try {
        await sequelize.query('ALTER TABLE "HazardReports" ADD COLUMN IF NOT EXISTS "is_verified" BOOLEAN DEFAULT false;');
        console.log('HazardReports columns verified successfully');
    } catch (err) {
        console.error('Failed to add columns to HazardReports:', err.message);
    }

    // Add Expired to enum status in database (PostgreSQL specific)
    try {
        await sequelize.query('ALTER TYPE "enum_WorkPermits_status" ADD VALUE IF NOT EXISTS \'Expired\';');
        console.log('WorkPermits status enum verified successfully');
    } catch (err) {
        // May fail if not Postgres or already exists, which is fine
        console.warn('Postgres enum alteration warning:', err.message);
    }

    // Add Staff to enum role in database (PostgreSQL specific)
    try {
        await sequelize.query('ALTER TYPE "enum_Users_role" ADD VALUE IF NOT EXISTS \'Staff\';');
        console.log('Users role enum verified successfully');
    } catch (err) {
        console.warn('Postgres role enum alteration warning:', err.message);
    }

    // Add Vendor to enum role in database (PostgreSQL specific)
    try {
        await sequelize.query('ALTER TYPE "enum_Users_role" ADD VALUE IF NOT EXISTS \'Vendor\';');
        console.log('Users role enum Vendor verified successfully');
    } catch (err) {
        console.warn('Postgres role enum Vendor alteration warning:', err.message);
    }

    // Migrate any Operator role to Staff
    try {
        await sequelize.query('UPDATE "Users" SET role = \'Staff\' WHERE role = \'Operator\';');
        console.log('Migrated all Operator users to Staff successfully');
    } catch (err) {
        console.warn('Operator to Staff migration warning:', err.message);
    }

    // Add jenis_kelamin column to Users if not exists
    try {
        await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "jenis_kelamin" VARCHAR(30) DEFAULT \'Laki-laki\';');
        console.log('Users jenis_kelamin column verified successfully');
    } catch (err) {
        console.warn('Postgres Users jenis_kelamin column alteration warning:', err.message);
    }

    // Run auto-expiration check immediately and start the 60-second periodic interval
    try {
        await autoExpirePermits();
        setInterval(autoExpirePermits, 60000);
        console.log('Auto-expiration scheduler started');
    } catch (err) {
        console.error('Failed to start auto-expiration scheduler:', err.message);
    }

    // Seed default configurations if empty
    try {
        const configCount = await SystemConfig.count();
        if (configCount === 0) {
            await SystemConfig.bulkCreate([
                { key: 'whatsapp_gateway_number', value: '+6281234567890' },
                { key: 'whatsapp_api_key', value: 'dummy-wa-api-key' },
                { key: 'ai_fastapi_endpoint', value: 'http://localhost:8000' },
                { key: 'open_meteo_endpoint', value: 'https://api.open-meteo.com' }
            ]);
            console.log('Default configurations seeded successfully');
        }
    } catch (err) {
        console.error('Failed to seed default configurations:', err.message);
    }

    startServer(PORT);

    // Start WhatsApp Baileys connection
    try {
        whatsappService.connect();
        console.log('[WhatsApp] Baileys connection initiated. Check terminal for QR code.');
    } catch (err) {
        console.error('[WhatsApp] Failed to start Baileys:', err.message);
    }

}).catch(err => {
    console.error('Failed to sync database: ' + err.message);
    process.exit(1);
});

module.exports = app;
