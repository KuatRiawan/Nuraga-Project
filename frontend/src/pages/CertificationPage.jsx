import { useState, useEffect } from 'react';
import api from '../api/axios';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../store/AuthContext';
import { Award, Plus, Calendar, ShieldCheck, AlertTriangle, CheckCircle2, Clock, Edit, Trash2, X, MessageSquare } from 'lucide-react';

const getDaysUntilExpiry = (dateStr) => {
    const now = new Date();
    const expiry = new Date(dateStr);
    return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
};

const getWhatsAppLink = (cert, daysLeft) => {
    const phone = cert.User?.no_whatsapp ? cert.User.no_whatsapp.replace(/[^0-9+]/g, '') : '';
    const formattedPhone = phone.replace('+', '');
    
    let message = '';
    if (daysLeft <= 0) {
        message = `Halo ${cert.User?.nama || cert.nama_personil}, sertifikat kompetensi Anda untuk *${cert.jenis_sertifikasi}* dengan nomor *${cert.nomor_sertifikat}* telah kadaluarsa pada tanggal ${new Date(cert.tanggal_expired).toLocaleDateString('id-ID')}. Mohon segera lakukan perpanjangan di kantor HSE. Terima kasih.`;
    } else {
        message = `Halo ${cert.User?.nama || cert.nama_personil}, masa berlaku sertifikat kompetensi Anda untuk *${cert.jenis_sertifikasi}* dengan nomor *${cert.nomor_sertifikat}* akan berakhir dalam *${daysLeft}* hari (${new Date(cert.tanggal_expired).toLocaleDateString('id-ID')}). Mohon segera lakukan perpanjangan di kantor HSE. Terima kasih.`;
    }
    
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
};

