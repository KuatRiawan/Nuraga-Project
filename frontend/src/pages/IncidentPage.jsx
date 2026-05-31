import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import Button from '../components/Button';
import Input from '../components/Input';
import { Plus, Info, Users, MapPin, Camera, ClipboardList, Download, X, CheckCircle2 } from 'lucide-react';
import { generateIncidentReport } from '../utils/reportGenerator';
import { useAuth } from '../store/AuthContext';

const IncidentPage = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const location = useLocation();
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [formData, setFormData] = useState({
        kategori: 'Near Miss',
        kronologi: '',
        korban: '',
        loss_cost: 0,
        five_whys: { why1: '', why2: '', why3: '', why4: '', why5: '' }
    });
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);

    const videoRef = useRef(null);
    const [isCameraActive, setIsCameraActive] = useState(false);

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        setFile(f);
        if (f) setPreview(URL.createObjectURL(f));
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            setIsCameraActive(true);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 150);
        } catch (err) {
            alert('Gagal mengakses kamera: ' + err.message);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        if (!video) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            const f = new File([blob], `incident-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setFile(f);
            setPreview(URL.createObjectURL(blob));
            stopCamera();
        }, 'image/jpeg', 0.95);
    };

    useEffect(() => {
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, []);

    const [selectedIncident, setSelectedIncident] = useState(null);
    const [investigationData, setInvestigationData] = useState({
        loss_cost: 0,
        five_whys: { why1: '', why2: '', why3: '', why4: '', why5: '' }
    });

    const isFieldRole = ['Staff', 'Operator', 'Vendor', 'Kontraktor'].includes(user?.role);
    const canEditInvestigation = user?.role === 'HSE' || user?.role === 'Admin';

    // Auto open form if redirected from dashboard quick action
    useEffect(() => {
        if (location.state?.openForm) {
            setShowForm(true);
        }
    }, [location]);

    const { data: incidents = [] } = useQuery({
        queryKey: ['incidents'],
        queryFn: async () => {
            const res = await api.get('/incidents');
            return res.data.data || res.data;
        }
    });

    useEffect(() => {
        if (selectedIncident) {
            setInvestigationData({
                loss_cost: selectedIncident.loss_cost || 0,
                five_whys: selectedIncident.five_whys || { why1: '', why2: '', why3: '', why4: '', why5: '' }
            });
        }
    }, [selectedIncident]);

    const createMutation = useMutation({
        mutationFn: async (data) => {
            await api.post('/incidents', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: () => {
            stopCamera();
            setShowForm(false);
            setFormData({
                kategori: 'Near Miss', kronologi: '', korban: '', loss_cost: 0,
                five_whys: { why1: '', why2: '', why3: '', why4: '', why5: '' }
            });
            setFile(null);
            setPreview(null);
            queryClient.invalidateQueries(['incidents']);
        },
        onError: (err) => {
            console.error(err);
        },
        onSettled: () => {
            setLoading(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.put(`/incidents/${selectedIncident.id_incident}`, payload);
            return res.data;
        },
        onSuccess: () => {
            setSelectedIncident(null);
            queryClient.invalidateQueries(['incidents']);
            setSuccessMessage('Hasil investigasi berhasil disimpan.');
            setShowSuccessModal(true);
        },
        onError: (err) => {
            console.error(err);
            setSuccessMessage(err.response?.data?.message || 'Gagal menyimpan hasil investigasi.');
            setShowSuccessModal(true);
        },
        onSettled: () => {
            setLoading(false);
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const data = new FormData();
        data.append('kategori', formData.kategori);
        data.append('kronologi', formData.kronologi);
        data.append('korban', formData.korban);
        data.append('loss_cost', formData.loss_cost);
        data.append('five_whys', JSON.stringify(formData.five_whys));
        if (file) data.append('foto', file);

        createMutation.mutate(data);
    };

    const handleSaveInvestigation = async (e) => {
        e.preventDefault();
        setLoading(true);
        updateMutation.mutate({
            loss_cost: investigationData.loss_cost,
            five_whys: investigationData.five_whys
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Laporan Insiden (Incident Report)</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Investigasi akar masalah dengan metode 5 Whys & Loss Cost tracking.</p>
                </div>
                <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 w-full sm:w-auto justify-center rounded-2xl py-6 px-8 shadow-xl shadow-red-500/20" variant="danger">
                    <Plus size={18} /> Laporkan Insiden
                </Button>
            </div>

            {showForm && (
                <div 
                    onClick={() => { stopCamera(); setShowForm(false); setPreview(null); }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-800 border-t-8 border-red-600 w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                    >
                        <h2 className="text-xl font-black mb-6 text-red-600 dark:text-red-500 uppercase tracking-tighter">Investigasi Insiden Digital</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className={isFieldRole ? "grid grid-cols-1 gap-5" : "grid grid-cols-1 md:grid-cols-2 gap-5"}>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Kategori Insiden</label>
                                    <select
                                        className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-600 transition-all font-bold"
                                        value={formData.kategori}
                                        onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                                    >
                                        <option value="Near Miss">Near Miss</option>
                                        <option value="First Aid">First Aid</option>
                                        <option value="Medical Treatment">Medical Treatment</option>
                                        <option value="Lost Time Injury (LTI)">Lost Time Injury (LTI)</option>
                                        <option value="Fatality">Fatality</option>
                                        <option value="Property Damage">Property Damage</option>
                                    </select>
                                </div>
                                {!isFieldRole && (
                                    <Input
                                        label="Estimasi Kerugian (Loss Cost USD)"
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.loss_cost}
                                        onChange={(e) => setFormData({ ...formData, loss_cost: e.target.value })}
                                        required
                                    />
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Kronologi Kejadian</label>
                                <textarea
                                    className="px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-600 transition-all h-24"
                                    placeholder="Ceritakan urutan kejadian..."
                                    value={formData.kronologi}
                                    onChange={(e) => setFormData({ ...formData, kronologi: e.target.value })}
                                    required
                                />
                            </div>

                            {!isFieldRole && (
                                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-4">
                                    <label className="flex items-center gap-2 text-xs font-black text-red-600 dark:text-red-400 tracking-widest px-1 uppercase">
                                        <Info size={14} /> Analisis Akar Masalah (5 Whys)
                                    </label>
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <div key={num} className="flex gap-4 items-center">
                                            <span className="text-xs font-black text-slate-300 dark:text-slate-600 w-4">{num}.</span>
                                            <input
                                                type="text"
                                                className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-red-500 transition-all"
                                                placeholder={`Kenapa kejadian ini bisa terjadi? (Why ${num})`}
                                                value={formData.five_whys[`why${num}`]}
                                                onChange={(e) => setFormData({ ...formData, five_whys: { ...formData.five_whys, [`why${num}`]: e.target.value } })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Input
                                    label="Daftar Korban / Personel Terlibat"
                                    placeholder="Contoh: Andi, Budi (Pekerja Lapangan)"
                                    value={formData.korban}
                                    onChange={(e) => setFormData({ ...formData, korban: e.target.value })}
                                />
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Dokumentasi Foto</label>
                                    {isCameraActive ? (
                                        <div className="relative w-full overflow-hidden rounded-2xl bg-black border-4 border-red-500 shadow-xl flex flex-col items-center justify-center aspect-[4/3] group animate-in zoom-in-95">
                                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4 z-20">
                                                <button
                                                    type="button"
                                                    onClick={stopCamera}
                                                    className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-lg transition-all active:scale-95"
                                                >
                                                    Batal
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={capturePhoto}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-lg transition-all flex items-center gap-1.5 active:scale-95"
                                                >
                                                    <Camera size={14} /> Ambil Foto
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="relative group">
                                                <input
                                                    type="file"
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                />
                                                {preview ? (
                                                    <div className="relative rounded-2xl overflow-hidden h-36">
                                                        <img src={preview} alt="preview" className="w-full h-full object-cover" onError={(e) => { e.target.src = '/fallback.png'; e.target.onerror = null; }} />
                                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white text-xs font-bold">Klik untuk ganti</div>
                                                    </div>
                                                ) : (
                                                    <div className="px-4 py-3 bg-white dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-3 text-slate-400 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-all">
                                                        <Camera size={18} />
                                                        <span className="text-xs font-bold">Upload Foto Insiden</span>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={startCamera}
                                                className="mt-2 w-full bg-red-50 dark:bg-slate-800 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-750 hover:bg-red-100 dark:hover:bg-slate-700 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                            >
                                                <Camera size={14} /> Buka Kamera (Ambil Foto Langsung)
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button type="button" variant="ghost" onClick={() => { stopCamera(); setShowForm(false); setPreview(null); }} className="flex-1 rounded-2xl py-4">Kembali</Button>
                                <Button type="submit" variant="danger" className="flex-1 rounded-2xl py-4 shadow-lg shadow-red-500/20" loading={loading}>{loading ? 'Mengirim...' : 'Kirim Investigasi'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Incident List */}
            <div className="space-y-4">
                {incidents.length === 0 && (
                    <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                        <ClipboardList size={48} className="mx-auto mb-4 text-slate-200 dark:text-slate-700" />
                        <p className="text-slate-400 font-medium">Belum ada laporan insiden kecelakaan kerja. Pertahankan kinerja K3 Anda!</p>
                    </div>
                )}
                {incidents.map((incident) => (
                    <div
                        key={incident.id_incident}
                        onClick={() => setSelectedIncident(incident)}
                        className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-start shadow-sm hover:shadow-md transition-all duration-300 hover:border-red-500/30"
                    >
                        <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-500 rounded-xl">
                            <ClipboardList size={32} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{incident.kategori}</h3>
                                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        <span className="flex items-center gap-1"><Users size={12} /> {incident.korban || 'No victims'}</span>
                                        <span className="flex items-center gap-1"><MapPin size={12} /> {new Date(incident.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-500 rounded-full text-[10px] font-bold uppercase tracking-widest">Reported</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{incident.kronologi}</p>
                            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50">
                                <span className="text-xs text-slate-500">Filed by: <span className="text-slate-900 dark:text-slate-400 font-medium">{incident.User?.nama}</span></span>
                                <Button
                                    variant="secondary"
                                    className="text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800/50 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        try {
                                            generateIncidentReport(incident);
                                        } catch (err) {
                                            console.error(err);
                                            alert('Failed to generate incident report');
                                        }
                                    }}
                                >
                                    <Download size={12} /> PDF
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* selectedIncident Detail Modal */}
            {selectedIncident && (
                <div 
                    onClick={() => setSelectedIncident(null)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-800 border-t-8 border-red-600 w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-500 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                    Detail Insiden & Investigasi
                                </span>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mt-2 flex items-center gap-2">
                                    <ClipboardList size={24} className="text-red-600" />
                                    {selectedIncident.kategori}
                                </h2>
                            </div>
                            <button onClick={() => setSelectedIncident(null)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6 text-sm text-slate-650 dark:text-slate-350">
                            {/* Incident Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div>
                                    <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Pelapor</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedIncident.User?.nama} ({selectedIncident.User?.role})</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Waktu Laporan</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{new Date(selectedIncident.createdAt).toLocaleString('id-ID')}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Korban / Personel Terlibat</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedIncident.korban || 'Tidak ada korban teridentifikasi'}</p>
                                </div>
                            </div>

                            {/* Chronology */}
                            <div className="space-y-1.5">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Kronologi Kejadian</h3>
                                <p className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/80 leading-relaxed">
                                    {selectedIncident.kronologi}
                                </p>
                            </div>

                            {/* Photo Attachment if available */}
                            {selectedIncident.foto && (
                                <div className="space-y-1.5">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Foto Dokumentasi</h3>
                                    <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 max-h-60 flex items-center justify-center bg-slate-900">
                                        <img src={`/uploads/${selectedIncident.foto}`} alt="Dokumentasi Insiden" className="w-full h-full object-contain" onError={(e) => { e.target.src = '/fallback.png'; e.target.onerror = null; }} />
                                    </div>
                                </div>
                            )}

                            {/* Investigation Module (5 Whys & Loss Cost) */}
                            {canEditInvestigation ? (
                                <form onSubmit={handleSaveInvestigation} className="space-y-5 border-t border-slate-100 dark:border-slate-800 pt-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black text-red-600 dark:text-red-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <Info size={14} /> Investigasi K3 (HSE Officer & Admin)
                                        </h3>
                                        <span className="text-[10px] bg-red-100 dark:bg-red-950/40 text-red-650 dark:text-red-400 font-extrabold px-2 py-0.5 rounded-md">Edit Mode</span>
                                    </div>

                                    <Input
                                        label="Estimasi Kerugian (Loss Cost USD)"
                                        type="number"
                                        placeholder="0.00"
                                        value={investigationData.loss_cost}
                                        onChange={(e) => setInvestigationData({ ...investigationData, loss_cost: e.target.value })}
                                        required
                                    />

                                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-4">
                                        <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 block">
                                            Analisis Akar Masalah (5 Whys)
                                        </label>
                                        {[1, 2, 3, 4, 5].map(num => (
                                            <div key={num} className="flex gap-4 items-center">
                                                <span className="text-xs font-black text-slate-400 w-4">{num}.</span>
                                                <input
                                                    type="text"
                                                    className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-red-500 transition-all font-medium"
                                                    placeholder={`Kenapa kejadian ini bisa terjadi? (Why ${num})`}
                                                    value={investigationData.five_whys[`why${num}`] || ''}
                                                    onChange={(e) => setInvestigationData({
                                                        ...investigationData,
                                                        five_whys: { ...investigationData.five_whys, [`why${num}`]: e.target.value }
                                                    })}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-4 pt-2">
                                        <Button type="button" variant="ghost" onClick={() => setSelectedIncident(null)} className="flex-1 rounded-2xl py-4">Batal</Button>
                                        <Button type="submit" variant="danger" className="flex-1 rounded-2xl py-4 shadow-lg shadow-red-500/20" loading={loading}>
                                            Simpan Hasil Investigasi
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                        Hasil Investigasi K3
                                    </h3>
                                    {(!selectedIncident.loss_cost && (!selectedIncident.five_whys || Object.values(selectedIncident.five_whys).every(w => !w))) ? (
                                        <div className="p-6 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 text-center text-slate-450 dark:text-slate-500 font-bold">
                                            ⚠️ Belum diinvestigasi oleh HSE Officer.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/30 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <span className="text-xs font-bold text-slate-500">Estimasi Kerugian (Loss Cost)</span>
                                                <span className="font-mono text-sm font-black text-red-600 dark:text-red-400">${selectedIncident.loss_cost?.toLocaleString() || 0} USD</span>
                                            </div>

                                            <div className="p-6 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                                                <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Analisis Akar Masalah (5 Whys)</p>
                                                {[1, 2, 3, 4, 5].map(num => {
                                                    const whyText = selectedIncident.five_whys?.[`why${num}`];
                                                    if (!whyText) return null;
                                                    return (
                                                        <div key={num} className="flex gap-3 items-start text-xs">
                                                            <span className="font-black text-red-500 shrink-0 w-4">W{num}:</span>
                                                            <span className="text-slate-700 dark:text-slate-350 font-bold italic">"{whyText}"</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    <div className="pt-2">
                                        <Button type="button" variant="secondary" onClick={() => setSelectedIncident(null)} className="w-full rounded-2xl py-4">Tutup</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div 
                    onClick={() => setShowSuccessModal(false)}
                    className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200"
                    >
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                {successMessage.includes('Gagal') ? 'Perhatian' : 'Berhasil'}
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                {successMessage}
                            </p>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default IncidentPage;
