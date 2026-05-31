import { useState } from 'react';
import {
    AlertTriangle, Shield, Wind, Clock, MapPin,
    User, HardHat, CheckCircle2, ChevronRight,
    ChevronLeft, Zap, Flame, Thermometer, Box, Layers, X, ShieldCheck
} from 'lucide-react';
import Button from './Button';
import Input from './Input';

const PERMIT_TYPES = [
    { id: 'Hot Work', name: 'Hot Work Permit', icon: <Flame className="text-orange-500" />, desc: 'Welding, grinding, cutting' },
    { id: 'Cold Work', name: 'Cold Work Permit', icon: <Thermometer className="text-blue-500" />, desc: 'Mechanical, painting, inspection' },
    { id: 'Confined Space', name: 'Confined Space Entry', icon: <Box className="text-amber-600" />, desc: 'Tanks, silos, sewers' },
    { id: 'Working at Height', name: 'Working at Height', icon: <Layers className="text-indigo-500" />, desc: 'Scaffolding, roof work' },
    { id: 'Electrical Work', name: 'Electrical Work', icon: <Zap className="text-yellow-500" />, desc: 'High voltage, LOTO' },
    { id: 'Excavation', name: 'Excavation Permit', icon: <Layers className="text-emerald-500" />, desc: 'Digging, foundations' },
];

const HAZARDS = [
    'Kebakaran', 'Ledakan', 'Radiasi', 'Asap Beracun',
    'Tersandung', 'Terjepit', 'Paparan Kimia',
    'Kekurangan Oksigen', 'Gas Berbahaya', 'Jatuh dari Ketinggian',
    'Material Jatuh', 'Sengatan Listrik', 'Tanah Longsor'
];

const PPE = [
    'Helm Keselamatan', 'Sepatu Safety', 'Kacamata Pelindung',
    'Sarung Tangan Las', 'Full Body Harness', 'Masker Respirator',
    'SCBA', 'Baju Tahan Api', 'Pelindung Telinga'
];

