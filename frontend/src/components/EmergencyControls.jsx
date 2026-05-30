import { useState, useRef, useEffect } from 'react';
import api from '../api/axios';
import { Zap, AlertTriangle, Users, Bell } from 'lucide-react';

const EmergencyControls = ({ compact = false, onTriggered }) => {
    const [loading, setLoading] = useState(false);
    const [holding, setHolding] = useState(null); // Type of emergency being held
    const [progress, setProgress] = useState(0);
    const [alertModal, setAlertModal] = useState({ show: false, type: '', respondersList: '', isError: false });
    const holdTimer = useRef(null);
    const progressTimer = useRef(null);

    const startHolding = (type) => {
        setHolding(type);
        setProgress(0);

        let startTime = Date.now();
        progressTimer.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / 3000) * 100, 100);
            setProgress(newProgress);
            if (newProgress >= 100) clearInterval(progressTimer.current);
        }, 30);

        holdTimer.current = setTimeout(() => {
            triggerEmergency(type);
            cancelHolding();
        }, 3000);
    };

    const cancelHolding = () => {
        setHolding(null);
        setProgress(0);
        if (holdTimer.current) clearTimeout(holdTimer.current);
        if (progressTimer.current) clearInterval(progressTimer.current);
    };

    const triggerEmergency = async (type) => {
        setLoading(true);
        try {
            const res = await api.post('/emergency', {
                jenis_kejadian: type,
                lokasi: 'Main Production Zone (Auto-detected)'
            });
            if (onTriggered) onTriggered();
            
            const respondersList = res.data.responders && res.data.responders.length > 0
                ? res.data.responders.map(r => `• ${r.nama} (${r.role})`).join('\n')
                : 'Tidak ada personil bersertifikat khusus yang terdeteksi. Sistem menyiarkan alarm ke seluruh tim.';
                
            setAlertModal({ show: true, type, respondersList, isError: false });
        } catch (err) {
            console.error(err);
            setAlertModal({ show: true, type: type || 'Error', respondersList: 'Emergency sync failed. Local alert activated.', isError: true });
        } finally {
            setLoading(false);
        }
    };

    const buttons = [
        { label: 'Medical Alert', type: 'Medical', color: 'bg-red-500', icon: <Bell size={compact ? 20 : 32} /> },
        { label: 'Fire Outbreak', type: 'Fire', color: 'bg-orange-600', icon: <Zap size={compact ? 20 : 32} /> },
        { label: 'Chemical Leak', type: 'Chemical', color: 'bg-yellow-500', icon: <AlertTriangle size={compact ? 20 : 32} /> },
        { label: 'Evacuation', type: 'Evacuation', color: 'bg-purple-600', icon: <Users size={compact ? 20 : 32} /> },
    ];

    return (
        <div className={`grid ${compact ? 'grid-cols-2 sm:grid-cols-4 gap-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'}`}>
            {buttons.map((btn) => (
                <button
                    key={btn.type}
                    disabled={loading}
                    onMouseDown={() => startHolding(btn.type)}
                    onMouseUp={cancelHolding}
                    onMouseLeave={cancelHolding}
                    onTouchStart={() => startHolding(btn.type)}
                    onTouchEnd={cancelHolding}
                    className={`relative overflow-hidden ${btn.color} ${compact ? 'p-4 rounded-2xl' : 'p-10 rounded-[2.5rem]'} flex flex-col items-center justify-center gap-4 text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 select-none`}
                >
                    {/* Progress Overlay */}
                    {holding === btn.type && (
                        <div
                            className="absolute bottom-0 left-0 h-full bg-white/20 transition-all duration-75 pointer-events-none"
                            style={{ width: `${progress}%` }}
                        />
                    )}

                    <div className={`${compact ? '' : 'p-4 bg-white/20 rounded-3xl'}`}>
                        {btn.icon}
                    </div>
                    {!compact && <span className="font-black text-xl tracking-tighter uppercase">{btn.label}</span>}
                    {compact && <span className="font-bold text-[10px] uppercase tracking-widest">{btn.type}</span>}

                    {holding === btn.type && (
                        <div className="absolute inset-x-0 bottom-2 text-[10px] font-black text-white/80 animate-pulse text-center">
                            HOLD FOR 3S...
                        </div>
                    )}
                </button>
            ))}

            {/* Custom Alert Modal */}
            {alertModal.show && (
                <div 
                    onClick={() => setAlertModal({ show: false, type: '', respondersList: '', isError: false })}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className={`bg-white dark:bg-slate-900 border-t-8 ${alertModal.isError ? 'border-orange-500' : 'border-red-600'} w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200`}
                    >
                        <div className="flex justify-center mb-6">
                            <div className={`w-20 h-20 rounded-full ${alertModal.isError ? 'bg-orange-500/20' : 'bg-red-600/20'} flex items-center justify-center border-2 ${alertModal.isError ? 'border-orange-500/30 text-orange-500' : 'border-red-600/30 text-red-600'}`}>
                                <AlertTriangle size={36} className={!alertModal.isError ? 'animate-ping' : ''} />
                            </div>
                        </div>
                        
                        <h3 className={`text-2xl font-black text-center tracking-tighter mb-2 ${alertModal.isError ? 'text-orange-500' : 'text-red-600'}`}>
                            {alertModal.isError ? 'Gagal Sinkronisasi' : `ALARM DISIARKAN: ${alertModal.type.toUpperCase()}`}
                        </h3>
                        
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl mb-6">
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                                Detail / Personil Dihubungi:
                            </p>
                            <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap font-medium">
                                {alertModal.respondersList}
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => setAlertModal({ show: false, type: '', respondersList: '', isError: false })}
                            className={`w-full py-4 rounded-2xl font-black text-white uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95 ${alertModal.isError ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'}`}
                        >
                            Saya Mengerti
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmergencyControls;
