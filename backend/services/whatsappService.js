/**
 * whatsappService.js
 * Baileys-based WhatsApp service for Nuraga HSE System.
 * Handles: connection lifecycle, QR generation, session persistence, and message sending.
 */

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    proto,
    jidNormalizedUser
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const qrcode = require('qrcode');
const { WA_SESSION_DIR } = require('../utils/paths');

const SESSION_DIR = WA_SESSION_DIR;
fs.mkdirSync(SESSION_DIR, { recursive: true });

let sock = null;
let currentQR = null;          // PNG QR base64 untuk frontend
let connectionStatus = 'disconnected'; // 'disconnected' | 'qr_ready' | 'connected'
let reconnectTimeout = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 15;
let baseReconnectDelay = 3000; // 3 seconds

const sseSubscribers = new Set();

const broadcast = (data) => {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    sseSubscribers.forEach(res => {
        try { res.write(payload); } catch (_) { }
    });
};

const getReconnectDelay = () => {
    const delay = Math.min(baseReconnectDelay * Math.pow(1.5, reconnectAttempts), 60000); // maks 60 detik
    return delay;
};

const cleanupOldSocket = async () => {
    if (sock) {
        try {
            sock.ev.removeAllListeners('creds.update');
            sock.ev.removeAllListeners('connection.update');

            await sock.end();
            console.log('[WhatsApp] 🧹 Old socket cleaned up successfully');
        } catch (err) {
            console.error('[WhatsApp]  Error cleaning up old socket:', err.message);
        }
        sock = null;
    }
};

const connect = async () => {
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    await cleanupOldSocket();

    try {
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: true,
            browser: ['Nuraga HSE', 'Chrome', '1.0.0'],
            getMessage: async () => undefined,
            syncFullHistory: false,
            maxMsPreloadedChats: 1,
            shouldSyncHistoryMessage: () => false
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                try {
                    currentQR = await qrcode.toDataURL(qr);
                    connectionStatus = 'qr_ready';
                    reconnectAttempts = 0; // reset attempts on new QR
                    console.log('[WhatsApp] 📱 QR code ready — scan dengan ponsel Anda.');
                    broadcast({ type: 'qr', qr: currentQR, status: 'qr_ready' });
                } catch (err) {
                    console.error('[WhatsApp] ❌ Gagal generate QR:', err.message);
                }
            }

            if (connection === 'open') {
                currentQR = null;
                connectionStatus = 'connected';
                reconnectAttempts = 0; // reset on successful connection
                const jid = sock.user?.id ? jidNormalizedUser(sock.user.id) : 'unknown';
                console.log(`[WhatsApp]  Terhubung! Nomor: ${jid}`);
                broadcast({ type: 'status', status: 'connected', number: jid });
            }

            if (connection === 'close') {
                connectionStatus = 'disconnected';
                currentQR = null;
                broadcast({ type: 'status', status: 'disconnected' });

                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const loggedOut = statusCode === DisconnectReason.loggedOut;
                const connectionLost = statusCode === DisconnectReason.connectionLost;
                const connectionReplaced = statusCode === DisconnectReason.connectionReplaced;

                console.warn(`[WhatsApp]  Koneksi tertutup. Code=${statusCode} loggedOut=${loggedOut}`);

                if (loggedOut) {
                    if (fs.existsSync(SESSION_DIR)) {
                        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
                        console.log('[WhatsApp] 🔄 Session file cleared.');
                    }
                    reconnectAttempts = 0;
                }

                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    const delay = getReconnectDelay();
                    console.log(`[WhatsApp] 🔄 Reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts} dalam ${(delay / 1000).toFixed(1)}s...`);
                    reconnectTimeout = setTimeout(connect, delay);
                } else {
                    console.error('[WhatsApp] ❌ Max reconnect attempts reached. Manual restart needed.');
                    broadcast({ type: 'status', status: 'disconnected', error: 'Max reconnect attempts reached' });
                }
            }
        });

        sock.ev.on('error', (err) => {
            console.error('[WhatsApp] 💥 Socket error:', err.message);
            connectionStatus = 'disconnected';
            broadcast({ type: 'status', status: 'disconnected', error: err.message });
        });

    } catch (err) {
        console.error('[WhatsApp] 💥 Error during connect():', err.message);
        connectionStatus = 'disconnected';
        broadcast({ type: 'status', status: 'disconnected', error: err.message });

        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = getReconnectDelay();
            console.log(`[WhatsApp] 🔄 Reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts} dalam ${(delay / 1000).toFixed(1)}s...`);
            reconnectTimeout = setTimeout(connect, delay);
        }
    }
};

