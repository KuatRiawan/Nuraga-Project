const sequelize = require('../config/db');

const Attendance = require('../models/Attendance');
const Audit = require('../models/Audit');
const AuditLog = require('../models/AuditLog');
const Certification = require('../models/Certification');
const CorrectiveAction = require('../models/CorrectiveAction');
const EmergencyCall = require('../models/EmergencyCall');
const FatigueLog = require('../models/FatigueLog');
const HazardReport = require('../models/HazardReport');
const IncidentReport = require('../models/IncidentReport');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const Voucher = require('../models/Voucher');
const WorkPermit = require('../models/WorkPermit');


const resetAllTestData = async () => {
    try {
        console.log('🔄 Starting complete test data reset...\n');

        await sequelize.authenticate();
        console.log(' Step 1: Database connected successfully\n');

        console.log('🧹 Step 2: Cleaning operational data...\n');

        const tablesToReset = [
            { name: 'Voucher', model: Voucher },
            { name: 'CorrectiveAction', model: CorrectiveAction },
            { name: 'FatigueLog', model: FatigueLog },
            { name: 'AuditLog', model: AuditLog },
            { name: 'Audit', model: Audit },
            { name: 'Certification', model: Certification },
            { name: 'EmergencyCall', model: EmergencyCall },
            { name: 'LeaveRequest', model: LeaveRequest },
            { name: 'Attendance', model: Attendance },
            { name: 'WorkPermit', model: WorkPermit },
            { name: 'IncidentReport', model: IncidentReport },
            { name: 'HazardReport', model: HazardReport },
        ];

        for (const table of tablesToReset) {
            try {
                const count = await table.model.count();
                if (count > 0) {
                    await table.model.destroy({ where: {} });
                    console.log(`    ${table.name}: Deleted ${count} records`);
                } else {
                    console.log(`   ℹ️  ${table.name}: No records to delete`);
                }
            } catch (error) {
                console.error(`   ❌ ${table.name}: Failed to delete - ${error.message}`);
            }
        }

        console.log('\n Step 2: Operational data cleaned\n');

        console.log('🎯 Step 3: Resetting user points to 0...\n');
        const pointsResult = await User.update({ points: 0 }, { where: {} });
        console.log(`    Reset points for ${pointsResult[0]} users to 0\n`);

        console.log('✨ Complete test data reset finished successfully!');
        console.log('👤 User accounts and SystemConfig preserved as requested.');
        console.log('🎯 All user points reset to 0 for fresh E2E testing.\n');

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during test data reset:', error);
        await sequelize.close();
        process.exit(1);
    }
};

resetAllTestData();
