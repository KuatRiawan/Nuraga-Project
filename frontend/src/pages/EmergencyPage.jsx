import { useState, useEffect } from 'react';
import api from '../api/axios';
import EmergencyControls from '../components/EmergencyControls';
import { Zap, AlertTriangle, Shield, MapPin, Clock, Users, Bell, Layers } from 'lucide-react';
import Button from '../components/Button';

const ZONE_COORDINATES = {
    'Main Production Zone': { x: 150, y: 105 },
    'Chemical Storage Room': { x: 450, y: 105 },
    'Warehouse': { x: 150, y: 295 },
    'Office': { x: 450, y: 295 },
};

const getZoneCoordinates = (locationName, index = 0) => {
    const name = (locationName || '').toLowerCase();
    let base = { x: 150, y: 105 }; // Default Production
    let matchedZone = 'Main Production Zone';
    
    if (name.includes('chemical') || name.includes('kimia')) {
        base = { x: 450, y: 105 };
        matchedZone = 'Chemical Storage Room';
    } else if (name.includes('warehouse') || name.includes('gudang') || name.includes('loading') || name.includes('cargo')) {
        base = { x: 150, y: 295 };
        matchedZone = 'Warehouse';
    } else if (name.includes('office') || name.includes('kantor') || name.includes('administrasi') || name.includes('control')) {
        base = { x: 450, y: 295 };
        matchedZone = 'Office';
    }
    
    // Distribute overlapping pins in a small offset circle
    const angle = (index * 60) * (Math.PI / 180);
    const radius = index === 0 ? 0 : 25 + (index * 5);
    return {
        x: base.x + Math.cos(angle) * radius,
        y: base.y + Math.sin(angle) * radius,
        zone: matchedZone
    };
};

