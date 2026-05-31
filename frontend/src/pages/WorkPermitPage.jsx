import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import Button from '../components/Button';
import PermitForm from '../components/PermitForm';
import { useAuth } from '../store/AuthContext';
import {
    FileCheck, Plus, Clock, MapPin, User,
    ChevronRight, Flame, Zap, Box, Layers,
    Thermometer, ShieldCheck, AlertCircle, X,
    Check, Ban, ShieldAlert
} from 'lucide-react';

const WorkPermitPage = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [showForm, setShowForm] = useState(false);
    const [selectedPermit, setSelectedPermit] = useState(null);
    const [approvalLoading, setApprovalLoading] = useState(false);
    const [error, setError] = useState('');

    // States for Housekeeping Close Out
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [closeForm, setCloseForm] = useState({
        housekeeping_verified: false,
        equipment_cleared: false,
        close_applicant_sig: false,
        close_supervisor_sig: false
    });
    const [closeLoading, setCloseLoading] = useState(false);

    const { data: permits = [], isLoading } = useQuery({
        queryKey: ['permits'],
        queryFn: async () => {
            const res = await api.get('/permits');
            return res.data.data || res.data;
        }
    });

    const createMutation = useMutation({
        mutationFn: async (formData) => {
            await api.post('/permits', formData);
        },
        onSuccess: () => {
            setShowForm(false);
            queryClient.invalidateQueries(['permits']);
        },
        onError: (err) => {
            console.error(err);
            setError(err.response?.data?.message || 'Gagal mengirim pengajuan permit.');
        }
    });

    const approveMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            await api.patch(`/permits/${id}/approve`, { status });
        },
        onSuccess: () => {
            setSelectedPermit(null);
            queryClient.invalidateQueries(['permits']);
        },
        onError: (err) => {
            console.error(err);
            alert(err.response?.data?.message || 'Gagal mengubah status permit.');
        }
    });

    const handleFormSubmit = async (formData) => {
        setError('');
        createMutation.mutate(formData);
    };

    const handleApproveReject = async (id, status) => {
        approveMutation.mutate({ id, status });
    };

    const getPermitIcon = (type) => {
        switch (type) {
            case 'Hot Work': return <Flame size={24} className="text-orange-500" />;
            case 'Electrical Work': return <Zap size={24} className="text-yellow-500" />;
            case 'Confined Space': return <Box size={24} className="text-amber-600" />;
            case 'Working at Height': return <Layers size={24} className="text-indigo-500" />;
            case 'Cold Work': return <Thermometer size={24} className="text-blue-500" />;
            case 'Excavation': return <Layers size={24} className="text-emerald-500" />;
            default: return <FileCheck size={24} />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
            case 'Closed': return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800';
            case 'Expired': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-850';
            case 'Pending': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
            case 'Rejected': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
            default: return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Work Permits (e-PTW)</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Otorisasi & Pengawasan Pekerjaan Berbahaya.</p>
                </div>
                <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 w-full sm:w-auto justify-center rounded-2xl py-5 px-8 shadow-xl shadow-blue-500/20">
                    <Plus size={18} /> Ajukan Izin Baru
                </Button>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl animate-in slide-in-from-top-4 duration-300">
                    <div className="p-1.5 bg-red-500 rounded-xl text-white shrink-0">
                        <AlertCircle size={16} />
                    </div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-400">{error}</p>
                </div>
            )}

            {showForm && (
                <div 
                    onClick={() => setShowForm(false)}
                    className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                >
                    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl">
                        <PermitForm
                            onSubmit={handleFormSubmit}
                            onCancel={() => setShowForm(false)}
                        />
                    </div>
                </div>
            )}

            {permits.length === 0 ? (
                <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                    <AlertCircle size={48} className="mx-auto mb-4 text-slate-200 dark:text-slate-700" />
                    <p className="text-slate-400 font-medium">Belum ada riwayat izin kerja (PTW). Silakan ajukan izin baru.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {permits.map((permit) => (
                        <div
                            key={permit.id_permit}
                            onClick={() => setSelectedPermit(permit)}
                            className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center gap-6 group hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-2">
                                <ChevronRight className="text-slate-300 group-hover:text-blue-600 transition-all group-hover:translate-x-1" size={24} />
                            </div>

                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 group-hover:scale-105 transition-transform shadow-sm">
                                {getPermitIcon(permit.jenis_permit)}
                            </div>

                            <div className="flex-1 min-w-0 space-y-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate max-w-[200px]">
                                        {permit.jenis_permit}
                                    </h3>
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${getStatusColor(permit.status)}`}>
                                        {permit.status}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-2 text-sm">
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px]">
                                        <MapPin size={14} className="text-blue-500" /> {permit.lokasi}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px]">
                                        <User size={14} className="text-indigo-500" /> {permit.User?.nama} <span className="text-slate-300 dark:text-slate-700 mx-1">|</span> {permit.perusahaan}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[11px] font-bold">
                                        <Clock size={14} /> {new Date(permit.waktu_mulai).toLocaleDateString()} • {new Date(permit.waktu_mulai).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center gap-4 text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                    <span>{permit.daftar_pekerja?.length || 0} Personel</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                                    <span>{permit.bahaya?.length || 0} Bahaya</span>
                                </div>                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between gap-1 text-[9px] font-black uppercase tracking-wider">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span className="text-emerald-600 dark:text-emerald-500 font-bold">Staff</span>
                                    </div>
                                    <span className="text-slate-300 dark:text-slate-700">→</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${permit.supervisor_sig ? 'bg-emerald-500' : permit.status === 'Rejected' && permit.approval_step === 1 ? 'bg-red-500' : permit.approval_step === 1 && permit.status === 'Pending' ? 'bg-blue-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'
                                            }`} />
                                        <span className={
                                            permit.supervisor_sig
                                                ? 'text-emerald-600 dark:text-emerald-500 font-bold'
                                                : permit.status === 'Rejected' && permit.approval_step === 1
                                                    ? 'text-red-500 font-bold'
                                                    : permit.approval_step === 1 && permit.status === 'Pending'
                                                        ? 'text-blue-600 dark:text-blue-400 font-extrabold animate-pulse'
                                                        : 'text-slate-350 dark:text-slate-600 font-medium'
                                        }>SPV</span>
                                    </div>
                                    <span className="text-slate-300 dark:text-slate-700">→</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${permit.safety_officer_sig ? 'bg-emerald-500' : permit.status === 'Rejected' && permit.approval_step === 2 ? 'bg-red-500' : permit.approval_step === 2 && permit.status === 'Pending' ? 'bg-blue-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'
                                            }`} />
                                        <span className={
                                            permit.safety_officer_sig
                                                ? 'text-emerald-600 dark:text-emerald-500 font-bold'
                                                : permit.status === 'Rejected' && permit.approval_step === 2
                                                    ? 'text-red-500 font-bold'
                                                    : permit.approval_step === 2 && permit.status === 'Pending'
                                                        ? 'text-blue-600 dark:text-blue-400 font-extrabold animate-pulse'
                                                        : 'text-slate-350 dark:text-slate-600 font-medium'
                                        }>HSE</span>
                                    </div>
                                    <span className="text-slate-300 dark:text-slate-700">→</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${permit.approver_sig ? 'bg-emerald-500' : permit.status === 'Rejected' && permit.approval_step === 3 ? 'bg-red-500' : permit.approval_step === 3 && permit.status === 'Pending' ? 'bg-blue-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'
                                            }`} />
                                        <span className={
                                            permit.approver_sig
                                                ? 'text-emerald-600 dark:text-emerald-500 font-bold'
                                                : permit.status === 'Rejected' && permit.approval_step === 3
                                                    ? 'text-red-500 font-bold'
                                                    : permit.approval_step === 3 && permit.status === 'Pending'
                                                        ? 'text-blue-600 dark:text-blue-400 font-extrabold animate-pulse'
                                                        : 'text-slate-350 dark:text-slate-600 font-medium'
                                        }>Manager</span>
                                    </div>
                                </div>  </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Selected Permit Detail & Signing Modal */}
            {selectedPermit && (
                <div 
                    onClick={() => setSelectedPermit(null)}
                    className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-800 border-t-8 border-blue-600 w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] border px-2.5 py-1 rounded-full mb-2 ${getStatusColor(selectedPermit.status)}`}>
                                    {selectedPermit.status}
                                </span>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                    {getPermitIcon(selectedPermit.jenis_permit)}
                                    {selectedPermit.jenis_permit} Permit
                                </h2>
                            </div>
                            <button onClick={() => setSelectedPermit(null)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
                            {/* Visual Approval Flow Progress */}
                            <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-4">
                                <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest text-center">Proses Persetujuan Bertingkat</p>
                                <div className="flex justify-between items-start max-w-md mx-auto">
                                    {/* Staff */}
                                    <div className="text-center flex-1">
                                        <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-1.5 font-bold shadow-sm text-xs">
                                            ✓
                                        </div>
                                        <p className="text-[9px] font-black uppercase text-emerald-600 leading-tight">Staff</p>
                                        <p className="text-[8px] text-slate-450 dark:text-slate-500 font-bold uppercase mt-0.5">Signed</p>
                                        <p className="text-[7px] text-slate-400 dark:text-slate-550 mt-0.5 font-medium leading-none">
                                            {new Date(selectedPermit.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })} {new Date(selectedPermit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className={`h-0.5 flex-1 mx-1.5 rounded-full mt-4 ${selectedPermit.supervisor_sig
                                            ? 'bg-emerald-500'
                                            : selectedPermit.status === 'Rejected' && selectedPermit.approval_step === 1
                                                ? 'bg-red-500'
                                                : selectedPermit.approval_step === 1
                                                    ? 'bg-blue-500 animate-pulse'
                                                    : 'bg-slate-200 dark:bg-slate-800'
                                        }`} />

                                    {/* Supervisor */}
                                    <div className="text-center flex-1">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-1.5 font-bold shadow-sm text-xs transition-all ${selectedPermit.supervisor_sig
                                                ? 'bg-emerald-500 text-white'
                                                : selectedPermit.status === 'Rejected' && selectedPermit.approval_step === 1
                                                    ? 'bg-red-500 text-white'
                                                    : selectedPermit.approval_step === 1 && selectedPermit.status === 'Pending'
                                                        ? 'bg-blue-500 text-white ring-4 ring-blue-500/20 animate-pulse'
                                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                                            }`}>
                                            {selectedPermit.supervisor_sig ? '✓' : selectedPermit.status === 'Rejected' && selectedPermit.approval_step === 1 ? '✗' : '2'}
                                        </div>
                                        <p className={`text-[9px] font-black uppercase leading-tight ${selectedPermit.supervisor_sig
                                                ? 'text-emerald-600'
                                                : selectedPermit.status === 'Rejected' && selectedPermit.approval_step === 1
                                                    ? 'text-red-500 font-bold'
                                                    : selectedPermit.approval_step === 1 && selectedPermit.status === 'Pending'
                                                        ? 'text-blue-600 dark:text-blue-400 font-extrabold animate-pulse'
                                                        : 'text-slate-350 dark:text-slate-600'
                                            }`}>SPV</p>
                                        <p className="text-[8px] text-slate-450 dark:text-slate-500 font-bold uppercase mt-0.5 leading-none">
                                            {selectedPermit.supervisor_sig ? 'Approved' : selectedPermit.status === 'Rejected' && selectedPermit.approval_step === 1 ? 'Rejected' : selectedPermit.approval_step === 1 ? 'Pending' : 'Queue'}
                                        </p>
                                        {selectedPermit.supervisor_approved_at && (
                                            <p className="text-[7px] text-slate-400 dark:text-slate-550 mt-1 font-medium leading-none">
                                                {new Date(selectedPermit.supervisor_approved_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })} {new Date(selectedPermit.supervisor_approved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        )}
                                    </div>
                                    <div className={`h-0.5 flex-1 mx-1.5 rounded-full mt-4 ${selectedPermit.safety_officer_sig
                                            ? 'bg-emerald-500'
                                            : selectedPermit.status === 'Rejected' && selectedPermit.approval_step === 2
                                                ? 'bg-red-500'
                                                : selectedPermit.approval_step === 2
                                                    ? 'bg-blue-500 animate-pulse'
                                                    : 'bg-slate-200 dark:bg-slate-800'
                                        }`} />

                                    {/* HSE */}
                                    <div className="text-center flex-1">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-1.5 font-bold shadow-sm text-xs transition-all ${selectedPermit.safety_officer_sig
                                                ? 'bg-emerald-500 text-white'
                                                : selectedPermit.status === 'Rejected' && selectedPermit.approval_step === 2
                                                    ? 'bg-red-500 text-white'
                                                    : selectedPermit.approval_step === 2 && selectedPermit.status === 'Pending'
                                                        ? 'bg-blue-500 text-white ring-4 ring-blue-500/20 animate-pulse'
                                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                                            }`}>
                                            {selectedPermit.safety_officer_sig ? '✓' : selectedPermit.status === 'Rejected' && selectedPermit.approval_step === 2 ? '✗' : '3'}
                                        </div>
                                        <p className={`text-[9px] font-black uppercase leading-tight ${selectedPermit.safety_officer_sig
                                                ? 'text-emerald-600'
                                                : selectedPermit.status === 'Rejected' && selectedPermit.approval_step === 2
                                                    ? 'text-red-500 font-bold'
                                                    : selectedPermit.approval_step === 2 && selectedPermit.status === 'Pending'
                                                        ? 'text-blue-600 dark:text-blue-400 font-extrabold animate-pulse'
                                                        : 'text-slate-350 dark:text-slate-600'
                                            }`}>HSE</p>
                                        <p className="text-[8px] text-slate-450 dark:text-slate-500 font-bold uppercase mt-0.5 leading-none">
                                            {selectedPermit.safety_officer_sig ? 'Approved' : selectedPermit.status === 'Rejected' && selectedPermit.approval_step === 2 ? 'Rejected' : selectedPermit.approval_step === 2 ? 'Pending' : 'Queue'}
                                        </p>
                                        {selectedPermit.safety_officer_approved_at && (
                                            <p className="text-[7px] text-slate-400 dark:text-slate-550 mt-1 font-medium leading-none">
                                                {new Date(selectedPermit.safety_officer_approved_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })} {new Date(selectedPermit.safety_officer_approved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        )}
                                    </div>
                                    <div className={`h-0.5 flex-1 mx-1.5 rounded-full mt-4 ${selectedPermit.approver_sig
                                            ? 'bg-emerald-500'
                                            : selectedPermit.status === 'Rejected' && selectedPermit.approval_step === 3
                                                ? 'bg-red-500'
                                                : selectedPermit.approval_step === 3
                                                    ? 'bg-blue-500 animate-pulse'
                                                    : 'bg-slate-200 dark:bg-slate-800'
                                        }`} />

                                    {/* Manager */}
                                    <div className="text-center flex-1">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-1.5 font-bold shadow-sm text-xs transition-all ${selectedPermit.approver_sig
                                                ? 'bg-emerald-500 text-white'
                                                : selectedPermit.status === 'Rejected' && selectedPermit.approval_step === 3
                                                    ? 'bg-red-500 text-white'
                                                    : selectedPermit.approval_step === 3 && selectedPermit.status === 'Pending'
                                                        ? 'bg-blue-500 text-white ring-4 ring-blue-500/20 animate-pulse'
                                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                                            }`}>
                                            {selectedPermit.approver_sig ? '✓' : selectedPermit.status === 'Rejected' && selectedPermit.approval_step === 3 ? '✗' : '4'}
                                        </div>
                                        <p className={`text-[9px] font-black uppercase leading-tight ${selectedPermit.approver_sig
                                                ? 'text-emerald-600'
                                                : selectedPermit.status === 'Rejected' && selectedPermit.approval_step === 3
                                                    ? 'text-red-500 font-bold'
                                                    : selectedPermit.approval_step === 3 && selectedPermit.status === 'Pending'
                                                        ? 'text-blue-600 dark:text-blue-400 font-extrabold animate-pulse'
                                                        : 'text-slate-350 dark:text-slate-600'
                                            }`}>Manager</p>
                                        <p className="text-[8px] text-slate-450 dark:text-slate-500 font-bold uppercase mt-0.5 leading-none">
                                            {selectedPermit.approver_sig ? 'Approved' : selectedPermit.status === 'Rejected' && selectedPermit.approval_step === 3 ? 'Rejected' : selectedPermit.approval_step === 3 ? 'Pending' : 'Queue'}
                                        </p>
                                        {selectedPermit.manager_approved_at && (
                                            <p className="text-[7px] text-slate-400 dark:text-slate-550 mt-1 font-medium leading-none">
                                                {new Date(selectedPermit.manager_approved_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })} {new Date(selectedPermit.manager_approved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section 1: Info Administrasi */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div>
                                    <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Perusahaan / Vendor</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedPermit.perusahaan}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Lokasi Pekerjaan</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-100 mt-1 flex items-center gap-1">
                                        <MapPin size={14} className="text-red-500" /> {selectedPermit.lokasi}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Waktu Mulai</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-100 mt-1 flex items-center gap-1.5">
                                        <Clock size={14} className="text-blue-500" /> {new Date(selectedPermit.waktu_mulai).toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Waktu Selesai</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-100 mt-1 flex items-center gap-1.5">
                                        <Clock size={14} className="text-blue-500" /> {new Date(selectedPermit.waktu_selesai).toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-700/50 pt-3 mt-1">
                                    <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Deskripsi Pekerjaan</p>
                                    <p className="font-medium text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                                        {selectedPermit.deskripsi_pekerjaan || 'Tidak ada deskripsi pekerjaan.'}
                                    </p>
                                </div>
                            </div>

                            {/* Section 2: Personel Terlibat */}
                            <div>
                                <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2 text-xs flex items-center gap-1.5">
                                    <User size={14} /> Daftar Pekerja
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedPermit.daftar_pekerja && selectedPermit.daftar_pekerja.length > 0 ? (
                                        selectedPermit.daftar_pekerja.map((worker, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-350">
                                                👤 {worker}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-slate-400 italic">Tidak ada pekerja terdaftar</p>
                                    )}
                                </div>
                            </div>

                            {/* Section 3: JSA & APD */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2 text-xs flex items-center gap-1.5">
                                        <AlertCircle size={14} className="text-amber-500" /> Potensi Bahaya
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedPermit.bahaya && selectedPermit.bahaya.length > 0 ? (
                                            selectedPermit.bahaya.map((b, i) => (
                                                <span key={i} className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-400">
                                                    {b}
                                                </span>
                                            ))
                                        ) : (
                                            <p className="text-slate-400 italic">Tidak ada bahaya terdaftar</p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2 text-xs flex items-center gap-1.5">
                                        <FileCheck size={14} className="text-emerald-500" /> Alat Pelindung Diri (APD)
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedPermit.apd && selectedPermit.apd.length > 0 ? (
                                            selectedPermit.apd.map((a, i) => (
                                                <span key={i} className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                                    {a}
                                                </span>
                                            ))
                                        ) : (
                                            <p className="text-slate-400 italic">Tidak ada APD terdaftar</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Atmosfer & Isolasi */}
                            {(selectedPermit.gas_test || selectedPermit.sistem_isolasi) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    {selectedPermit.gas_test && (
                                        <div>
                                            <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1">Hasil Tes Atmosfer</p>
                                            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                                                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">O2: {selectedPermit.gas_test.o2}%</div>
                                                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">LEL: {selectedPermit.gas_test.lel}%</div>
                                                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">H2S: {selectedPermit.gas_test.h2s}ppm</div>
                                                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">CO: {selectedPermit.gas_test.co}ppm</div>
                                            </div>
                                        </div>
                                    )}
                                    {selectedPermit.sistem_isolasi && (
                                        <div>
                                            <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1">Sistem Isolasi (LOTO)</p>
                                            <p className="font-bold text-slate-850 dark:text-slate-250 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">{selectedPermit.sistem_isolasi}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Section 5: Signature / Approval Actions */}
                            <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                                {selectedPermit.status === 'Pending' ? (
                                    (() => {
                                        const step = selectedPermit.approval_step;
                                        const isAuthorized =
                                            (step === 1 && (user?.role === 'Supervisor' || user?.role === 'Admin')) ||
                                            (step === 2 && (user?.role === 'HSE' || user?.role === 'Admin')) ||
                                            (step === 3 && (user?.role === 'Manager' || user?.role === 'Admin'));

                                        const roleLabel = step === 1 ? 'Supervisor (SPV)' : step === 2 ? 'HSE Officer' : 'Manager';

                                        if (isAuthorized) {
                                            return (
                                                <div className="space-y-4">
                                                    <div className="flex gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-600 dark:text-blue-400">
                                                        <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                                                        <p className="text-xs font-bold leading-normal">
                                                            Anda memiliki wewenang untuk memproses/menandatangani pengajuan ini sebagai <strong>{roleLabel}</strong>.
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <Button
                                                            onClick={() => handleApproveReject(selectedPermit.id_permit, 'Rejected')}
                                                            variant="danger"
                                                            disabled={approveMutation.isPending}
                                                            className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-2"
                                                        >
                                                            <Ban size={18} /> Tolak Pengajuan
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleApproveReject(selectedPermit.id_permit, 'Approved')}
                                                            variant="primary"
                                                            disabled={approveMutation.isPending}
                                                            className="flex-1 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                                        >
                                                            <Check size={18} /> Setujui & Tanda Tangani
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div className="text-center text-xs text-slate-400 dark:text-slate-550 font-black uppercase tracking-widest py-2 bg-slate-50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                                    ⌛ Menunggu Persetujuan Tahap {step}: {roleLabel}
                                                </div>
                                            );
                                        }
                                    })()
                                ) : (
                                    <div className="flex flex-col items-center gap-4 text-center text-xs font-black uppercase tracking-widest py-2">
                                        {selectedPermit.status === 'Approved' ? (
                                            <>
                                                <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
                                                    ✓ Izin Kerja ini telah DISETUJUI sepenuhnya oleh Manager
                                                </span>
                                                <Button
                                                    onClick={() => {
                                                        setCloseForm({
                                                            housekeeping_verified: false,
                                                            equipment_cleared: false,
                                                            close_applicant_sig: false,
                                                            close_supervisor_sig: false
                                                        });
                                                        setShowCloseModal(true);
                                                    }}
                                                    className="w-full py-4 rounded-2xl bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/25 flex items-center justify-center gap-2 text-white text-xs font-black"
                                                >
                                                    <ShieldCheck size={16} /> Tutup Izin Kerja (Housekeeping Close Out)
                                                </Button>
                                            </>
                                        ) : selectedPermit.status === 'Closed' ? (
                                            <span className="text-slate-650 dark:text-slate-400 bg-slate-500/10 border border-slate-500/20 px-4 py-2 rounded-xl">
                                                ✓ Izin Kerja ini telah DITUTUP. Housekeeping Selesai & Area Aman.
                                            </span>
                                        ) : selectedPermit.status === 'Expired' ? (
                                            <span className="text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-xl">
                                                ⌛ Izin Kerja ini telah KEDALUWARSA (Batas Waktu Terlewati)
                                            </span>
                                        ) : (
                                            <span className="text-red-500 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">
                                                ✗ Izin Kerja ini DITOLAK
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Housekeeping Close Out Confirmation Modal */}
            {showCloseModal && selectedPermit && (
                <div 
                    onClick={() => setShowCloseModal(false)}
                    className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-800 border-t-8 border-green-600 w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                <ShieldCheck className="text-green-600" size={24} /> Penutupan Izin Kerja
                            </h2>
                            <button onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                setCloseLoading(true);
                                try {
                                    await api.patch(`/permits/${selectedPermit.id_permit}/close`, {
                                        housekeeping_verified: closeForm.housekeeping_verified,
                                        equipment_cleared: closeForm.equipment_cleared,
                                        close_applicant_sig: closeForm.close_applicant_sig,
                                        close_supervisor_sig: closeForm.close_supervisor_sig
                                    });
                                    setShowCloseModal(false);
                                    setSelectedPermit(null);
                                    queryClient.invalidateQueries(['permits']);
                                } catch (err) {
                                    console.error(err);
                                    alert(err.response?.data?.message || 'Gagal menutup permit.');
                                } finally {
                                    setCloseLoading(false);
                                }
                            }}
                            className="space-y-6"
                        >
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                                Harap pastikan area kerja telah dibersihkan dan aman sebelum menutup izin kerja untuk <strong>{selectedPermit.jenis_permit}</strong> di <strong>{selectedPermit.lokasi}</strong>.
                            </p>

                            <div className="space-y-4">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={closeForm.housekeeping_verified}
                                        onChange={(e) => setCloseForm(prev => ({ ...prev, housekeeping_verified: e.target.checked }))}
                                        className="mt-1 w-4 h-4 rounded text-green-600 border-slate-300 focus:ring-green-500"
                                        required
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-green-600 transition-colors">Housekeeping Selesai</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Sisa material, sampah, dan penghalang di area kerja telah dibersihkan.</p>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={closeForm.equipment_cleared}
                                        onChange={(e) => setCloseForm(prev => ({ ...prev, equipment_cleared: e.target.checked }))}
                                        className="mt-1 w-4 h-4 rounded text-green-600 border-slate-300 focus:ring-green-500"
                                        required
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-green-600 transition-colors">Peralatan Dirapikan</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Semua mesin, kabel isolasi, dan alat kerja telah dilepas dan dirapikan.</p>
                                    </div>
                                </label>

                                <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4 mt-2 space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanda Tangan Elektronik Penutupan</p>

                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={closeForm.close_applicant_sig}
                                            onChange={(e) => setCloseForm(prev => ({ ...prev, close_applicant_sig: e.target.checked }))}
                                            className="w-4 h-4 rounded text-green-600 border-slate-300 focus:ring-green-500"
                                            required
                                        />
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-355">Tanda Tangan Pemohon (Applicant Sign-off)</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={closeForm.close_supervisor_sig}
                                            onChange={(e) => setCloseForm(prev => ({ ...prev, close_supervisor_sig: e.target.checked }))}
                                            className="w-4 h-4 rounded text-green-600 border-slate-300 focus:ring-green-500"
                                            required
                                        />
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-355">Tanda Tangan Pengawas Lapangan (Supervisor Sign-off)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowCloseModal(false)} className="flex-1 rounded-2xl py-4">Batal</Button>
                                <Button type="submit" className="flex-1 rounded-2xl py-4 bg-green-600 hover:bg-green-700 shadow-xl shadow-green-500/20 text-white font-black" loading={closeLoading}>
                                    Tutup Permit
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkPermitPage;
