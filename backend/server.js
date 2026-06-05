const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/db');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

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
const ChatMessage = require('./models/ChatMessage');
const { autoExpirePermits } = require('./controllers/workPermitController');
const whatsappService = require('./services/whatsappService');
const { startFileCleanupScheduler } = require('./utils/fileCleanup');
const { UPLOADS_DIR } = require('./utils/paths');

dotenv.config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
    console.error('FATAL: JWT_SECRET environment variable is missing or empty. Server cannot start without security.');
    process.exit(1);
}

const app = express();

app.set('trust proxy', 1);

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 1000, // 1000 permintaan per 15 menit
    message: { message: 'Terlalu banyak request, silakan coba lagi setelah 15 menit.' }
});
app.use('/api', globalLimiter);

const corsOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_URL || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || corsOrigins.length === 0 || corsOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(UPLOADS_DIR));

const { applyUserCascadeConstraints } = require('./migrations/applyUserCascadeConstraints');

const cascade = { onDelete: 'CASCADE', hooks: false };
const setNull = { onDelete: 'SET NULL', hooks: false };

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

User.hasMany(ChatMessage, { foreignKey: 'id_user', sourceKey: 'id_user', ...cascade });
ChatMessage.belongsTo(User, { foreignKey: 'id_user', targetKey: 'id_user', ...cascade });

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
app.use('/api/chat', require('./routes/chatRoutes'));

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Nuraga API' });
});

const PORT = parseInt(process.env.PORT, 10) || 5000;

