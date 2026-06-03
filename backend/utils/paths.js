const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const UPLOADS_DIR = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(PROJECT_ROOT, 'uploads');

const WA_SESSION_DIR = process.env.WA_SESSION_DIR
    ? path.resolve(process.env.WA_SESSION_DIR)
    : path.join(PROJECT_ROOT, 'wa_session');

module.exports = {
    PROJECT_ROOT,
    UPLOADS_DIR,
    WA_SESSION_DIR,
};