const CertificationPage = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'Admin';

    const [certs, setCerts] = useState([]);
    const [users, setUsers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingCert, setEditingCert] = useState(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        id_user: '',
        nama_personil: '',
        jenis_sertifikasi: '',
        nomor_sertifikat: '',
        tanggal_terbit: '',
        tanggal_expired: '',
    });

    useEffect(() => {
        fetchCerts();
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin]);

    const fetchCerts = async () => {
        try {
            const url = isAdmin ? '/certifications/all' : '/certifications/my';
            const res = await api.get(url);
            // Sort: expiring soon first
            const sorted = [...res.data].sort((a, b) => getDaysUntilExpiry(a.tanggal_expired) - getDaysUntilExpiry(b.tanggal_expired));
            setCerts(sorted);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingCert) {
                await api.put(`/certifications/${editingCert.id_certification}`, formData);
            } else {
                await api.post('/certifications', formData);
            }
            setShowForm(false);
            setFormData({ id_user: '', nama_personil: '', jenis_sertifikasi: '', nomor_sertifikat: '', tanggal_terbit: '', tanggal_expired: '' });
            setEditingCert(null);
            fetchCerts();
        } catch (err) {
            console.error(err);
            alert('Gagal menyimpan sertifikat');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (cert) => {
        setEditingCert(cert);
        setFormData({
            id_user: cert.id_user || '',
            nama_personil: cert.nama_personil || '',
            jenis_sertifikasi: cert.jenis_sertifikasi || '',
            nomor_sertifikat: cert.nomor_sertifikat || '',
            tanggal_terbit: cert.tanggal_terbit ? cert.tanggal_terbit.split('T')[0] : '',
            tanggal_expired: cert.tanggal_expired ? cert.tanggal_expired.split('T')[0] : '',
        });
        setShowForm(true);
    };

    const handleDelete = async (certId) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus sertifikat ini?')) return;
        try {
            await api.delete(`/certifications/${certId}`);
            fetchCerts();
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus sertifikat');
        }
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingCert(null);
        setFormData({ id_user: '', nama_personil: '', jenis_sertifikasi: '', nomor_sertifikat: '', tanggal_terbit: '', tanggal_expired: '' });
    };

    // Count certs expiring ≤ 30 days
    const expiringCount = certs.filter(c => getDaysUntilExpiry(c.tanggal_expired) <= 30 && getDaysUntilExpiry(c.tanggal_expired) > 0).length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Sertifikasi Kompetensi</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                        {isAdmin ? 'Kelola seluruh sertifikat keselamatan karyawan Nuraga.' : 'Daftar lisensi dan sertifikat K3 aktif Anda.'}
                    </p>
                </div>
                {isAdmin && (
                    <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 w-full sm:w-auto justify-center rounded-2xl py-5 px-8 shadow-xl shadow-blue-500/20">
                        <Plus size={18} /> Tambah Sertifikat
                    </Button>
                )}
            </div>

            {/* Expiry Alert Banner */}
            {expiringCount > 0 && (
                <div className="flex items-start gap-4 p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl animate-in slide-in-from-top-4 duration-300">
                    <div className="p-2 bg-amber-500 rounded-xl text-white mt-0.5 shrink-0">
                        <AlertTriangle size={18} />
                    </div>
                    <div>
                        <p className="font-black text-amber-700 dark:text-amber-400 text-sm uppercase tracking-wider">Peringatan Kadaluarsa!</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                            <strong>{expiringCount}</strong> sertifikat {isAdmin ? 'karyawan' : 'Anda'} akan kadaluarsa dalam 30 hari ke depan.
                        </p>
                    </div>
                </div>
            )}

            {/* Add/Edit Certification Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 border-t-8 border-blue-600 w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                        <button onClick={handleCloseForm} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-6">
                            {editingCert ? 'Edit Sertifikat' : 'Daftarkan Sertifikat Baru'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {isAdmin && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Karyawan / Personil</label>
                                    <select
                                        value={formData.id_user}
                                        onChange={(e) => {
                                            const selectedUser = users.find(u => String(u.id_user) === e.target.value);
                                            setFormData({
                                                ...formData,
                                                id_user: e.target.value,
                                                nama_personil: selectedUser ? selectedUser.nama : ''
                                            });
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm text-slate-900 dark:text-white"
                                        required
                                    >
                                        <option value="">-- Pilih User --</option>
                                        {users.map(u => (
                                            <option key={u.id_user} value={u.id_user}>{u.nama} ({u.role})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {!isAdmin && (
                                <Input
                                    label="Nama Personil yang Bersertifikat"
                                    value={formData.nama_personil}
                                    disabled
                                />
                            )}

                            <Input
                                label="Jenis Sertifikasi"
                                placeholder="Contoh: SIO Forklift, Ahli K3 Umum, P3K"
                                value={formData.jenis_sertifikasi}
                                onChange={(e) => setFormData({ ...formData, jenis_sertifikasi: e.target.value })}
                                required
                            />
                            <Input
                                label="Nomor Sertifikat"
                                placeholder="Contoh: SKP-2024-0012"
                                value={formData.nomor_sertifikat}
                                onChange={(e) => setFormData({ ...formData, nomor_sertifikat: e.target.value })}
                                required
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Tanggal Terbit"
                                    type="date"
                                    value={formData.tanggal_terbit}
                                    onChange={(e) => setFormData({ ...formData, tanggal_terbit: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Tanggal Kadaluarsa"
                                    type="date"
                                    value={formData.tanggal_expired}
                                    onChange={(e) => setFormData({ ...formData, tanggal_expired: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <Button type="button" variant="ghost" onClick={handleCloseForm} className="flex-1 rounded-2xl py-4">Batal</Button>
                                <Button type="submit" className="flex-1 rounded-2xl py-4 shadow-xl shadow-blue-500/20" loading={loading}>
                                    {loading ? 'Menyimpan...' : 'Simpan Sertifikat'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Certification Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certs.length === 0 && (
                    <div className="md:col-span-3 p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                        <Award size={48} className="mx-auto mb-4 text-slate-200 dark:text-slate-700" />
                        <p className="text-slate-400 font-medium">Belum ada sertifikasi yang terdaftar.</p>
                    </div>
                )}
                {certs.map((cert) => {
                    const daysLeft = getDaysUntilExpiry(cert.tanggal_expired);
                    const isExpired = daysLeft <= 0;
                    const isExpiring = daysLeft > 0 && daysLeft <= 30;
                    const isActive = daysLeft > 30;

                    const cardStyle = isExpired ? 'border-red-400 dark:border-red-650/50 bg-red-500/5' :
                        isExpiring ? 'border-amber-400 dark:border-amber-600/50 bg-amber-500/5' :
                            'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';

                    return (
                        <div key={cert.id_certification} className={`border-2 p-6 rounded-2xl relative overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300 ${cardStyle}`}>
                            {/* Expiry Pulse Indicator */}
                            {isExpiring && (
                                <div className="absolute top-4 right-4">
                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full animate-pulse">
                                        <Clock size={10} /> {daysLeft} HARI LAGI
                                    </span>
                                </div>
                            )}
                            {isExpired && (
                                <div className="absolute top-4 right-4">
                                    <span className="text-[10px] font-black text-red-650 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full uppercase">
                                        Kadaluarsa
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center gap-3 mb-5 pr-20">
                                <div className={`p-2.5 rounded-xl ${isActive ? 'bg-blue-500/10 text-blue-600' : isExpiring ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-550'}`}>
                                    <ShieldCheck size={22} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 dark:text-white leading-tight">{cert.jenis_sertifikasi}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">{cert.nama_personil}</p>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm">
                                <p className="text-slate-500">No: <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{cert.nomor_sertifikat}</span></p>
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/50 mt-3">
                                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                        <Calendar size={12} />
                                        <span>{new Date(cert.tanggal_expired).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isActive && (
                                            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">
                                                <CheckCircle2 size={10} /> Aktif
                                            </span>
                                        )}
                                        {isAdmin && (
                                            <div className="flex items-center gap-1.5">
                                                {(isExpired || isExpiring) && cert.User?.no_whatsapp && (
                                                    <a
                                                        href={getWhatsAppLink(cert, daysLeft)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors flex items-center justify-center"
                                                        title="Kirim Peringatan WhatsApp"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MessageSquare size={13} />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(cert); }}
                                                    className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-lg transition-colors"
                                                    title="Edit Sertifikat"
                                                >
                                                    <Edit size={13} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(cert.id_certification); }}
                                                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-650 dark:text-red-400 rounded-lg transition-colors"
                                                    title="Hapus Sertifikat"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CertificationPage;
