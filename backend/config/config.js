require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT || 'postgres',
    /* untuk mengaktifkan SSL  */
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Ini agar kita tidak perlu mengunduh sertifikat CA AWS secara manual
      }
    }
  }
};