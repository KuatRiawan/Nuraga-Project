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

const path = require('path');
const qrcode = require('qrcode');

// ── Session storage path ─────────────────────────────────────────────────────
const SESSION_DIR = path.join(__dirname, '../wa_session');

// ── Internal state ────────────────────────────────────────────────────────────
let sock = null;
let currentQR = null;          // base64 QR PNG for the frontend
let connectionStatus = 'disconnected'; // 'disconnected' | 'qr_ready' | 'connected'
let reconnectTimeout = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 15;
let baseReconnectDelay = 3000; // 3 seconds

// SSE subscribers (frontend polling for QR / status updates)
const sseSubscribers = new Set();

// ── Broadcast status to all SSE listeners ─────────────────────────────────────
const broadcast = (data) => {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    sseSubscribers.forEach(res => {
        try { res.write(payload); } catch (_) { }
    });
};

// ── Calculate exponential backoff delay ────────────────────────────────────────
const getReconnectDelay = () => {
    const delay = Math.min(baseReconnectDelay * Math.pow(1.5, reconnectAttempts), 60000); // max 60s
    return delay;
};

// ── Clean up old socket to prevent memory leak ─────────────────────────────────
const cleanupOldSocket = async () => {
    if (sock) {
        try {
            // Remove all event listeners
            sock.ev.removeAllListeners('creds.update');
            sock.ev.removeAllListeners('connection.update');
            
            // End the socket connection
            await sock.end();
            console.log('[WhatsApp] 🧹 Old socket cleaned up successfully');
        } catch (err) {
            console.error('[WhatsApp] ⚠️ Error cleaning up old socket:', err.message);
        }
        sock = null;
    }
};

// ── Connect / Reconnect ───────────────────────────────────────────────────────
const connect = async () => {
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    // Clean up old socket to prevent memory leak
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

        // ── Credentials updated ──────────────────────────────────────────────
        sock.ev.on('creds.update', saveCreds);

        // ── Socket errors ────────────────────────────────────────────────────
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // New QR code generated
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
                console.log(`[WhatsApp] ✅ Terhubung! Nomor: ${jid}`);
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

                console.warn(`[WhatsApp] ⚠️ Koneksi tertutup. Code=${statusCode} loggedOut=${loggedOut}`);

                if (loggedOut) {
                    // Session invalidated — clear saved credentials
                    const fs = require('fs');
                    if (fs.existsSync(SESSION_DIR)) {
                        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
                        console.log('[WhatsApp] 🔄 Session file cleared.');
                    }
                    reconnectAttempts = 0;
                }

                // Schedule reconnect dengan exponential backoff
                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    const delay = getReconnectDelay();
                    console.log(`[WhatsApp] 🔄 Reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts} dalam ${(delay/1000).toFixed(1)}s...`);
                    reconnectTimeout = setTimeout(connect, delay);
                } else {
                    console.error('[WhatsApp] ❌ Max reconnect attempts reached. Manual restart needed.');
                    broadcast({ type: 'status', status: 'disconnected', error: 'Max reconnect attempts reached' });
                }
            }
        });

    } catch (err) {
        console.error('[WhatsApp] 💥 Error during connect():', err.message);
        connectionStatus = 'disconnected';
        
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = getReconnectDelay();
            console.log(`[WhatsApp] 🔄 Reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts} dalam ${(delay/1000).toFixed(1)}s...`);
            reconnectTimeout = setTimeout(connect, delay);
        }
    }
};

// ── Send a WhatsApp message ───────────────────────────────────────────────────
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
            console.warn(`[WhatsApp] ⚠️ Attempt ${attempt}/${maxRetries}: Tidak terhubung. Status=${connectionStatus}`);
            
            // Wait before retry (exponential backoff)
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
            continue;
        }

        try {
            // Normalize phone number to WA JID format
            let normalized = phone.replace(/\D/g, ''); // strip non-digits
            if (normalized.startsWith('0')) {
                normalized = '62' + normalized.slice(1); // 08xx → 628xx
            }
            if (!normalized.startsWith('62')) {
                normalized = '62' + normalized; // add country code if missing
            }
            const jid = `${normalized}@s.whatsapp.net`;

            await sock.sendMessage(jid, { text });
            console.log(`[WhatsApp] ✅ Pesan terkirim ke ${jid}`);
            return true;
        } catch (err) {
            console.error(`[WhatsApp] ❌ Attempt ${attempt}/${maxRetries} gagal ke ${phone}:`, err.message);
            
            // Check if it's a connection error
            if (err.message.includes('disconnected') || err.message.includes('closed')) {
                connectionStatus = 'disconnected';
                console.warn('[WhatsApp] Connection lost, triggering reconnect...');
                // Don't retry if connection is lost, will retry on next message
                break;
            }
            
            // Wait before retry (exponential backoff)
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    return false;
};

// ── Logout & clear session ─────────────────────────────────────────────────────
const logout = async () => {
    try {
        if (sock) {
            await sock.logout();
            console.log('[WhatsApp] 🔓 Logout successful');
        }
    } catch (err) {
        console.error('[WhatsApp] Error during logout:', err.message);
    }
    
    const fs = require('fs');
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
    
    // Reconnect to show new QR
    setTimeout(connect, 1000);
};

// ── Manual reconnect (force reset) ─────────────────────────────────────────────
const manualReconnect = async () => {
    console.log('[WhatsApp] 🔄 Manual reconnect triggered');
    
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    
    if (sock) {
        try {
            await sock.end();
        } catch (_) {}
        sock = null;
    }
    
    connectionStatus = 'disconnected';
    currentQR = null;
    reconnectAttempts = 0; // Reset attempts on manual reconnect
    
    setTimeout(connect, 1000);
};

// ── Getters ────────────────────────────────────────────────────────────────────
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
