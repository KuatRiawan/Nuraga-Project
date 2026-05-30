import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import Button from '../components/Button';
import { Target, Clock, CheckCircle, User, AlertTriangle, ChevronRight, Link2, X } from 'lucide-react';

const getDaysLeft = (dateStr) => {
    const now = new Date();
    const deadline = new Date(dateStr);
    return Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
};

const DeadlineBadge = ({ deadline }) => {
    const days = getDaysLeft(deadline);
    if (days < 0) return (
        <span className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
            <AlertTriangle size={10} className="fill-red-500" /> OVERDUE ({Math.abs(days)} hari)
        </span>
    );
    if (days === 0) return (
        <span className="flex items-center gap-1 text-[10px] font-black text-orange-600 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-full animate-pulse">
            <Clock size={10} /> JATUH TEMPO HARI INI
        </span>
    );
    if (days <= 3) return (
        <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">
            <Clock size={10} /> {days} HARI LAGI
        </span>
    );
    return (
        <span className="text-[10px] font-bold text-slate-400">{days} hari tersisa</span>
    );
};

const STATUS_CONFIG = {
    'Open': { color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'Open' },
    'In Progress': { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: 'Dalam Proses' },
    'Closed': { color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: 'Selesai' },
};

const CorrectiveActionPage = () => {
    const queryClient = useQueryClient();
    const [selectedAction, setSelectedAction] = useState(null);
    const [filter, setFilter] = useState('All');

    const { data: actions = [] } = useQuery({
        queryKey: ['actions'],
        queryFn: async () => {
            const res = await api.get('/actions');
            return res.data;
        }
    });

    const statusMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            await api.patch(`/actions/${id}/status`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['actions']);
        },
        onError: (err) => {
            console.error(err);
        }
    });

    const handleUpdateStatus = async (id, status) => {
        statusMutation.mutate({ id, status });
    };

    const overdueCount = actions.filter(a => getDaysLeft(a.deadline) < 0 && a.status !== 'Closed').length;

    const filteredActions = actions.filter(action => {
        if (filter === 'All') return true;
        if (filter === 'Overdue') {
            return getDaysLeft(action.deadline) < 0 && action.status !== 'Closed';
        }
        if (filter === 'Critical') {
            return action.HazardReport?.risiko === 'Critical' || action.HazardReport?.risiko === 'High';
        }
        return action.status === filter;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Tindakan Perbaikan (CAPA)</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Kelola dan pantau tindakan korektif/preventif terhadap temuan bahaya.</p>
                </div>
                {overdueCount > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-2xl">
                        <AlertTriangle size={16} className="text-red-500" />
                        <span className="text-sm font-black text-red-600">{overdueCount} Terlambat!</span>
                    </div>
                )}
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2 pb-2">
                {[
                    { id: 'All', label: 'Semua Tiket' },
                    { id: 'Overdue', label: 'Hanya Terlambat' },
                    { id: 'Critical', label: 'Risiko Kritis' },
                    { id: 'Open', label: 'Open' },
                    { id: 'In Progress', label: 'Dalam Proses' },
                    { id: 'Closed', label: 'Selesai' }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${filter === f.id
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/10'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-5">
                {filteredActions.map((action) => {
                    const days = getDaysLeft(action.deadline);
                    const isOverdue = days < 0 && action.status !== 'Closed';
                    const statusCfg = STATUS_CONFIG[action.status] || STATUS_CONFIG['Open'];

                    return (
                        <div
                            key={action.id_action}
                            className={`bg-white dark:bg-slate-900 border-l-4 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row gap-6
                                ${isOverdue ? 'border-red-500' : action.status === 'Closed' ? 'border-emerald-500' : 'border-blue-500'}`}
                        >
                            <div className="flex-1 space-y-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 shrink-0">
                                            <Target size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 dark:text-white leading-tight line-clamp-2">{action.description}</p>
                                            {action.id_hazard && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-400 mt-1">
                                                    <Link2 size={10} /> HAZARD #{action.id_hazard}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 ${statusCfg.color}`}>
                                        {statusCfg.label}
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <User size={14} />
                                        <span>Penanggung Jawab: <strong className="text-slate-700 dark:text-slate-300">{action.assignee?.nama || 'HSE Manager'}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={14} />
                                        <span>Deadline: <strong className="text-slate-700 dark:text-slate-300">{new Date(action.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
                                    </div>
                                    <DeadlineBadge deadline={action.deadline} />
                                </div>
                            </div>

                            <div className="flex md:flex-col gap-2 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 md:w-40 justify-center shrink-0">
                                {action.status === 'Open' && (
                                    <Button
                                        variant="secondary"
                                        className="flex-1 md:w-full text-xs rounded-xl py-2"
                                        onClick={() => handleUpdateStatus(action.id_action, 'In Progress')}
                                    >
                                        Mulai
                                    </Button>
                                )}
                                {action.status !== 'Closed' && (
                                    <Button
                                        className="flex-1 md:w-full text-xs rounded-xl py-2 shadow-md shadow-blue-500/10"
                                        onClick={() => handleUpdateStatus(action.id_action, 'Closed')}
                                    >
                                        <CheckCircle size={14} className="mr-1" /> Selesai
                                    </Button>
                                )}
                                {action.status === 'Closed' && (
                                    <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-black">
                                        <CheckCircle size={14} /> Ditutup
                                    </div>
                                )}
                                <button
                                    onClick={() => setSelectedAction(action)}
                                    className="text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1 text-xs font-bold"
                                >
                                    Detail <ChevronRight size={12} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {filteredActions.length === 0 && (
                    <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                        <Target size={48} className="mx-auto mb-4 text-slate-200 dark:text-slate-700" />
                        <p className="text-slate-400 font-medium">Tidak ada tindakan perbaikan aktif untuk filter ini.</p>
                    </div>
                )}
            </div>

            {/* Corrective Action Detail Modal */}
            {selectedAction && (
                <div 
                    onClick={() => setSelectedAction(null)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-900 border-t-8 border-blue-600 w-full max-w-xl rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto space-y-6"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-wider">Detail CAPA</span>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mt-2">CAPA #{selectedAction.id_action}</h2>
                            </div>
                            <button onClick={() => setSelectedAction(null)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tindakan Perbaikan</h3>
                            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-bold leading-relaxed text-base">
                                {selectedAction.description}
                            </div>
                        </div>

                        {/* Action Details Grid */}
                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Penanggung Jawab</p>
                                <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">{selectedAction.assignee?.nama || 'HSE Manager'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</p>
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mt-1 ${STATUS_CONFIG[selectedAction.status]?.color || STATUS_CONFIG['Open'].color}`}>
                                    {STATUS_CONFIG[selectedAction.status]?.label || selectedAction.status}
                                </span>
                            </div>
                            <div className="col-span-2 border-t border-slate-100 dark:border-slate-800 pt-3 mt-1 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Batas Waktu (Deadline)</p>
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">
                                        {new Date(selectedAction.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                                <DeadlineBadge deadline={selectedAction.deadline} />
                            </div>
                        </div>

                        {/* Related Hazard Info */}
                        {selectedAction.HazardReport && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Link2 size={12} /> Temuan Bahaya Terkait
                                </h3>
                                <div className="p-5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-3">
                                    <div>
                                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Lokasi Bahaya</p>
                                        <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">{selectedAction.HazardReport.lokasi}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Deskripsi Bahaya</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed mt-0.5">{selectedAction.HazardReport.deskripsi}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-2">
                            <Button className="w-full rounded-2xl py-4" onClick={() => setSelectedAction(null)}>Tutup Detail</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CorrectiveActionPage;
