const express = require('express');
const router = express.Router();
const { 
    getAllUsers, 
    createUser, 
    updateUser, 
    deleteUser, 
    loginUser 
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// ==========================================
// 🟢 RUTE PUBLIK (Tidak butuh token)
// ==========================================
// Rute untuk mendapatkan Token (Login)
router.post('/login', loginUser);

// ==========================================
// 🔴 RUTE PRIVAT (Wajib punya token JWT & Role Admin)
// ==========================================
// Mulai dari baris ini ke bawah, semua rute dijaga ketat oleh satpam!
router.use(protect, authorize('Admin'));

// Rute manajemen user (Hanya bisa diakses oleh Admin yang sudah login)
router.post('/', createUser); // <-- Pintu pendaftaran sudah aman digembok lagi
router.get('/', getAllUsers);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;