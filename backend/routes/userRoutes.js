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

//  RUTE PUBLIK (Tidak butuh token)
router.post('/login', loginUser);

//  RUTE UMUM (Wajib punya token JWT, semua role bisa)
router.get('/', protect, getAllUsers);

//  RUTE PRIVAT (Wajib punya token JWT & Role Admin)
router.use(protect, authorize('Admin'));

router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;