const PermitForm = ({ onSubmit, onCancel }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        jenis_permit: '',
        perusahaan: '',
        lokasi: '',
        waktu_mulai: '',
        waktu_selesai: '',
        deskripsi_pekerjaan: '',
        supervisor_name: '',
        daftar_pekerja: [''],
        bahaya: [],
        apd: [],
        sistem_isolasi: '',
        gas_test: { o2: 20.9, h2s: 0, co: 0, lel: 0 },
        kondisi_cuaca: 'Cerah',
        applicant_sig: false,
        foto_lokasi: null
    });

    const nextStep = () => setStep(s => Math.min(s + 1, 5));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleCheckboxChange = (field, value) => {
        const current = formData[field];
        if (current.includes(value)) {
            setFormData({ ...formData, [field]: current.filter(i => i !== value) });
        } else {
            setFormData({ ...formData, [field]: [...current, value] });
        }
    };

    const handleWorkerChange = (index, value) => {
        const newWorkers = [...formData.daftar_pekerja];
        newWorkers[index] = value;
        setFormData({ ...formData, daftar_pekerja: newWorkers });
    };

    const addWorker = () => setFormData({ ...formData, daftar_pekerja: [...formData.daftar_pekerja, ''] });

    const handleSubmit = (e) => {
        e.preventDefault();
        // Filter out empty worker entries before submitting
        const cleanedData = {
            ...formData,
            daftar_pekerja: formData.daftar_pekerja.filter(worker => worker.trim() !== ''),
            bahaya: formData.bahaya,
            apd: formData.apd
        };
        onSubmit(cleanedData);
    };

    const renderStepNumbers = () => (
        <div className="flex justify-between items-center mb-8 px-2 overflow-x-auto">
            {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="flex items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 shadow-sm flex-shrink-0 ${step === num
                        ? 'bg-blue-600 text-white ring-4 ring-blue-500/20'
                        : step > num ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}>
                        {step > num ? <CheckCircle2 size={20} /> : num}
                    </div>
                    {num < 5 && <div className={`flex-1 h-1 mx-2 rounded-full ${step > num ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-700'}`} />}
                </div>
            ))}
        </div>
    );

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Form Izin Kerja (PTW)</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">Lengkapi data keselamatan sebelum memulai pekerjaan.</p>
                </div>
                <button onClick={onCancel} type="button" className="text-slate-400 hover:text-red-500 transition-colors p-1">
                    <X size={24} />
                </button>
            </div>

            {renderStepNumbers()}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Step 1: Jenis Permit */}
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Pilih Jenis Izin Kerja</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {PERMIT_TYPES.map((type) => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, jenis_permit: type.id })}
                                        className={`flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left group ${formData.jenis_permit === type.id
                                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-600/10 ring-4 ring-blue-500/10'
                                            : 'border-slate-100 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-slate-600'
                                            }`}
                                    >
                                        <div className="p-2 bg-white dark:bg-slate-700 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                            {type.icon}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 dark:text-white text-sm">{type.name}</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{type.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: JSA Ringkas (Hazards & APD) */}
                {step === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">
                                <AlertTriangle size={18} className="text-amber-500" /> Potensi Bahaya (JSA)
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {HAZARDS.map(h => (
                                    <button
                                        key={h}
                                        type="button"
                                        onClick={() => handleCheckboxChange('bahaya', h)}
                                        className={`px-4 py-3 rounded-xl text-xs font-bold text-left transition-all border-2 ${formData.bahaya.includes(h)
                                            ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20'
                                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 text-slate-500'
                                            }`}
                                    >
                                        {h}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">
                                <Shield size={18} className="text-emerald-500" /> Alat Pelindung Diri (APD)
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {PPE.map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => handleCheckboxChange('apd', p)}
                                        className={`px-4 py-3 rounded-xl text-xs font-bold text-left transition-all border-2 ${formData.apd.includes(p)
                                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 text-slate-500'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Administrasi & Pekerjaan */}
                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="Nama Perusahaan/Vendor" value={formData.perusahaan} onChange={e => setFormData({ ...formData, perusahaan: e.target.value })} required />
                            <Input label="Lokasi Spesifik" value={formData.lokasi} onChange={e => setFormData({ ...formData, lokasi: e.target.value })} required icon={<MapPin size={18} />} />
                            <Input label="Waktu Mulai" type="datetime-local" value={formData.waktu_mulai} onChange={e => setFormData({ ...formData, waktu_mulai: e.target.value })} required icon={<Clock size={18} />} />
                            <Input label="Waktu Selesai" type="datetime-local" value={formData.waktu_selesai} onChange={e => setFormData({ ...formData, waktu_selesai: e.target.value })} required icon={<Clock size={18} />} />
                            <Input label="Nama Pengawas (Supervisor)" value={formData.supervisor_name} onChange={e => setFormData({ ...formData, supervisor_name: e.target.value })} required icon={<User size={18} />} />
                        </div>
                        <div className="space-y-4">
                            <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Deskripsi Pekerjaan</label>
                            <textarea
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all outline-none min-h-[100px]"
                                placeholder="Jelaskan aktivitas kerja..."
                                value={formData.deskripsi_pekerjaan}
                                onChange={e => setFormData({ ...formData, deskripsi_pekerjaan: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="block text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Daftar Pekerja</label>
                            <div className="space-y-3">
                                {formData.daftar_pekerja.map((worker, idx) => (
                                    <Input
                                        key={idx}
                                        placeholder={`Nama Personel ${idx + 1}`}
                                        value={worker}
                                        onChange={e => handleWorkerChange(idx, e.target.value)}
                                        required
                                    />
                                ))}
                            </div>
                            <Button type="button" variant="ghost" onClick={addWorker} className="w-full border-dashed border-2 py-3 rounded-2xl">
                                + Tambah Personel
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 4: Lingkungan & Foto Kesiapan */}
                {step === 4 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                        {formData.jenis_permit === 'Confined Space' && (
                            <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700/50 rounded-3xl space-y-6">
                                <div className="flex items-center gap-3 text-amber-800 dark:text-amber-400 font-black uppercase tracking-widest text-sm">
                                    <Wind size={20} /> Hasil Tes Atmosfer
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input type="number" label="Oksigen (O2 %)" value={formData.gas_test.o2} onChange={e => setFormData({ ...formData, gas_test: { ...formData.gas_test, o2: e.target.value } })} />
                                    <Input type="number" label="Mudah Meledak (LEL %)" value={formData.gas_test.lel} onChange={e => setFormData({ ...formData, gas_test: { ...formData.gas_test, lel: e.target.value } })} />
                                    <Input type="number" label="H2S (ppm)" value={formData.gas_test.h2s} onChange={e => setFormData({ ...formData, gas_test: { ...formData.gas_test, h2s: e.target.value } })} />
                                    <Input type="number" label="CO (ppm)" value={formData.gas_test.co} onChange={e => setFormData({ ...formData, gas_test: { ...formData.gas_test, co: e.target.value } })} />
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <label className="block text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Foto Kesiapan Lokasi</label>
                            <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-3xl cursor-pointer bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900/50 hover:bg-slate-100 transition-all">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <MapPin className="w-8 h-8 mb-4 text-slate-500 dark:text-slate-400" />
                                        <p className="mb-2 text-sm text-slate-500 dark:text-slate-400 font-bold">Klik untuk unggah foto</p>
                                        <p className="text-xs text-slate-400">PNG, JPG (MAX. 5MB)</p>
                                    </div>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*" 
                                        capture="environment"
                                        onChange={(e) => setFormData({ ...formData, foto_lokasi: e.target.files[0] })}
                                    />
                                </label>
                            </div>
                            {formData.foto_lokasi && (
                                <p className="text-xs text-emerald-600 font-bold">✓ Foto dipilih: {formData.foto_lokasi.name}</p>
                            )}
                        </div>

                        <div className="space-y-4">
                            <label className="block text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Kondisi Cuaca</label>
                            <div className="flex gap-3">
                                {['Cerah', 'Mendung', 'Hujan', 'Indoor'].map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, kondisi_cuaca: c })}
                                        className={`px-6 py-3 rounded-xl text-sm font-bold border-2 transition-all ${formData.kondisi_cuaca === c ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 text-slate-500'}`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 5: Otorisasi */}
                {step === 5 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                        <div className="p-8 bg-blue-600 rounded-3xl text-white space-y-6 shadow-xl shadow-blue-500/20">
                            <h3 className="text-xl font-black uppercase tracking-tighter">Deklarasi Kesiapan</h3>
                            <div className="space-y-4 text-blue-100 text-sm leading-relaxed">
                                <p>1. Saya telah melakukan pemeriksaan lapangan dan memastikan semua tindakan pencegahan telah diimplementasikan.</p>
                                <p>2. Seluruh anggota tim telah diberikan instruksi (Safety Briefing) mengenai bahaya dan prosedur kerja aman.</p>
                                <p>3. Alat pelindung diri telah tersedia dalam kondisi layak pakai.</p>
                            </div>
                            <label className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl cursor-pointer hover:bg-white/20 transition-colors">
                                <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${formData.applicant_sig ? 'bg-emerald-400 border-emerald-400' : 'border-white/40'}`}>
                                    {formData.applicant_sig && <CheckCircle2 size={24} className="text-white" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={formData.applicant_sig} onChange={e => setFormData({ ...formData, applicant_sig: e.target.checked })} />
                                <span className="font-bold text-sm">Saya sebagai Pemohon menyatakan SIAP bekerja aman. (E-Signature SHA-256 Validated)</span>
                            </label>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-3xl text-center">
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-4 uppercase tracking-widest text-center">Alur Persetujuan Bertingkat</p>
                            <div className="flex justify-between items-center max-w-lg mx-auto">
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mx-auto mb-2 text-blue-600"><User size={24} /></div>
                                    <p className="text-[10px] font-black uppercase text-slate-400">Pemohon</p>
                                </div>
                                <div className="h-px bg-slate-300 flex-1 mx-2" />
                                <div className="text-center opacity-40">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-600"><HardHat size={24} /></div>
                                    <p className="text-[10px] font-black uppercase text-slate-400">Supervisor</p>
                                </div>
                                <div className="h-px bg-slate-300 flex-1 mx-2" />
                                <div className="text-center opacity-40">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-600"><Shield size={24} /></div>
                                    <p className="text-[10px] font-black uppercase text-slate-400">HSE Officer</p>
                                </div>
                                <div className="h-px bg-slate-300 flex-1 mx-2" />
                                <div className="text-center opacity-40">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-600"><ShieldCheck size={24} /></div>
                                    <p className="text-[10px] font-black uppercase text-slate-400">Manager</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-4 pt-4">
                    {step > 1 && (
                        <Button type="button" variant="ghost" onClick={prevStep} className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-2">
                            <ChevronLeft size={20} /> Kembali
                        </Button>
                    )}
                    {step < 5 ? (
                        <div className="flex-1 flex flex-col gap-2">
                            {step === 1 && !formData.jenis_permit && (
                                <p className="text-center text-xs text-amber-600 font-bold">
                                    ⚠ Pilih jenis izin kerja untuk melanjutkan
                                </p>
                            )}
                            {step === 2 && (formData.bahaya.length === 0 || formData.apd.length === 0) && (
                                <p className="text-center text-xs text-amber-600 font-bold">
                                    ⚠ Pilih minimal 1 Potensi Bahaya dan 1 APD untuk melanjutkan
                                </p>
                            )}
                            <Button
                                type="button"
                                onClick={nextStep}
                                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2"
                                disabled={
                                    (step === 1 && !formData.jenis_permit) ||
                                    (step === 2 && (formData.bahaya.length === 0 || formData.apd.length === 0))
                                }
                            >
                                Lanjut <ChevronRight size={20} />
                            </Button>
                        </div>

                    ) : (
                        <Button
                            type="submit"
                            className="flex-1 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                            disabled={!formData.applicant_sig}
                        >
                            Tanda Tangani & Kirim Izin
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default PermitForm;
