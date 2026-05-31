const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

// CRITICAL: Validate essential database environment variables
// Fail fast if critical env vars are missing to prevent zombie server
if (!process.env.DB_NAME || process.env.DB_NAME.trim() === '') {
    console.error('FATAL: DB_NAME environment variable is missing or empty.');
    process.exit(1);
}
if (!process.env.DB_USER || process.env.DB_USER.trim() === '') {
    console.error('FATAL: DB_USER environment variable is missing or empty.');
    process.exit(1);
}
if (!process.env.DB_PASS || process.env.DB_PASS.trim() === '') {
    console.error('FATAL: DB_PASS environment variable is missing or empty.');
    process.exit(1);
}
if (!process.env.DB_HOST || process.env.DB_HOST.trim() === '') {
    console.error('FATAL: DB_HOST environment variable is missing or empty.');
    process.exit(1);
}

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
        pool: {
            max: 20,
            min: 2,
            acquire: 30000,
            idle: 10000
        }
    }
);

module.exports = sequelize;