const EmergencyPage = () => {
    const [emergencies, setEmergencies] = useState([]);
    const [hazards, setHazards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeView, setActiveView] = useState('list'); // 'list' or 'map'
    const [hoveredPin, setHoveredPin] = useState(null);

    useEffect(() => {
        fetchEmergencies();
        fetchHazards();

        // Auto poll every 10 seconds to keep live map/log updated
        const timer = setInterval(() => {
            fetchEmergencies();
            fetchHazards();
        }, 10000);

        return () => clearInterval(timer);
    }, []);

    const fetchEmergencies = async () => {
        try {
            const res = await api.get('/emergency');
            setEmergencies(res.data);
        } catch (err) {
            console.error('[Emergency] Error fetching emergencies:', err);
        }
    };

    const fetchHazards = async () => {
        try {
            const res = await api.get('/hazards');
            setHazards(res.data);
        } catch (err) {
            console.error('[Emergency] Error fetching hazards:', err);
        }
    };

    // Filter active emergencies and unverified hazards for display on the GIS Map
    const activeEmergencies = emergencies.filter(e => e.status === 'Triggered' || e.status === 'Active');
    const unverifiedHazards = hazards.filter(h => !h.is_verified);

    // Build pin arrays
    const pins = [];
    const zoneCounts = {};

    activeEmergencies.forEach((e) => {
        const zoneName = getZoneCoordinates(e.lokasi).zone;
        zoneCounts[zoneName] = (zoneCounts[zoneName] || 0) + 1;
        const coords = getZoneCoordinates(e.lokasi, zoneCounts[zoneName] - 1);
        pins.push({
            id: `emergency-${e.id_emergency}`,
            type: 'emergency',
            title: `${e.jenis_kejadian} Emergency`,
            lokasi: e.lokasi,
            details: `Pelapor: ${e.reporter_name || 'Tidak Diketahui'}`,
            time: new Date(e.waktu_kejadian).toLocaleString('id-ID'),
            color: 'red',
            ...coords
        });
    });

    unverifiedHazards.forEach((h) => {
        const zoneName = getZoneCoordinates(h.lokasi).zone;
        zoneCounts[zoneName] = (zoneCounts[zoneName] || 0) + 1;
        const coords = getZoneCoordinates(h.lokasi, zoneCounts[zoneName] - 1);
        pins.push({
            id: `hazard-${h.id_hazard}`,
            type: 'hazard',
            title: `Laporan Bahaya #${h.id_hazard}`,
            lokasi: h.lokasi,
            details: `${h.deskripsi} (${h.risiko})`,
            time: new Date(h.createdAt).toLocaleString('id-ID'),
            color: 'orange',
            ...coords
        });
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center max-w-2xl mx-auto space-y-3">
                <h1 className="text-3xl font-black text-slate-905 dark:text-white uppercase tracking-tighter flex items-center justify-center gap-3">
                    <Zap size={32} className="text-amber-500 fill-amber-550 animate-pulse" />
                    Emergency Response System
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Picuan alarm darurat real-time, pantau koordinasi responders, dan petakan mitigasi bahaya.</p>
            </div>

            {/* Emergency trigger controls */}
            <EmergencyControls onTriggered={() => { fetchEmergencies(); fetchHazards(); }} />

            {/* View Selector Tab */}
            <div className="flex justify-center">
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                    <button
                        onClick={() => setActiveView('list')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            activeView === 'list'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-md'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Shield size={14} /> Daftar Log
                    </button>
                    <button
                        onClick={() => setActiveView('map')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            activeView === 'map'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-md'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <MapPin size={14} /> Peta GIS Pabrik
                    </button>
                </div>
            </div>

            {activeView === 'list' ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm transition-colors duration-300">
                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <h2 className="font-black text-xl flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tighter">
                            <Shield size={24} className="text-blue-600 dark:text-blue-500" /> Log Darurat Aktif
                        </h2>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-[0.2em]">Live Monitoring</span>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {emergencies.map((e) => (
                            <div key={e.id_emergency} className="p-8 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center gap-5">
                                    <div className={`p-4 rounded-2xl ${e.status === 'Triggered' ? 'bg-red-500/10 text-red-600' : 'bg-blue-500/10 text-blue-600'}`}>
                                        <Zap size={24} className={e.status === 'Triggered' ? 'animate-pulse' : ''} />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">{e.jenis_kejadian} Emergency</h3>
                                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            <span className="flex items-center gap-1.5 font-medium"><MapPin size={14} className="text-slate-400" /> {e.lokasi}</span>
                                            <span className="flex items-center gap-1.5 font-medium"><Clock size={14} className="text-slate-400" /> {new Date(e.waktu_kejadian).toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${e.status === 'Triggered' ? 'bg-red-650 text-white shadow-lg shadow-red-500/20' : 'bg-blue-650 text-white'}`}>
                                        {e.status}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Responder: <span className="text-slate-700 dark:text-slate-350">{e.responder?.nama || 'Awaiting Dispatch'}</span></span>
                                </div>
                            </div>
                        ))}
                        {emergencies.length === 0 && (
                            <div className="p-24 text-center">
                                <Shield size={64} className="mx-auto mb-4 text-slate-100 dark:text-slate-800" />
                                <p className="text-slate-400 dark:text-slate-500 font-medium italic">Status: Aman terkendali. Tidak ada panggilan darurat aktif.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* GIS PETA PABRIK INTERAKTIF */
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-sm relative transition-colors duration-300">
                    <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
                        <div>
                            <h2 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                <Layers size={20} className="text-blue-500" /> Pemetaan GIS & Emergency Real-time
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Arahkan kursor atau klik pin di peta untuk melihat rincian laporan darurat (merah) atau bahaya (oranye).</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping inline-block" />
                                <span>Darurat SOS ({activeEmergencies.length})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                                <span>Bahaya Baru ({unverifiedHazards.length})</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative w-full max-w-4xl mx-auto border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden bg-slate-950">
                        {/* High-tech Interactive SVG Floor Plan */}
                        <svg viewBox="0 0 600 400" className="w-full h-auto bg-slate-950">
                            <defs>
                                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                </pattern>
                                <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                                </linearGradient>
                                <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#78350f" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
                                </linearGradient>
                                <linearGradient id="indigoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#312e81" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
                                </linearGradient>
                                <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#064e3b" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                                </linearGradient>
                            </defs>

                            <rect width="600" height="400" fill="url(#grid)" />

                            {/* Zone 1: Main Production Zone */}
                            <g>
                                <rect x="30" y="30" width="240" height="150" rx="15" fill="url(#blueGrad)" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" className="transition-all duration-300 hover:fill-blue-500/10" />
                                <text x="150" y="60" textAnchor="middle" fill="#93c5fd" className="text-xs font-black uppercase tracking-wider select-none pointer-events-none">Main Production Zone</text>
                                <path d="M 40 100 H 260" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                            </g>

                            {/* Zone 2: Chemical Storage Room */}
                            <g>
                                <rect x="330" y="30" width="240" height="150" rx="15" fill="url(#amberGrad)" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,5" className="transition-all duration-300 hover:fill-amber-500/10" />
                                <text x="450" y="60" textAnchor="middle" fill="#fde047" className="text-xs font-black uppercase tracking-wider select-none pointer-events-none">Chemical Storage Room</text>
                                <path d="M 340 100 H 560" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                            </g>

                            {/* Zone 3: Warehouse & Cargo */}
                            <g>
                                <rect x="30" y="220" width="240" height="150" rx="15" fill="url(#indigoGrad)" stroke="#6366f1" strokeWidth="2" strokeDasharray="5,5" className="transition-all duration-300 hover:fill-indigo-500/10" />
                                <text x="150" y="250" textAnchor="middle" fill="#c7d2fe" className="text-xs font-black uppercase tracking-wider select-none pointer-events-none">Warehouse & Cargo</text>
                                <path d="M 40 290 H 260" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                            </g>

                            {/* Zone 4: Office & Control Room */}
                            <g>
                                <rect x="330" y="220" width="240" height="150" rx="15" fill="url(#emeraldGrad)" stroke="#10b981" strokeWidth="2" strokeDasharray="5,5" className="transition-all duration-300 hover:fill-emerald-500/10" />
                                <text x="450" y="250" textAnchor="middle" fill="#a7f3d0" className="text-xs font-black uppercase tracking-wider select-none pointer-events-none">Office & Control Room</text>
                                <path d="M 340 290 H 560" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                            </g>

                            {/* Central Path */}
                            <rect x="285" y="30" width="30" height="340" fill="rgba(255,255,255,0.02)" />
                            <line x1="300" y1="30" x2="300" y2="370" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="10,10" />

                            {/* Render GIS Pins */}
                            {pins.map((pin) => (
                                <g key={pin.id}>
                                    {pin.type === 'emergency' ? (
                                        <>
                                            {/* Outer pulsing ring */}
                                            <circle cx={pin.x} cy={pin.y} r="16" fill="rgba(239, 68, 68, 0.4)" className="animate-ping" />
                                            {/* Solid red pin */}
                                            <circle cx={pin.x} cy={pin.y} r="8" fill="#ef4444" className="stroke-white stroke-2" />
                                            <circle cx={pin.x} cy={pin.y} r="3" fill="#ffffff" />
                                        </>
                                    ) : (
                                        <>
                                            {/* Warning amber pin */}
                                            <circle cx={pin.x} cy={pin.y} r="10" fill="#f59e0b" className="stroke-white stroke-2" />
                                            <path d={`M ${pin.x} ${pin.y - 4} L ${pin.x - 4} ${pin.y + 3} H ${pin.x + 4} Z`} fill="#ffffff" />
                                        </>
                                    )}

                                    {/* 48px hit target area for mobile & ease of interaction */}
                                    <circle
                                        cx={pin.x}
                                        cy={pin.y}
                                        r="24"
                                        fill="transparent"
                                        className="cursor-pointer"
                                        onMouseEnter={() => setHoveredPin(pin)}
                                        onMouseLeave={() => setHoveredPin(null)}
                                        onClick={() => setHoveredPin(hoveredPin?.id === pin.id ? null : pin)}
                                    />
                                </g>
                            ))}
                        </svg>

                        {/* Interactive HUD Overlay for hovered/selected pin details */}
                        {hoveredPin && (
                            <div 
                                className="absolute bg-slate-950/95 text-white p-4 rounded-2xl border border-slate-800 shadow-2xl z-20 max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-200"
                                style={{
                                    left: `${(hoveredPin.x / 600) * 100}%`,
                                    top: `${(hoveredPin.y / 400) * 100}%`,
                                    transform: 'translate(-50%, -115%)'
                                }}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`w-2.5 h-2.5 rounded-full ${hoveredPin.type === 'emergency' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                                    <h4 className="font-extrabold text-xs uppercase tracking-wide">{hoveredPin.title}</h4>
                                </div>
                                <p className="text-[11px] text-slate-350 font-medium leading-relaxed">{hoveredPin.details}</p>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900 text-[9px] text-slate-400 font-semibold uppercase">
                                    <span>📍 {hoveredPin.lokasi}</span>
                                    <span>{hoveredPin.time}</span>
                                </div>
                            </div>
                        )}
                        
                        {pins.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                                <div className="text-center p-6">
                                    <Shield size={48} className="text-emerald-500/30 mx-auto mb-2" />
                                    <h4 className="font-extrabold text-sm uppercase text-slate-400 tracking-wider">Semua Zona Aman</h4>
                                    <p className="text-[10px] text-slate-500 mt-1">Tidak ada panggilan darurat SOS atau temuan bahaya aktif saat ini.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmergencyPage;
