const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // SECURITY: Never use file.originalname to prevent Path Traversal attacks
        // Generate unique filename using timestamp + random UUID + original extension
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;
        cb(null, `${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    // SECURITY: Strict file filter - only allow safe image formats
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

    // Check mimetype
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error('Hanya file gambar yang diizinkan!'));
    }

    // Verify extension to prevent MIME type spoofing
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        return cb(new Error('Hanya file gambar yang diizinkan!'));
    }

    cb(null, true);
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit to prevent storage exhaustion
    fileFilter,
});

module.exports = upload;
