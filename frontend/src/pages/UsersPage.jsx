import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../store/AuthContext';
import { Users, Plus, Search, Edit2, Trash2, Shield, Mail, AlertCircle, X, ShieldAlert, Check, BadgeCheck, Briefcase, MapPin, Upload, Download, ChevronDown } from 'lucide-react';

const ROLE_BADGES = {
    Admin: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
    HSE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    Supervisor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
    Manager: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    Staff: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    Operator: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    Vendor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20',
    Kontraktor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20',
};

const UsersPage = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const fileInputRef = useRef(null);

    const parseCSV = (text) => {
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) return [];

        // Clean UTF-8 BOM if present
        const firstLine = lines[0].replace(/^\uFEFF/, '');

        // Detect separator: check if first line has ';' or ','
        let separator = ',';
        if (firstLine.includes(';') && (firstLine.split(';').length > firstLine.split(',').length)) {
            separator = ';';
        }

        const headers = firstLine.split(separator).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
        const results = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const values = [];
            let current = '';
            let inQuotes = false;
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"' || char === "'") {
                    inQuotes = !inQuotes;
                } else if (char === separator && !inQuotes) {
                    values.push(current.trim().replace(/^["']|["']$/g, ''));
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim().replace(/^["']|["']$/g, ''));

            if (values.length < headers.length) continue;
            const rowObj = {};
            headers.forEach((h, index) => {
                rowObj[h] = values[index] || '';
            });
            results.push(rowObj);
        }
        return results;
    };

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleImportCSV = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setError('');
        setSuccessMessage('');

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            try {
                const parsedData = parseCSV(text);
                if (parsedData.length === 0) {
                    setError('File CSV kosong atau format tidak valid.');
                    setLoading(false);
                    return;
                }

                let successCount = 0;
                let failCount = 0;
                let failDetails = [];

                for (let i = 0; i < parsedData.length; i++) {
                    const row = parsedData[i];
                    const nama = row.nama || row.name || '';
                    const email = row.email || '';
                    const password = row.password || row.sandi || 'password123';
                    const role = row.role || 'Staff';
                    const nik = row.nik || row.id_pekerja || '';
                    const jabatan = row.jabatan || row.position || '';
                    const area_kerja = row.area_kerja || row.department || '';
                    const no_whatsapp = row.no_whatsapp || row.whatsapp || '';
                    const jenis_kelamin = row.jenis_kelamin || row.gender || 'Laki-laki';

                    if (!nama || !email) {
                        failCount++;
                        failDetails.push(`Baris ${i + 2}: Nama dan email wajib diisi.`);
                        continue;
                    }

                    // Check if user already exists (by email) in local state
                    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

                    try {
                        if (existingUser) {
                            // Update existing user details
                            await api.put(`/users/${existingUser.id_user}`, {
                                nama,
                                role,
                                nik,
                                jabatan,
                                area_kerja,
                                no_whatsapp,
                                jenis_kelamin
                            });
                        } else {
                            // Create new user with password
                            await api.post('/users', {
                                nama,
                                email,
                                password,
                                role,
                                nik,
                                jabatan,
                                area_kerja,
                                no_whatsapp,
                                jenis_kelamin
                            });
                        }
                        successCount++;
                    } catch (err) {
                        failCount++;
                        failDetails.push(`Baris ${i + 2} (${email}): ${err.response?.data?.message || err.message}`);
                    }
                }

                if (successCount > 0) {
                    setSuccessMessage(`Berhasil mengimpor/sinkronisasi ${successCount} user.`);
                }
                if (failCount > 0) {
                    setError(`Gagal mengimpor ${failCount} user. Detail:\n${failDetails.join('\n')}`);
                }
                fetchUsers();
            } catch (err) {
                setError('Gagal membaca file CSV: ' + err.message);
            } finally {
                setLoading(false);
            }
        };
        reader.onerror = () => {
            setError('Gagal membaca file CSV.');
            setLoading(false);
        };
        reader.readAsText(file);
    };

    const handleExportCSV = () => {
        if (users.length === 0) {
            setError('Tidak ada data user untuk diexport.');
            return;
        }

        const headers = ['nama', 'email', 'role', 'nik', 'jabatan', 'area_kerja', 'no_whatsapp', 'jenis_kelamin'];
        const csvRows = [
            headers.join(','),
            ...users.map(u =>
                headers.map(header => {
                    const val = u[header] || '';
                    const escaped = String(val).replace(/"/g, '""');
                    return `"${escaped}"`;
                }).join(',')
            )
        ];

        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `k3_users_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);

        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setSuccessMessage('Data user berhasil diexport ke CSV.');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    // Modal control
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    // Helper to auto-generate worker ID / NIK based on role
    const generateAutoNik = (roleName) => {
        const prefixes = {
            Admin: 'ADM',
            HSE: 'HSE',
            Supervisor: 'SPV',
            Manager: 'MGR',
            Staff: 'STF',
            Vendor: 'VND',
        };
        const prefix = prefixes[roleName] || 'EMP';
        const randomNum = Math.floor(100 + Math.random() * 900);
        return `${prefix}-${randomNum}`;
    };

    // Form data
    const [formData, setFormData] = useState({
        nama: '',
        email: '',
        password: '',
        role: 'Staff',
        nik: '',
        jabatan: '',
        area_kerja: '',
        no_whatsapp: '',
        jenis_kelamin: 'Laki-laki',
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memuat daftar user.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        const defaultRole = 'Staff';
        setFormData({
            nama: '',
            email: '',
            password: '',
            role: defaultRole,
            nik: generateAutoNik(defaultRole),
            jabatan: '',
            area_kerja: '',
            no_whatsapp: '',
            jenis_kelamin: 'Laki-laki',
        });
        setIsEditing(false);
        setEditingUserId(null);
        setError('');
        setShowModal(true);
    };

    const handleOpenEdit = (user) => {
        setFormData({
            nama: user.nama,
            email: user.email,
            password: '',
            role: user.role,
            nik: user.nik || '',
            jabatan: user.jabatan || '',
            area_kerja: user.area_kerja || '',
            no_whatsapp: user.no_whatsapp || '',
            jenis_kelamin: user.jenis_kelamin || 'Laki-laki',
        });
        setIsEditing(true);
        setEditingUserId(user.id_user);
        setError('');
        setShowModal(true);
    };

    const handleRoleChange = (selectedRole) => {
        setFormData(prev => {
            const shouldGenerate = !isEditing || !prev.nik;
            return {
                ...prev,
                role: selectedRole,
                nik: shouldGenerate ? generateAutoNik(selectedRole) : prev.nik
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        try {
            if (isEditing) {
                // If editing and password is left empty, omit it from the payload
                const payload = { ...formData };
                if (!payload.password) delete payload.password;

                await api.put(`/users/${editingUserId}`, payload);
                setSuccessMessage('User berhasil diperbarui.');
            } else {
                await api.post('/users', formData);
                setSuccessMessage('User baru berhasil ditambahkan.');
            }
            setShowModal(false);
            fetchUsers();

            // Clear alert after 3 seconds
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.');
        }
    };

    const handleDeleteClick = (id, nama) => {
        if (id === currentUser?.id) {
            alert('Anda tidak bisa menghapus akun Anda sendiri.');
            return;
        }
        setUserToDelete({ id, nama });
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setError('');
        try {
            await api.delete(`/users/${userToDelete.id}`);
            setSuccessMessage('User berhasil dihapus.');
            fetchUsers();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal menghapus user.');
        } finally {
            setShowDeleteModal(false);
            setUserToDelete(null);
        }
    };

    const filteredUsers = users.filter(u =>
        u.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.nik && u.nik.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.area_kerja && u.area_kerja.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Manajemen User</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Kelola hak akses dan peran para pengguna aplikasi.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept=".csv"
                        className="hidden"
                        onChange={handleImportCSV}
                    />
                    <Button onClick={handleImportClick} variant="ghost" className="flex items-center gap-2 w-full sm:w-auto justify-center rounded-2xl py-3 px-5 border border-slate-200 dark:border-slate-800">
                        <Upload size={18} /> Import CSV
                    </Button>
                    <Button onClick={handleExportCSV} variant="ghost" className="flex items-center gap-2 w-full sm:w-auto justify-center rounded-2xl py-3 px-5 border border-slate-200 dark:border-slate-800">
                        <Download size={18} /> Export CSV
                    </Button>
                    <Button onClick={handleOpenAdd} className="flex items-center gap-2 w-full sm:w-auto justify-center rounded-2xl py-3 px-6 shadow-xl shadow-blue-500/20">
                        <Plus size={18} /> Tambah User
                    </Button>
                </div>
            </div>

            {/* Success Alert */}
            {successMessage && (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl animate-in slide-in-from-top-4 duration-300">
                    <div className="p-1.5 bg-emerald-500 rounded-xl text-white shrink-0">
                        <Check size={16} />
                    </div>
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">{successMessage}</p>
                </div>
            )}

            {/* Error Alert */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl animate-in slide-in-from-top-4 duration-300">
                    <div className="p-1.5 bg-red-500 rounded-xl text-white shrink-0">
                        <AlertCircle size={16} />
                    </div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Filter and Search */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
                <div className="relative w-full md:max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Cari user berdasarkan nama, email, atau role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>
                <div className="text-xs text-slate-400 font-medium self-end md:self-auto">
                    Total: {filteredUsers.length} user
                </div>
            </div>

            {/* User List/Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">NIK / ID Pekerja</th>
                                <th className="px-6 py-4">Area Kerja</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="text-slate-400 text-sm mt-3 font-medium">Memuat data user...</p>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center">
                                        <Users size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                                        <p className="text-slate-400 font-medium text-sm">Tidak ada user yang ditemukan.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => {
                                    const isSelf = u.id_user === currentUser?.id;
                                    return (
                                        <tr key={u.id_user} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-base uppercase border border-blue-500/20">
                                                        {u.nama.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                            {u.nama}
                                                            {isSelf && (
                                                                <span className="text-[10px] font-black bg-blue-500 text-white px-2 py-0.5 rounded-full uppercase">Saya</span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-slate-400">
                                                            {u.jabatan ? `${u.jabatan} • ` : ''}{u.jenis_kelamin || 'Laki-laki'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm font-medium">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <Mail size={14} className="text-slate-400 shrink-0" />
                                                        <span className="truncate max-w-[200px]">{u.email}</span>
                                                    </div>
                                                    {u.no_whatsapp && (
                                                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                                                            <span className="inline-block w-3.5 h-3.5 bg-emerald-500 rounded text-[9px] text-white flex items-center justify-center font-black font-sans shrink-0">WA</span>
                                                            <span className="font-mono">{u.no_whatsapp}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.nik ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <BadgeCheck size={14} className="text-blue-400" />
                                                        <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{u.nik}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Belum diisi</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.area_kerja ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin size={14} className="text-emerald-400" />
                                                        <span className="text-sm text-slate-700 dark:text-slate-300">{u.area_kerja}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${ROLE_BADGES[u.role] || ROLE_BADGES.Staff}`}>
                                                    <Shield size={11} /> {u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenEdit(u)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                                                        title="Edit User"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(u.id_user, u.nama)}
                                                        disabled={isSelf}
                                                        className={`p-2 rounded-xl transition-all ${isSelf ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                        title={isSelf ? 'Anda tidak bisa menghapus diri sendiri' : 'Hapus User'}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div 
                    onClick={() => setShowModal(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-800 border-t-8 border-blue-600 w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                {isEditing ? <Edit2 size={20} className="text-blue-600" /> : <Plus size={20} className="text-blue-600" />}
                                {isEditing ? 'Perbarui Akun User' : 'Tambah User Baru'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label="Nama Lengkap"
                                placeholder="Contoh: Budi Santoso"
                                value={formData.nama}
                                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                required
                            />

                            <Input
                                label="Alamat Email"
                                type="email"
                                placeholder="budi@perusahaan.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Hak Akses / Peran</label>
                                    <div className="relative w-full">
                                        <select
                                            value={formData.role}
                                            onChange={(e) => handleRoleChange(e.target.value)}
                                            required
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none pr-10 font-medium"
                                        >
                                            <option value="Staff">Staff</option>
                                            <option value="Admin">Admin</option>
                                            <option value="HSE">HSE</option>
                                            <option value="Supervisor">Supervisor</option>
                                            <option value="Manager">Manager</option>
                                            <option value="Vendor">Vendor</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                                            <ChevronDown size={18} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Jenis Kelamin</label>
                                    <div className="relative w-full">
                                        <select
                                            value={formData.jenis_kelamin}
                                            onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                                            required
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none pr-10 font-medium"
                                        >
                                            <option value="Laki-laki">Laki-laki</option>
                                            <option value="Perempuan">Perempuan</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                                            <ChevronDown size={18} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Input
                                label={isEditing ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi'}
                                type="password"
                                placeholder={isEditing ? '••••••••' : 'Buat kata sandi minimal 6 karakter'}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required={!isEditing}
                            />

                            {/* Admin-only Operational Fields */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <BadgeCheck size={12} /> Data Operasional K3 (Hanya Admin)
                                </p>
                                <div className="space-y-3">
                                    <Input
                                        label="NIK / ID Pekerja (Badge Number)"
                                        placeholder="Contoh: EMP-2024-001"
                                        value={formData.nik}
                                        onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                                    />
                                    <Input
                                        label="Nomor WhatsApp"
                                        placeholder="Format: +62xxxxxxxxxx"
                                        value={formData.no_whatsapp}
                                        onChange={(e) => setFormData({ ...formData, no_whatsapp: e.target.value })}
                                    />
                                    <Input
                                        label="Jabatan / Job Title"
                                        placeholder="Contoh: Staff Lapangan, HSE Officer"
                                        value={formData.jabatan}
                                        onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                                    />
                                    <Input
                                        label="Area Kerja / Departemen"
                                        placeholder="Contoh: Area A - Boiler, Gedung B"
                                        value={formData.area_kerja}
                                        onChange={(e) => setFormData({ ...formData, area_kerja: e.target.value })}
                                    />
                                </div>
                            </div>

                            {isEditing && (
                                <div className="flex gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                                    <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                                        Perubahan kata sandi bersifat opsional saat mengedit data user.
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="flex-1 rounded-2xl py-4">Batal</Button>
                                <Button type="submit" className="flex-1 rounded-2xl py-4 shadow-xl shadow-blue-500/20">
                                    {isEditing ? 'Simpan Perubahan' : 'Tambah User'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div 
                    onClick={() => setShowDeleteModal(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-800 border-t-8 border-red-500 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                    >
                        <div className="flex justify-center mb-5">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                <Trash2 size={28} className="text-red-500" />
                            </div>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white text-center tracking-tighter mb-2">Hapus User?</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm text-center font-medium mb-6">
                            Apakah Anda yakin ingin menghapus user <span className="font-bold text-slate-700 dark:text-slate-300">"{userToDelete?.nama}"</span>? Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex gap-3">
                            <Button type="button" variant="ghost" onClick={() => setShowDeleteModal(false)} className="flex-1 rounded-2xl py-3 border border-slate-200 dark:border-slate-700">
                                Batal
                            </Button>
                            <Button type="button" variant="danger" onClick={confirmDelete} className="flex-1 rounded-2xl py-3 shadow-xl shadow-red-500/20">
                                Ya, Hapus
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;
