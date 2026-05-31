import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import Button from '../components/Button';
import Input from '../components/Input';
import { AlertTriangle, MapPin, Camera, Zap, CheckCircle, Clock, X } from 'lucide-react';
import { useAuth } from '../store/AuthContext';

const RISK_CONFIG = {
    Low: { color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
    Medium: { color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
    High: { color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-500' },
    Critical: { color: 'bg-red-500/10 text-red-600 dark:text-red-400', border: 'border-red-500/30', dot: 'bg-red-500 animate-pulse' },
};

const HazardPage = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const location = useLocation();
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [formData, setFormData] = useState({ lokasi: '', deskripsi: '', risiko: 'Low', koordinat_gps: '' });
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [aiPredictedRisk, setAiPredictedRisk] = useState(null);
    const [selectedHazard, setSelectedHazard] = useState(null);

    const videoRef = useRef(null);
    const [isCameraActive, setIsCameraActive] = useState(false);

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
            const f = new File([blob], `hazard-${Date.now()}.jpg`, { type: 'image/jpeg' });
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

    // Auto open form if redirected from dashboard quick action
    useEffect(() => {
        if (location.state?.openForm) {
            setShowForm(true);
        }
    }, [location]);

    const { data: hazards = [] } = useQuery({
        queryKey: ['hazards'],
        queryFn: async () => {
            const res = await api.get('/hazards');
            return res.data;
        }
    });

    const verifyMutation = useMutation({
        mutationFn: async (id) => {
            const res = await api.patch(`/hazards/${id}/verify`);
            return res.data;
        },
        onSuccess: (data) => {
            setSelectedHazard(data.hazard || data);
            queryClient.invalidateQueries(['hazards']);
        }
    });

    const overrideMutation = useMutation({
        mutationFn: async ({ id, risiko }) => {
            const res = await api.patch(`/hazards/${id}/override`, { risiko });
            return res.data;
        },
        onSuccess: (data) => {
            setSelectedHazard(data);
            queryClient.invalidateQueries(['hazards']);
        }
    });

    const analyzeWithAI = async () => {
        if (!formData.deskripsi) return alert('Masukkan deskripsi bahaya terlebih dahulu.');
        setAnalyzing(true);
        setAiPredictedRisk(null);
        try {
            const res = await api.post('/ai/analyze', { deskripsi: formData.deskripsi, lokasi: formData.lokasi });
            const risk = res.data.predicted_risk || formData.risiko;
            setFormData(prev => ({ ...prev, risiko: risk }));
            setAiPredictedRisk(risk);
        } catch (err) {
            console.error('AI analyze failed:', err);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        setFile(f);
        if (f) setPreview(URL.createObjectURL(f));
    };

    const createMutation = useMutation({
        mutationFn: async (data) => {
            await api.post('/hazards', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: () => {
            stopCamera();
            setShowForm(false);
            setFormData({ lokasi: '', deskripsi: '', risiko: 'Low', koordinat_gps: '' });
            setFile(null);
            setPreview(null);
            setAiPredictedRisk(null);
            queryClient.invalidateQueries(['hazards']);
        },
        onError: (err) => {
            console.error(err);
            alert('Gagal melapor bahaya');
        },
        onSettled: () => {
            setLoading(false);
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const data = new FormData();
        data.append('lokasi', formData.lokasi);
        data.append('deskripsi', formData.deskripsi);
        data.append('risiko', formData.risiko);
        data.append('koordinat_gps', formData.koordinat_gps);
        if (file) data.append('foto', file);

        createMutation.mutate(data);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Laporan Bahaya</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Laporkan Unsafe Action & Condition dalam waktu &lt;1 menit.</p>
                </div>
                <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 w-full sm:w-auto justify-center rounded-2xl py-5 px-8 shadow-xl shadow-blue-500/20">
                    <Zap size={18} className="fill-white" /> Laporan Kilat
                </Button>
            </div>

            {/* === FORM MODAL === */}
            {showForm && (
                <div 
                    onClick={() => { stopCamera(); setShowForm(false); setPreview(null); setAiPredictedRisk(null); }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-800 border-t-8 border-blue-600 w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Buat Laporan Baru</h2>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                <MapPin size={12} className="text-blue-600" />
                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 font-mono">{formData.koordinat_gps}</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <Input
                                label="Lokasi Kejadian"
                                placeholder="Contoh: Area Produksi Zone A-01"
                                value={formData.lokasi}
                                onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                                required
                            />

                            <div className="flex flex-col gap-1.5 relative">
                                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Deskripsi Bahaya</label>
                                <textarea
                                    className="px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all h-28"
                                    placeholder="Apa bahaya yang Anda temukan?"
                                    value={formData.deskripsi}
                                    onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={analyzeWithAI}
                                    disabled={analyzing}
                                    className="absolute bottom-3 right-3 py-2 px-3 bg-blue-600 rounded-xl text-white hover:bg-blue-700 transition-all flex items-center gap-2 text-[10px] font-black shadow-lg disabled:opacity-50 active:scale-95"
                                >
                                    {analyzing ? 'ANALYZING...' : <><Zap size={12} className="fill-white" /> AI RISK</>}
                                </button>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 flex items-center justify-between transition-all duration-300">
                                    <span>Tingkat Risiko</span>
                                    {analyzing && (
                                        <span className="text-[10px] text-blue-600 dark:text-blue-400 animate-pulse flex items-center gap-1 normal-case font-bold">
                                            <Zap size={10} className="fill-blue-600 animate-bounce" /> Menilai dengan AI...
                                        </span>
                                    )}
                                    {aiPredictedRisk && !analyzing && (
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-right-2 duration-300 flex items-center gap-1 normal-case font-extrabold">
                                            ✨ AI Predicted: {aiPredictedRisk}
                                        </span>
                                    )}
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {Object.keys(RISK_CONFIG).map(r => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => {
                                                setFormData({ ...formData, risiko: r });
                                                setAiPredictedRisk(null);
                                            }}
                                            className={`py-3 rounded-xl text-xs font-black border-2 transition-all ${formData.risiko === r ? `${RISK_CONFIG[r].color} ${RISK_CONFIG[r].border} shadow-lg` : 'border-slate-100 dark:border-slate-700 text-slate-400 bg-slate-50 dark:bg-slate-900/50'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                                {(formData.risiko === 'High' || formData.risiko === 'Critical') && (
                                    <p className="text-[10px] font-black text-red-500 flex items-center gap-1 mt-1">
                                        <AlertTriangle size={12} /> Tiket CAPA otomatis akan dibuat untuk risiko ini.
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Foto Bukti (Wajib untuk High/Critical)</label>
                                {isCameraActive ? (
                                    <div className="relative w-full overflow-hidden rounded-2xl bg-black border-4 border-blue-500 shadow-xl flex flex-col items-center justify-center aspect-[4/3] group animate-in zoom-in-95">
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
                                        <label className="cursor-pointer">
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                            {preview ? (
                                                <div className="relative rounded-2xl overflow-hidden h-36">
                                                    <img src={preview} alt="preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white text-xs font-bold">Klik untuk ganti</div>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl h-28 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 transition-colors">
                                                    <Camera size={24} className="mb-2" />
                                                    <span className="text-xs font-bold">Klik untuk unggah foto</span>
                                                </div>
                                            )}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={startCamera}
                                            className="mt-2 w-full bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-750 hover:bg-blue-100 dark:hover:bg-slate-700 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                        >
                                            <Camera size={14} /> Buka Kamera (Ambil Foto Langsung)
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className="flex gap-4 pt-2">
                                <Button type="button" variant="ghost" onClick={() => { stopCamera(); setShowForm(false); setPreview(null); setAiPredictedRisk(null); }} className="flex-1 rounded-2xl py-4">Batal</Button>
                                <Button type="submit" className="flex-1 rounded-2xl py-4 shadow-xl shadow-blue-500/20" loading={loading}>
                                    {loading ? 'Mengirim...' : 'Kirim Laporan'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* === HAZARD LIST === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {hazards.length === 0 && (
                    <div className="md:col-span-2 p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                        <AlertTriangle size={48} className="mx-auto mb-4 text-slate-200 dark:text-slate-700" />
                        <p className="text-slate-400 font-medium">Belum ada laporan bahaya. Bagus!</p>
                    </div>
                )}
                {hazards.map((hazard) => {
                    const risk = RISK_CONFIG[hazard.risiko] || RISK_CONFIG.Low;
                    return (
                        <div key={hazard.id_hazard} className={`bg-white dark:bg-slate-900 border ${risk.border} border-l-4 p-6 rounded-2xl flex flex-col gap-4 shadow-sm hover:shadow-md transition-all duration-300`}>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${risk.dot}`} />
                                    <div>
                                        <h3 className="font-black text-slate-900 dark:text-white">{hazard.lokasi}</h3>
                                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                            <MapPin size={10} /> {hazard.koordinat_gps || 'GPS tersimpan'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                        {hazard.is_verified && (
                                            <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase rounded">
                                                Verified
                                            </span>
                                        )}
                                        {hazard.is_overridden && (
                                            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase rounded">
                                                Overridden
                                            </span>
                                        )}
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${risk.color}`}>{hazard.risiko}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">{hazard.status}</span>
                                </div>
                            </div>

                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed line-clamp-3">{hazard.deskripsi}</p>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                                <span className="text-xs text-slate-500">
                                    Dilaporkan: <span className="font-bold text-slate-700 dark:text-slate-300">{hazard.User?.nama || 'Unknown'}</span>
                                </span>
                                <div className="flex items-center justify-between sm:justify-end gap-4">
                                    <div className="flex items-center gap-2">
                                        {(hazard.risiko === 'High' || hazard.risiko === 'Critical') && (
                                            <span className="flex items-center gap-1 text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-1 rounded-lg">
                                                <CheckCircle size={10} /> CAPA
                                            </span>
                                        )}
                                        <span className="text-xs text-slate-400">
                                            <Clock size={10} className="inline mr-1" />
                                            {new Date(hazard.createdAt).toLocaleDateString('id-ID')}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setSelectedHazard(hazard)}
                                        className="text-blue-600 dark:text-blue-400 text-xs font-black hover:underline"
                                    >
                                        Detail →
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Hazard Detail Modal */}
            {selectedHazard && (() => {
                const risk = RISK_CONFIG[selectedHazard.risiko] || RISK_CONFIG.Low;
                const imageUrl = selectedHazard.foto ? `/uploads/${selectedHazard.foto}` : null;
                const mapsUrl = selectedHazard.koordinat_gps ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedHazard.koordinat_gps)}` : null;

                return (
                    <div 
                        onClick={() => setSelectedHazard(null)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                    >
                        <div 
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-slate-900 border-t-8 border-blue-600 w-full max-w-xl rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto space-y-6"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${risk.color}`}>
                                        Risiko {selectedHazard.risiko}
                                    </span>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mt-2">{selectedHazard.lokasi}</h2>
                                </div>
                                <button onClick={() => setSelectedHazard(null)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Dilaporkan Oleh</p>
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">{selectedHazard.User?.nama || 'Unknown'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tanggal Laporan</p>
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">
                                        {new Date(selectedHazard.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status Laporan</p>
                                    <span className="inline-block px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 text-[10px] font-black uppercase tracking-wider rounded-lg mt-1">
                                        {selectedHazard.status}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Verifikasi K3</p>
                                    {selectedHazard.is_verified ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-wider rounded-lg mt-1 border border-emerald-500/20">
                                            ✓ Terverifikasi (+100 Poin)
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-wider rounded-lg mt-1 border border-amber-500/20">
                                            ⚠ Menunggu Validasi
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Koordinat GPS</p>
                                    {mapsUrl ? (
                                        <a
                                            href={mapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-mono font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-1"
                                        >
                                            <MapPin size={10} /> {selectedHazard.koordinat_gps}
                                        </a>
                                    ) : (
                                        <span className="text-slate-300 text-xs">—</span>
                                    )}
                                </div>
                            </div>

                             {/* HSE/Admin Validation Section */}
                             {(user?.role === 'HSE' || user?.role === 'Admin') && !selectedHazard.is_verified && (
                                 <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                                     <div className="flex-1">
                                         <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Validasi Laporan K3</p>
                                         <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                             Validasikan laporan ini untuk menyetujui temuan bahaya dan mengirimkan reward 100 poin safety kepada pelapor.
                                         </p>
                                     </div>
                                     <Button 
                                         className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-emerald-500/15 whitespace-nowrap active:scale-98"
                                         onClick={() => verifyMutation.mutate(selectedHazard.id_hazard)}
                                         disabled={verifyMutation.isPending}
                                     >
                                         {verifyMutation.isPending ? 'Memproses...' : 'Validasi Laporan'}
                                     </Button>
                                 </div>
                             )}

                            {/* HSE/Admin Risk Override Section */}
                            {(user?.role === 'HSE' || user?.role === 'Admin') && (
                                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-3">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">HSE AI Override (Koreksi Risiko)</p>
                                        {selectedHazard.is_overridden && (
                                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded text-[9px] font-black uppercase">Overridden</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Prediksi Asli AI: <span className="font-bold text-slate-700 dark:text-slate-300">{selectedHazard.original_risiko || selectedHazard.risiko}</span>
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-slate-600 dark:text-slate-400 font-bold">Ubah Risiko ke:</label>
                                        <select
                                            value={selectedHazard.risiko}
                                            onChange={(e) => overrideMutation.mutate({ id: selectedHazard.id_hazard, risiko: e.target.value })}
                                            disabled={overrideMutation.isPending}
                                            className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-black text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Critical">Critical</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Deskripsi Bahaya</h3>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-350 whitespace-pre-line leading-relaxed">
                                    {selectedHazard.deskripsi}
                                </div>
                            </div>

                            {/* Image Attachment */}
                            {imageUrl && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Foto Bukti / Dokumentasi</h3>
                                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-72 flex items-center justify-center bg-slate-900">
                                        <img src={imageUrl} alt="Hazard Attachment" className="max-h-72 object-contain" />
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <Button className="w-full rounded-2xl py-4" onClick={() => setSelectedHazard(null)}>Tutup Detail</Button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default HazardPage;