function startServer(port, retries = 5) {
    const server = app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });

    const io = new Server(server, {
        cors: {
            origin: corsOrigins.length > 0 ? corsOrigins : true,
            methods: ["GET", "POST"],
            credentials: true
        },
        maxHttpBufferSize: 1e6 // Batas 1MB
    });

    io.use((socket, next) => {
        let token;
        const cookieHeader = socket.handshake.headers.cookie;
        if (cookieHeader) {
            const cookies = cookieHeader.split(';').reduce((res, item) => {
                const data = item.trim().split('=');
                return { ...res, [data[0]]: data[1] };
            }, {});
            token = cookies.token;
        }
        
        if (!token) {
            token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        }

        if (!token) {
            return next(new Error('Authentication error'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            return next(new Error('Authentication error'));
        }
    });

    const globalChatUsers = new Map();

    io.on('connection', (socket) => {
        console.log(`User ${socket.user?.id || 'unknown'} connected to WebSocket`);
        
        socket.on('join_global_chat', () => {
            socket.join('global_chat');
            console.log(`[Socket] User ${socket.user.nama} joined global_chat`);
            if (socket.user) {
                globalChatUsers.set(socket.id, {
                    id_user: socket.user.id || socket.user.id_user,
                    nama: socket.user.nama,
                    role: socket.user.role || 'User'
                });
                io.to('global_chat').emit('active_users_update', Array.from(globalChatUsers.values()));
            }
        });

        socket.on('leave_global_chat', () => {
            socket.leave('global_chat');
            if (globalChatUsers.has(socket.id)) {
                globalChatUsers.delete(socket.id);
                io.to('global_chat').emit('active_users_update', Array.from(globalChatUsers.values()));
            }
        });

        socket.on('send_global_message', async (data) => {
            try {
                const newMsg = await ChatMessage.create({
                    id_user: socket.user.id,
                    pesan: data.pesan,
                    tipe: 'global'
                });

                const fullMsg = await ChatMessage.findByPk(newMsg.id_message, {
                    include: [{ model: User, attributes: ['id_user', 'nama', 'role'] }]
                });

                io.to('global_chat').emit('receive_global_message', fullMsg);
            } catch (err) {
                console.error('[Chat] Error saving/sending message:', err);
            }
        });

        socket.on('disconnect', () => {
            console.log(`User ${socket.user?.id || 'unknown'} disconnected from WebSocket`);
            if (globalChatUsers.has(socket.id)) {
                globalChatUsers.delete(socket.id);
                io.to('global_chat').emit('active_users_update', Array.from(globalChatUsers.values()));
            }
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

sequelize.sync().then(async () => {
    console.log('Database synced');

    try {
        await applyUserCascadeConstraints(sequelize);
    } catch (err) {
        console.error('Failed to apply User cascade FK constraints:', err.message);
    }

    try {
        await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "points" INTEGER DEFAULT 0;');
        await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "no_whatsapp" VARCHAR(255) NULL;');
        await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "nik" VARCHAR(255) NULL;');
        await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "jabatan" VARCHAR(255) NULL;');
        await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "area_kerja" VARCHAR(255) NULL;');
        console.log('User schema columns verified successfully');
    } catch (err) {
        console.error('Failed to add columns to Users:', err.message);
    }

    try {
        await sequelize.query('ALTER TABLE "WorkPermits" ADD COLUMN IF NOT EXISTS "close_applicant_sig" BOOLEAN DEFAULT false;');
        await sequelize.query('ALTER TABLE "WorkPermits" ADD COLUMN IF NOT EXISTS "close_supervisor_sig" BOOLEAN DEFAULT false;');
        await sequelize.query('ALTER TABLE "WorkPermits" ADD COLUMN IF NOT EXISTS "housekeeping_verified" BOOLEAN DEFAULT false;');
        await sequelize.query('ALTER TABLE "WorkPermits" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP WITH TIME ZONE NULL;');
        console.log('WorkPermit close-out columns verified successfully');
    } catch (err) {
        console.error('Failed to add close-out columns to WorkPermits:', err.message);
    }

    try {
        await sequelize.query('ALTER TABLE "HazardReports" ADD COLUMN IF NOT EXISTS "is_verified" BOOLEAN DEFAULT false;');
        console.log('HazardReports columns verified successfully');
    } catch (err) {
        console.error('Failed to add columns to HazardReports:', err.message);
    }

    try {
        await sequelize.query('ALTER TYPE "enum_WorkPermits_status" ADD VALUE IF NOT EXISTS \'Expired\';');
        console.log('WorkPermits status enum verified successfully');
    } catch (err) {
        console.warn('Postgres enum alteration warning:', err.message);
    }

    try {
        await sequelize.query('ALTER TYPE "enum_Users_role" ADD VALUE IF NOT EXISTS \'Staff\';');
        console.log('Users role enum verified successfully');
    } catch (err) {
        console.warn('Postgres role enum alteration warning:', err.message);
    }

    try {
        await sequelize.query('ALTER TYPE "enum_Users_role" ADD VALUE IF NOT EXISTS \'Vendor\';');
        console.log('Users role enum Vendor verified successfully');
    } catch (err) {
        console.warn('Postgres role enum Vendor alteration warning:', err.message);
    }

    try {
        await sequelize.query('UPDATE "Users" SET role = \'Staff\' WHERE role = \'Operator\';');
        console.log('Migrated all Operator users to Staff successfully');
    } catch (err) {
        console.warn('Operator to Staff migration warning:', err.message);
    }

    try {
        await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "jenis_kelamin" VARCHAR(30) DEFAULT \'Laki-laki\';');
        console.log('Users jenis_kelamin column verified successfully');
    } catch (err) {
        console.warn('Postgres Users jenis_kelamin column alteration warning:', err.message);
    }

    try {
        await autoExpirePermits();
        setInterval(autoExpirePermits, 60000);
        console.log('Auto-expiration scheduler started');
    } catch (err) {
        console.error('Failed to start auto-expiration scheduler:', err.message);
    }

    try {
        startFileCleanupScheduler();
    } catch (err) {
        console.error('Failed to start file cleanup scheduler:', err.message);
    }

    try {
        const configCount = await SystemConfig.count();
        if (configCount === 0) {
            await SystemConfig.bulkCreate([
                { key: 'whatsapp_gateway_number', value: '+6281234567890' },
                { key: 'whatsapp_api_key', value: 'dummy-wa-api-key' },
                { key: 'ai_fastapi_endpoint', value: process.env.AI_SERVICE_URL || '' },
                { key: 'open_meteo_endpoint', value: 'https://api.open-meteo.com' },
                { key: 'rewards_config', value: JSON.stringify([
                    { id: 1, title: 'Voucer Makan Siang', points: 200, icon: '🍱', quota: 50 },
                    { id: 2, title: 'Voucer Belanja Rp50K', points: 500, icon: '🛒', quota: 30 },
                    { id: 3, title: 'Hari Libur Tambahan', points: 1000, icon: '🏖️', quota: 5 },
                    { id: 4, title: 'Merchandise K3 Premium', points: 750, icon: '🎁', quota: 15 }
                ])},
                { key: 'checklist_templates', value: JSON.stringify({
                    'APAR': ['Tabung tidak berkarat', 'Segel dalam kondisi baik', 'Penunjuk tekanan pada posisi hijau', 'Label inspeksi terbaru', 'Akses tidak terhalang'],
                    'Perancah': ['Kaki perancah terkunci', 'Papan lantai tidak patah', 'Pagar pengaman terpasang', 'Beban tidak melebihi kapasitas'],
                    'Forklift': ['Rem berfungsi normal', 'Lampu peringatan hidup', 'Klakson berfungsi', 'Fork tidak bengkok', 'Sabuk pengaman ada'],
                    'APD': ['Helm dalam kondisi baik', 'Sepatu safety utuh', 'Rompi safety tersedia', 'Kacamata pelindung bersih', 'Sarung tangan tidak sobek'],
                    'Listrik': ['Kabel tidak terkelupas', 'Stopkontak terpasang benar', 'Label tegangan jelas', 'Grounding terpasang', 'Panel terkunci']
                })}
            ]);
            console.log('Default configurations seeded successfully');
        }
    } catch (err) {
        console.error('Failed to seed default configurations:', err.message);
    }

    startServer(PORT);

    try {
        whatsappService.connect();
        console.log('[WhatsApp] Baileys connection initiated. Check terminal for QR code.');
    } catch (err) {
        console.error('[WhatsApp] Failed to start Baileys:', err.message);
    }

    process.on('unhandledRejection', (reason, promise) => {
        console.error('[WhatsApp] Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (err) => {
        console.error('[WhatsApp] Uncaught Exception:', err.message);
    });

}).catch(err => {
    console.error('Failed to sync database: ' + err.message);
    process.exit(1);
});

module.exports = app;
