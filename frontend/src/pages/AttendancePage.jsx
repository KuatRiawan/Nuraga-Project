import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ShieldCheck, AlertTriangle, Heart, Camera, Clock, UserX, FileText, Check, Download, CheckCircle, XCircle, X } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import io from 'socket.io-client';

const API_URL = '/api';

const AttendancePage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [activeTab, setActiveTab] = useState('absensi'); // absensi, izin, laporan
  const [todayStatus, setTodayStatus] = useState({ clockedIn: false, clockedOut: false, fatigue_status: null });
  const [historyData, setHistoryData] = useState({ attendance: [], leaves: [] });

  // Clock In States
  const [sleepHours, setSleepHours] = useState(7);
  const [stressLevel, setStressLevel] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fotoBukti, setFotoBukti] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Leave Request States
  const [leaveForm, setLeaveForm] = useState({ type: 'Izin', start_date: '', end_date: '', reason: '' });
  const [leaveDoc, setLeaveDoc] = useState(null);

  // User & Date Filter state (Admin only — global attendance view)
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [userOptions, setUserOptions] = useState([]);

  // Extract unique users from historyData when no user list is available
  const uniqueUsers = Array.from(
    new Map(
      historyData.attendance
        .map(item => item.User)
        .filter(Boolean)
        .map(u => [u.id_user, u])
    ).values()
  );

  const userList = userOptions.length > 0 ? userOptions : uniqueUsers;

  const filteredAttendance = historyData.attendance.filter(log => {
    const matchesUser = !isAdmin || selectedUserId === 'all' || log.id_user === Number(selectedUserId);
    
    const logDate = new Date(log.createdAt).toISOString().slice(0, 10);
    
    let matchesStart = true;
    if (startDateFilter) {
      matchesStart = logDate >= startDateFilter;
    }
    
    let matchesEnd = true;
    if (endDateFilter) {
      matchesEnd = logDate <= endDateFilter;
    }
    
    return matchesUser && matchesStart && matchesEnd;
  });

  // Popup notification
  const [popup, setPopup] = useState(null); // { type: 'success'|'error', message: string }
  const showPopup = (type, message) => {
    setPopup({ type, message });
  };

  // Live Camera states & refs
  const videoRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err) {
      showPopup('error', 'Gagal mengakses kamera depan: ' + err.message);
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
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    
    // Mirror image for natural selfie preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setFotoBukti(file);
      setPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
      showPopup('success', 'Foto selfie berhasil diambil!');
    }, 'image/jpeg', 0.95);
  };

  // Clean up camera on component unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // ━━━ WebSocket listener untuk notifikasi approval & submit izin ━━━
  useEffect(() => {
    const socket = io();

    // Handle approval/rejection notifications untuk user
    const handleLeaveUpdate = (data) => {
      const userId = user?.id_user || user?.id;
      if (data.id_user === userId || user?.role === 'Admin') {
        const popupType = data.status === 'Approved' ? 'success' : 'error';
        const message = data.status === 'Approved' 
          ? `✅ ${data.userName}: Pengajuan ${data.type} disetujui!`
          : `❌ ${data.userName}: Pengajuan ${data.type} ditolak.`;
        showPopup(popupType, message);

        // Refresh history
        if (isAdmin) {
          setTimeout(() => fetchAllHistory(), 1000);
        } else {
          setTimeout(() => fetchMyHistory(), 1000);
        }
      }
    };

    // Handle new leave request submission untuk admin
    const handleNewLeaveRequest = (data) => {
      if (user?.role === 'Admin') {
        showPopup('success', `Pengajuan ${data.type} baru dari ${data.userName}\n${data.start_date} s/d ${data.end_date}`);
        
        // Refresh history untuk admin
        setTimeout(() => fetchAllHistory(), 1000);
      }
    };

    socket.on('LEAVE_REQUEST_UPDATE', handleLeaveUpdate);
    socket.on('NEW_LEAVE_REQUEST', handleNewLeaveRequest);

    return () => {
      socket.off('LEAVE_REQUEST_UPDATE', handleLeaveUpdate);
      socket.off('NEW_LEAVE_REQUEST', handleNewLeaveRequest);
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    fetchTodayStatus();
    if (isAdmin) {
        fetchAllHistory();
    } else {
        fetchMyHistory();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const refreshHistory = async () => {
      if (isAdmin) {
        await fetchAllHistory();
      } else {
        await fetchMyHistory();
      }
    };

    if (activeTab === 'laporan') {
      refreshHistory();

      const interval = setInterval(() => {
        refreshHistory();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user, activeTab]);

  const fetchTodayStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/attendance/today`, { headers: { Authorization: `Bearer ${token}` } });
      setTodayStatus(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMyHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/attendance/my-history`, { headers: { Authorization: `Bearer ${token}` } });
      setHistoryData(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAllHistory = async () => {
    if (!isAdmin) {
      return fetchMyHistory();
    }
    try {
      const token = localStorage.getItem('token');
      const [historyRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/attendance/all`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setHistoryData(historyRes.data);
      setUserOptions(usersRes.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFotoBukti(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleClockIn = async (e) => {
    e.preventDefault();
    if (!fotoBukti) {
        showPopup('error', 'Wajib melampirkan foto selfie kehadiran!');
        return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('sleep_hours', sleepHours);
      formData.append('stress_level', stressLevel);
      formData.append('foto_bukti', fotoBukti);

      await axios.post(`${API_URL}/attendance/clock-in`, formData, {
        headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
        }
      });
      showPopup('success', 'Absen Datang (Clock-In) berhasil! Selamat bekerja 🎉');
      fetchTodayStatus();
      if (isAdmin) fetchAllHistory(); else fetchMyHistory();
      setFotoBukti(null);
      setPreviewUrl(null);
    } catch (error) {
      showPopup('error', error.response?.data?.message || 'Gagal Clock-In. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/attendance/clock-out`, {}, { headers: { Authorization: `Bearer ${token}` } });
      showPopup('success', 'Absen Pulang (Clock-Out) berhasil! Selamat istirahat 👋');
      fetchTodayStatus();
      if (isAdmin) fetchAllHistory(); else fetchMyHistory();
    } catch (error) {
      showPopup('error', error.response?.data?.message || 'Gagal Clock-Out. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        Object.keys(leaveForm).forEach(key => formData.append(key, leaveForm[key]));
        if (leaveDoc) formData.append('document_proof', leaveDoc);
  
        await axios.post(`${API_URL}/attendance/leave`, formData, {
          headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
          }
        });
        showPopup('success', 'Pengajuan berhasil dikirim! Menunggu persetujuan.');
        setLeaveForm({ type: 'Izin', start_date: '', end_date: '', reason: '' });
        setLeaveDoc(null);
        if (isAdmin) fetchAllHistory(); else fetchMyHistory();
      } catch (error) {
        showPopup('error', 'Gagal mengirim pengajuan. Coba lagi.');
      } finally {
        setIsSubmitting(false);
      }
  };

  const handleApproveLeave = async (id, status) => {
      if (!isAdmin) return;
      try {
        const token = localStorage.getItem('token');
        await axios.put(`${API_URL}/attendance/leave/${id}`, { status }, { headers: { Authorization: `Bearer ${token}` } });
        showPopup('success', `Pengajuan berhasil di-${status}`);
        fetchAllHistory();
      } catch (error) {
          showPopup('error', 'Gagal merubah status pengajuan.');
      }
  };

  const getStatusColor = (status) => {
    if (status === 'Tinggi') return 'bg-red-100 text-red-800 border-red-200';
    if (status === 'Sedang') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (status === 'Rendah') return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const downloadCSV = () => {
      let targetName;
      if (selectedUserId === 'all' || !selectedUserId) {
          targetName = 'Semua_Pekerja';
      } else {
          const targetUser = userList.find(u => u.id_user === Number(selectedUserId));
          targetName = targetUser ? targetUser.nama : 'Pekerja';
      }

      if (startDateFilter || endDateFilter) {
          const startStr = startDateFilter ? startDateFilter : 'Awal';
          const endStr = endDateFilter ? endDateFilter : 'Akhir';
          targetName += `_periode_${startStr}_sd_${endStr}`;
      }

      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Tipe,Nama Pekerja,Waktu,Tidur (Jam),Stres,Fatigue Status,Rekomendasi\n";
      
      filteredAttendance.forEach(row => {
          const type = row.type;
          const nama = row.User?.nama || userList.find(u => u.id_user === row.id_user)?.nama || user.nama;
          const waktu = new Date(row.createdAt).toLocaleString('id-ID');
          const tidur = row.sleep_hours || '-';
          const stres = row.stress_level || '-';
          const status = row.fatigue_status || '-';
          const rekomendasi = `"${row.recommendation || '-'}"`;
          csvContent += `${type},${nama},${waktu},${tidur},${stres},${status},${rekomendasi}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `laporan_absensi_${targetName.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">

      {/* === POPUP NOTIFIKASI === */}
      {popup && (
        <div
          onClick={() => setPopup(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border-t-8 ${
              popup.type === 'success' ? 'border-emerald-500' : 'border-red-500'
            }`}
          >
            <div className="p-8 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                popup.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
              }`}>
                {popup.type === 'success'
                  ? <CheckCircle className="w-8 h-8" />
                  : <XCircle className="w-8 h-8" />}
              </div>
              <h3 className={`text-lg font-black uppercase tracking-tight mb-2 ${
                popup.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
              }`}>
                {popup.type === 'success' ? 'Berhasil!' : 'Gagal!'}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 font-medium text-sm leading-relaxed">{popup.message}</p>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 p-4">
              <button
                onClick={() => setPopup(null)}
                className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.98] ${
                  popup.type === 'success'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
            <Clock className="w-10 h-10 text-blue-300" />
            Sistem Absensi & Fatigue
          </h1>
          <p className="text-blue-200 font-medium text-lg">
            Catat kehadiran Anda, cek kelaikan kerja harian (Fatigue AI), atau ajukan izin.
          </p>
        </div>
        <div className="flex bg-white/10 p-1 rounded-xl">
            <button onClick={() => setActiveTab('absensi')} className={`px-4 py-2 font-bold rounded-lg transition-all ${activeTab === 'absensi' ? 'bg-white text-blue-900' : 'hover:bg-white/20'}`}>Kehadiran</button>
            <button onClick={() => setActiveTab('izin')} className={`px-4 py-2 font-bold rounded-lg transition-all ${activeTab === 'izin' ? 'bg-white text-blue-900' : 'hover:bg-white/20'}`}>Izin / Cuti</button>
            <button onClick={() => setActiveTab('laporan')} className={`px-4 py-2 font-bold rounded-lg transition-all ${activeTab === 'laporan' ? 'bg-white text-blue-900' : 'hover:bg-white/20'}`}>Riwayat</button>
        </div>
      </div>

      {activeTab === 'absensi' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Clock In Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm p-8 relative overflow-hidden transition-colors duration-300">
          {todayStatus.clockedIn ? (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                      <Check className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white">Anda Sudah Absen Masuk</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 mb-6">Status Fatigue Anda: <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(todayStatus.fatigue_status)}`}>{todayStatus.fatigue_status}</span></p>
                  
                  {!todayStatus.clockedOut ? (
                    <button 
                        onClick={handleClockOut}
                        disabled={isSubmitting}
                        className="w-full bg-slate-800 dark:bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-900 dark:hover:bg-slate-700 transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                    >
                        <Clock className="w-5 h-5" /> Pulang Kerja (Clock-Out)
                    </button>
                  ) : (
                    <div className="w-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold py-4 rounded-xl flex justify-center items-center gap-2 cursor-not-allowed">
                        Selesai untuk Hari Ini
                    </div>
                  )}
              </div>
          ) : null}

          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" /> Absen Masuk (Clock-In)
          </h2>
          <form onSubmit={handleClockIn} className="space-y-6">
            
            {/* Selfie Section */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Foto Selfie Kehadiran</label>
              
              {isCameraActive ? (
                <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-black border-4 border-blue-500 shadow-xl flex flex-col items-center justify-center aspect-[4/3] group animate-in zoom-in-95">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform -scale-x-100" />
                    {/* Circle overlay/mask to guide user face */}
                    <div className="absolute inset-0 border-[35px] border-black/45 rounded-xl flex items-center justify-center pointer-events-none">
                        <div className="w-44 h-56 border-2 border-dashed border-white/70 rounded-full" />
                    </div>
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
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-center bg-slate-50 dark:bg-slate-800/40 relative group cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors">
                      <input type="file" accept="image/*" capture="user" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      {previewUrl ? (
                          <img src={previewUrl} alt="Preview" className="mx-auto h-32 w-32 object-cover rounded-xl shadow-md" />
                      ) : (
                          <div className="py-4">
                            <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                            <span className="text-sm font-medium text-slate-500">Ketuk untuk Ambil Foto / Buka Kamera</span>
                          </div>
                      )}
                  </div>
                  <div className="mt-3">
                      <button
                          type="button"
                          onClick={startCamera}
                          className="w-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      >
                          <Camera size={14} /> Buka Kamera Langsung (Selfie)
                      </button>
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Durasi Tidur Semalam ({sleepHours} Jam)
              </label>
              <input
                type="range" min="1" max="12" step="0.5" value={sleepHours}
                onChange={(e) => setSleepHours(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Tingkat Stres Saat Ini ({stressLevel}/10)
              </label>
              <input
                type="range" min="1" max="10" step="0.5" value={stressLevel}
                onChange={(e) => setStressLevel(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Menganalisis...' : <><Clock className="w-5 h-5"/> Absen & Analisis Fatigue</>}
            </button>
          </form>
        </div>

        {/* Info Card */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col justify-center transition-colors">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Mengapa AI Fatigue Tracker?</h3>
            <div className="space-y-4">
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0"><ShieldCheck className="w-5 h-5"/></div>
                    <p className="text-sm text-slate-650 dark:text-slate-400"><strong>Keselamatan Pertama:</strong> Kelelahan (Fatigue) adalah penyebab utama kecelakaan kerja. AI kami membantu mendeteksi risiko sebelum terjadi.</p>
                </div>
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0"><Clock className="w-5 h-5"/></div>
                    <p className="text-sm text-slate-650 dark:text-slate-400"><strong>Integrasi Absensi:</strong> Tidak perlu repot mengisi banyak form. Cukup satu kali _Clock-In_ dengan _selfie_, sistem langsung mencatat kehadiran Anda.</p>
                </div>
            </div>
            {todayStatus.fatigue_status === 'Tinggi' && (
                <div className="mt-8 p-4 bg-red-100 border border-red-200 text-red-800 rounded-2xl flex gap-3">
                    <AlertTriangle className="w-6 h-6 shrink-0" />
                    <div>
                        <p className="font-bold">Peringatan Kelaikan Kerja</p>
                        <p className="text-sm mt-1">Sistem menyarankan Anda tidak mengambil tugas berisiko tinggi hari ini.</p>
                    </div>
                </div>
            )}
        </div>
      </div>
      )}

      {activeTab === 'izin' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm p-8 max-w-2xl mx-auto transition-colors">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center gap-2">
                <UserX className="w-5 h-5 text-orange-500" /> Form Pengajuan Izin / Cuti
            </h2>
            <form onSubmit={handleLeaveSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Jenis Pengajuan</label>
                    <select value={leaveForm.type} onChange={e => setLeaveForm({...leaveForm, type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-slate-900 dark:text-white">
                        <option value="Izin">Izin (Keperluan Pribadi)</option>
                        <option value="Sakit">Sakit (Butuh Surat Dokter)</option>
                        <option value="Cuti">Cuti Tahunan</option>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Mulai Tanggal</label>
                        <input type="date" required value={leaveForm.start_date} onChange={e => setLeaveForm({...leaveForm, start_date: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none text-slate-900 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Sampai Tanggal</label>
                        <input type="date" required value={leaveForm.end_date} onChange={e => setLeaveForm({...leaveForm, end_date: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none text-slate-900 dark:text-white" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Keterangan / Alasan</label>
                    <textarea required value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none min-h-[100px] text-slate-900 dark:text-white"></textarea>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Dokumen Pendukung (Surat Dokter, dll) - Opsional</label>
                    <input type="file" onChange={e => setLeaveDoc(e.target.files[0])} className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-slate-800 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-slate-700"/>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-all">
                    Kirim Pengajuan
                </button>
            </form>
        </div>
      )}

      {activeTab === 'laporan' && (
      <div className="space-y-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm p-8 transition-colors">
            <div className="flex flex-col gap-4 mb-6 border-b border-slate-150 dark:border-slate-800 pb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500"/> Riwayat Absensi & Fatigue
                    </h2>
                    {isAdmin && (
                        <button
                            onClick={downloadCSV}
                            className="px-5 py-2.5 rounded-xl font-black text-sm bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/10 w-full sm:w-auto justify-center"
                        >
                            <Download className="w-4 h-4"/> Export CSV
                        </button>
                    )}
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-${isAdmin ? '3' : '2'} gap-4`}>
                    {isAdmin && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Pekerja</label>
                            <select
                                value={selectedUserId}
                                onChange={e => setSelectedUserId(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">Semua Pekerja</option>
                                {userList.map(u => (
                                    <option key={u.id_user} value={u.id_user}>{u.nama} ({u.role})</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Dari Tanggal</label>
                        <input
                            type="date"
                            value={startDateFilter}
                            onChange={e => setStartDateFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Sampai Tanggal</label>
                        <input
                            type="date"
                            value={endDateFilter}
                            onChange={e => setEndDateFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>
            
            {filteredAttendance.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-sm border-b border-slate-200 dark:border-slate-800">
                    <th className="py-4 px-4 font-semibold">Waktu</th>
                    {isAdmin && <th className="py-4 px-4 font-semibold">Pekerja</th>}
                    <th className="py-4 px-4 font-semibold">Tipe</th>
                    <th className="py-4 px-4 font-semibold">Metrik</th>
                    <th className="py-4 px-4 font-semibold">Status AI</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                    {filteredAttendance.map((log) => (
                    <tr key={log.id_attendance} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/40">
                        <td className="py-4 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {new Date(log.createdAt).toLocaleString('id-ID')}
                        </td>
                        {(isAdmin) && <td className="py-4 px-4 text-slate-700 dark:text-slate-300 font-bold">{log.User?.nama || userList.find(u => u.id_user === log.id_user)?.nama || 'Tidak tersedia'}</td>}
                        <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${log.type === 'Datang' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{log.type}</span>
                        </td>
                        <td className="py-4 px-4 text-slate-500 dark:text-slate-400">
                            {log.type === 'Datang' ? `Tidur: ${log.sleep_hours}j | Stres: ${log.stress_level}` : '-'}
                        </td>
                        <td className="py-4 px-4">
                        {log.type === 'Datang' && log.fatigue_status ? (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(log.fatigue_status)}`}>
                                {log.fatigue_status}
                            </span>
                        ) : '-'}
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            ) : <p className="text-slate-500 text-center py-8">Belum ada riwayat absensi.</p>}
        </div>
 
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm p-8 transition-colors">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><UserX className="w-5 h-5 text-orange-500"/> Riwayat Pengajuan Izin/Cuti</h2>
            {historyData.leaves.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-sm border-b border-slate-200 dark:border-slate-800">
                    {isAdmin && <th className="py-4 px-4 font-semibold">Pekerja</th>}
                    <th className="py-4 px-4 font-semibold">Tipe</th>
                    <th className="py-4 px-4 font-semibold">Tanggal</th>
                    <th className="py-4 px-4 font-semibold">Alasan</th>
                    <th className="py-4 px-4 font-semibold">Status</th>
                    {isAdmin && <th className="py-4 px-4 font-semibold text-right">Aksi</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                    {historyData.leaves.map((leave) => (
                    <tr key={leave.id_leave} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/40">
                        {isAdmin && <td className="py-4 px-4 text-slate-700 dark:text-slate-300 font-bold">{leave.User?.nama}</td>}
                        <td className="py-4 px-4 font-medium text-slate-700 dark:text-slate-300">{leave.type}</td>
                        <td className="py-4 px-4 text-slate-500 dark:text-slate-400">{leave.start_date} s/d {leave.end_date}</td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-350">{leave.reason}</td>
                        <td className="py-4 px-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                leave.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                leave.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>{leave.status}</span>
                        </td>
                        {isAdmin && (
                            <td className="py-4 px-4 text-right">
                                {leave.status === 'Pending' && (
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => handleApproveLeave(leave.id_leave, 'Approved')} className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-green-600">Setujui</button>
                                        <button onClick={() => handleApproveLeave(leave.id_leave, 'Rejected')} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-600">Tolak</button>
                                    </div>
                                )}
                            </td>
                        )}
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            ) : (
                <p className="text-slate-500 text-center py-8">Belum ada pengajuan izin/cuti.</p>
            )}
        </div>
      </div>
      )}

    </div>
  );
};

export default AttendancePage;
