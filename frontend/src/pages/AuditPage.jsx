import { useState, useEffect } from 'react';
import api from '../api/axios';
import Button from '../components/Button';
import Input from '../components/Input';
import { ClipboardCheck, Calendar, QrCode, CheckSquare, AlertTriangle, Camera, X } from 'lucide-react';

const CHECKLIST_TEMPLATES = {
    'APAR': ['Tabung tidak berkarat', 'Segel dalam kondisi baik', 'Penunjuk tekanan pada posisi hijau', 'Label inspeksi terbaru', 'Akses tidak terhalang'],
    'Perancah': ['Kaki perancah terkunci', 'Papan lantai tidak patah', 'Pagar pengaman terpasang', 'Beban tidak melebihi kapasitas'],
    'Forklift': ['Rem berfungsi normal', 'Lampu peringatan hidup', 'Klakson berfungsi', 'Fork tidak bengkok', 'Sabuk pengaman ada'],
    'Panel Listrik': ['Tutup panel tertutup', 'Label bahaya terpasang', 'Grounding terhubung', 'Tidak ada kabel terkelupas'],
    'Custom': [],
};

const AuditPage = () => {
    const [audits, setAudits] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [qrValue, setQrValue] = useState('');
    const [showQrModal, setShowQrModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState('APAR');
    const [checklistState, setChecklistState] = useState({});
    const [formData, setFormData] = useState({ area: '', tanggal: '', hasil: '', qr_code_asset: '' });
    const [selectedAudit, setSelectedAudit] = useState(null);

    useEffect(() => {
        fetchAudits();
    }, []);

    useEffect(() => {
        // Reset checklist when template changes
        const items = CHECKLIST_TEMPLATES[selectedTemplate] || [];
        const initial = {};
        items.forEach(item => { initial[item] = false; });
        setChecklistState(initial);
    }, [selectedTemplate]);

    const fetchAudits = async () => {
        try {
            const res = await api.get('/audits');
            setAudits(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSimulateQR = () => {
        const mockIds = ['APAR-PROD-001', 'PERANCAH-B2-003', 'FORKLIFT-WH-07', 'PANEL-LT-002'];
        const scanned = mockIds[Math.floor(Math.random() * mockIds.length)];
        setQrValue(scanned);
        setFormData(prev => ({ ...prev, qr_code_asset: scanned }));
        setShowQrModal(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const checkedCount = Object.values(checklistState).filter(Boolean).length;
        const total = Object.values(checklistState).length;
        const completedChecklist = { template: selectedTemplate, items: checklistState, score: `${checkedCount}/${total}` };

        try {
            await api.post('/audits', {
                ...formData,
                checklist_items: JSON.stringify(completedChecklist),
            });
            setShowForm(false);
            setFormData({ area: '', tanggal: '', hasil: '', qr_code_asset: '' });
            setQrValue('');
            fetchAudits();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Inspeksi & Audit</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pemindaian aset berbasis QR Code dan pengecekan checklist keselamatan.</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <Button
                        variant="secondary"
                        onClick={() => setShowQrModal(true)}
                        className="flex items-center gap-2 rounded-2xl py-5 px-6 flex-1 sm:flex-initial justify-center"
                    >
                        <QrCode size={18} /> Pindai QR Code
                    </Button>
                    <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-2xl py-5 px-6 flex-1 sm:flex-initial justify-center shadow-xl shadow-blue-500/20">
                        <Calendar size={18} /> Buat Audit
                    </Button>
                </div>
            </div>

            {/* QR Scanner Modal */}
            {showQrModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
                        <div className="w-16 h-16 bg-blue-600/10 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <QrCode size={36} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Pindai QR Code Aset</h3>
                        <p className="text-slate-500 text-sm mb-6">Fitur ini membutuhkan akses kamera perangkat mobile. Gunakan simulasi di bawah untuk demo.</p>
                        <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl mb-6 flex flex-col items-center gap-3">
                            <Camera size={32} className="text-slate-300" />
                            <span className="text-xs text-slate-400 font-bold">Area Kamera (Mobile Only)</span>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="ghost" className="flex-1 rounded-2xl" onClick={() => setShowQrModal(false)}>Batal</Button>
                            <Button className="flex-1 rounded-2xl" onClick={handleSimulateQR}>Simulasi Pindai</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scanned Asset Banner */}
            {qrValue && (
                <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl animate-in slide-in-from-top-4 duration-300">
                    <CheckSquare size={20} className="text-emerald-500" />
                    <div>
                        <p className="font-black text-emerald-700 dark:text-emerald-400 text-sm">Aset Teridentifikasi: <span className="font-mono">{qrValue}</span></p>
                        <p className="text-xs text-slate-500">ID Aset berhasil dipindai. Lanjutkan pengisian form audit.</p>
                    </div>
                </div>
            )}

            {/* Audit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 border-t-8 border-blue-600 w-full max-w-xl rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-6">Form Audit Keselamatan</h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <Input
                                label="Nama Area / Lokasi"
                                placeholder="Contoh: Lantai Produksi A"
                                value={formData.area}
                                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                required
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Tanggal Audit"
                                    type="date"
                                    value={formData.tanggal}
                                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                                    required
                                />
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">ID Aset (QR Code)</label>
                                    <div className="relative">
                                        <input
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                            placeholder="Auto dari QR scan"
                                            value={formData.qr_code_asset || qrValue}
                                            onChange={(e) => setFormData({ ...formData, qr_code_asset: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Checklist Template */}
                            <div className="flex flex-col gap-3">
                                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Template Inspeksi</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.keys(CHECKLIST_TEMPLATES).map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setSelectedTemplate(t)}
                                            className={`px-5 py-3 rounded-xl text-sm font-black border transition-all min-h-[48px] flex items-center justify-center ${selectedTemplate === t ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-400'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>

                                {CHECKLIST_TEMPLATES[selectedTemplate]?.length > 0 && (
                                    <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                                        {CHECKLIST_TEMPLATES[selectedTemplate].map(item => (
                                            <label key={item} className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer select-none min-h-[48px] active:scale-[0.99]">
                                                <input
                                                    type="checkbox"
                                                    checked={checklistState[item] || false}
                                                    onChange={(e) => setChecklistState(prev => ({ ...prev, [item]: e.target.checked }))}
                                                    className="w-6 h-6 rounded-lg accent-blue-600 cursor-pointer shrink-0"
                                                />
                                                <span className={`text-sm font-semibold transition-colors ${checklistState[item] ? 'text-emerald-600 dark:text-emerald-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {item}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Temuan & Catatan</label>
                                <textarea
                                    className="px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all h-24 text-sm"
                                    placeholder="Deskripsikan temuan, ketidaksesuaian, atau kondisi OK..."
                                    value={formData.hasil}
                                    onChange={(e) => setFormData({ ...formData, hasil: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex gap-4 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="flex-1 rounded-2xl py-3.5 min-h-[48px]">Batal</Button>
                                <Button type="submit" className="flex-1 rounded-2xl py-3.5 min-h-[48px] shadow-xl shadow-blue-500/20" loading={loading}>
                                    {loading ? 'Menyimpan...' : 'Simpan Audit'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Audit List Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-x-auto shadow-sm">
                <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            {['Area', 'Tanggal', 'ID Aset (QR)', 'Auditor', 'Status', 'Aksi'].map(h => (
                                <th key={h} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {audits.map((audit) => (
                            <tr key={audit.id_audit} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{audit.area}</td>
                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{new Date(audit.tanggal).toLocaleDateString('id-ID')}</td>
                                <td className="px-6 py-4">
                                    {audit.qr_code_asset ? (
                                        <span className="flex items-center gap-1.5 text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">
                                            <QrCode size={10} /> {audit.qr_code_asset}
                                        </span>
                                    ) : <span className="text-slate-300 text-xs">—</span>}
                                </td>
                                <td className="px-6 py-4 text-slate-500 text-sm">{audit.auditor?.nama || '—'}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase">Selesai</span>
                                </td>
                                 <td className="px-6 py-4">
                                    <button
                                        onClick={() => setSelectedAudit(audit)}
                                        className="text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline"
                                    >
                                        Lihat Detail
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {audits.length === 0 && (
                    <div className="p-16 text-center">
                        <ClipboardCheck size={48} className="mx-auto mb-4 text-slate-200 dark:text-slate-700" />
                        <p className="text-slate-400 font-medium">Belum ada audit yang direkam.</p>
                    </div>
                )}
            </div>

            {/* Audit Detail Modal */}
            {selectedAudit && (() => {
                let checklist = null;
                if (selectedAudit.checklist_items) {
                    try {
                        checklist = typeof selectedAudit.checklist_items === 'string'
                            ? JSON.parse(selectedAudit.checklist_items)
                            : selectedAudit.checklist_items;
                    } catch (e) {
                        console.error(e);
                    }
                }
                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 border-t-8 border-blue-600 w-full max-w-xl rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider">Hasil Audit</span>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mt-2">{selectedAudit.area}</h2>
                                </div>
                                <button onClick={() => setSelectedAudit(null)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tanggal Audit</p>
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">
                                        {new Date(selectedAudit.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Auditor</p>
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">{selectedAudit.auditor?.nama || '—'}</p>
                                </div>
                                {selectedAudit.qr_code_asset && (
                                    <div className="col-span-2 border-t border-slate-100 dark:border-slate-800 pt-3 mt-1">
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Aset Terkait (QR Code)</p>
                                        <p className="text-xs font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg inline-block mt-1">
                                            {selectedAudit.qr_code_asset}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Checklist Items */}
                            {checklist && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                            Checklist: {checklist.template}
                                        </h3>
                                        <span className="text-xs font-black text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                                            Skor: {checklist.score}
                                        </span>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 space-y-2.5">
                                        {Object.entries(checklist.items || {}).map(([item, checked]) => (
                                            <div key={item} className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'}`}>
                                                    ✓
                                                </div>
                                                <span className={`text-sm ${checked ? 'text-slate-700 dark:text-slate-300 font-bold' : 'text-slate-400 line-through'}`}>
                                                    {item}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Findings & Notes */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Temuan & Catatan</h3>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                                    {selectedAudit.hasil}
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button className="w-full rounded-2xl py-4" onClick={() => setSelectedAudit(null)}>Tutup Detail</Button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default AuditPage;