/**
 * sendMessage(phone, text)
 * @param {string} phone  - Indonesian phone number, e.g. "08123456789" or "628123456789"
 * @param {string} text   - Message body (supports WhatsApp markdown: *bold*, _italic_)
 * @param {number} maxRetries - Max retry attempts if send fails
 */
const sendMessage = async (phone, text, maxRetries = 3) => {
    if (!phone || !text) {
        console.error('[WhatsApp] ❌ Phone atau text kosong');
        return false;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (connectionStatus !== 'connected' || !sock) {
            console.warn(`[WhatsApp]  Attempt ${attempt}/${maxRetries}: Tidak terhubung. Status=${connectionStatus}`);

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
            continue;
        }

        try {
            let normalized = phone.replace(/\D/g, ''); // strip non-digits
            if (normalized.startsWith('0')) {
                normalized = '62' + normalized.slice(1); // 08xx menjadi 628xx
            }
            if (!normalized.startsWith('62')) {
                normalized = '62' + normalized; // tambahkan kode negara jika tidak ada
            }
            const jid = `${normalized}@s.whatsapp.net`;

            await sock.sendMessage(jid, { text });
            console.log(`[WhatsApp]  Pesan terkirim ke ${jid}`);
            return true;
        } catch (err) {
            console.error(`[WhatsApp] ❌ Attempt ${attempt}/${maxRetries} gagal ke ${phone}:`, err.message);

            if (err.message.includes('disconnected') || err.message.includes('closed')) {
                connectionStatus = 'disconnected';
                console.warn('[WhatsApp] Connection lost, triggering reconnect...');
                break;
            }

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    return false;
};

const logout = async () => {
    try {
        if (sock) {
            await sock.logout();
            console.log('[WhatsApp] 🔓 Logout successful');
        }
    } catch (err) {
        console.error('[WhatsApp] Error during logout:', err.message);
    }

    if (fs.existsSync(SESSION_DIR)) {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        console.log('[WhatsApp] 🗑️ Session folder cleared.');
    }

    sock = null;
    currentQR = null;
    connectionStatus = 'disconnected';
    reconnectAttempts = 0;
    broadcast({ type: 'status', status: 'disconnected' });
    console.log('[WhatsApp] Logged out. Reconnecting...');

    setTimeout(connect, 1000);
};

const manualReconnect = async () => {
    console.log('[WhatsApp] 🔄 Manual reconnect triggered');

    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    if (sock) {
        try {
            await sock.end();
        } catch (_) { }
        sock = null;
    }

    connectionStatus = 'disconnected';
    currentQR = null;
    reconnectAttempts = 0; // Reset percobaan saat sambung ulang manual

    setTimeout(connect, 1000);
};

const getStatus = () => connectionStatus;
const getCurrentQR = () => currentQR;
const addSseClient = (res) => sseSubscribers.add(res);
const removeSseClient = (res) => sseSubscribers.delete(res);
const getReconnectInfo = () => ({
    status: connectionStatus,
    reconnectAttempts,
    maxReconnectAttempts,
    isConnected: connectionStatus === 'connected'
});

module.exports = {
    connect,
    sendMessage,
    logout,
    manualReconnect,
    getStatus,
    getCurrentQR,
    getReconnectInfo,
    addSseClient,
    removeSseClient,
};
