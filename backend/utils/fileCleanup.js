const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MAX_FILE_AGE_DAYS = 90;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

const cleanupOldFiles = () => {
    console.log('[FileCleanup] Starting file cleanup check...');
    
    try {
        if (!fs.existsSync(UPLOADS_DIR)) {
            console.log('[FileCleanup] Uploads directory does not exist, skipping cleanup.');
            return;
        }

        const files = fs.readdirSync(UPLOADS_DIR);
        const now = Date.now();
        const maxAgeMs = MAX_FILE_AGE_DAYS * 24 * 60 * 60 * 1000;
        let deletedCount = 0;

        files.forEach(file => {
            const filePath = path.join(UPLOADS_DIR, file);
            
            try {
                const stats = fs.statSync(filePath);
                const fileAge = now - stats.mtimeMs;

                if (fileAge > maxAgeMs) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(`[FileCleanup] Deleted old file: ${file} (${Math.floor(fileAge / (24 * 60 * 60 * 1000))} days old)`);
                }
            } catch (err) {
                console.error(`[FileCleanup] Error processing file ${file}:`, err.message);
            }
        });

        console.log(`[FileCleanup] Cleanup complete. Deleted ${deletedCount} files older than ${MAX_FILE_AGE_DAYS} days.`);
    } catch (error) {
        console.error('[FileCleanup] Error during cleanup:', error.message);
    }
};

const startFileCleanupScheduler = () => {
    console.log('[FileCleanup] Scheduler started. Running every 24 hours.');
    
    // Run immediately on startup, then schedule daily
    cleanupOldFiles();
    
    setInterval(cleanupOldFiles, CLEANUP_INTERVAL_MS);
};

module.exports = { cleanupOldFiles, startFileCleanupScheduler };
