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

// SSE subscribers (frontend polling for QR / status updates)
const sseSubscribers = new Set();

// ── Broadcast status to all SSE listeners ─────────────────────────────────────
const broadcast = (data) => {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    sseSubscribers.forEach(res => {
        try { res.write(payload); } catch (_) { }
    });
};

// ── Connect / Reconnect ───────────────────────────────────────────────────────
const connect = async () => {
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: true,   // also print in terminal for dev convenience
            browser: ['Nuraga HSE', 'Chrome', '1.0.0'],
            getMessage: async () => undefined  // minimal; we don't need message history
        });

        // ── Credentials updated ──────────────────────────────────────────────
        sock.ev.on('creds.update', saveCreds);

        // ── Connection state changes ─────────────────────────────────────────
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // New QR code generated
            if (qr) {
                try {
                    currentQR = await qrcode.toDataURL(qr);
                    connectionStatus = 'qr_ready';
                    console.log('[WhatsApp] New QR code generated — scan with your phone.');
                    broadcast({ type: 'qr', qr: currentQR, status: 'qr_ready' });
                } catch (err) {
                    console.error('[WhatsApp] Failed to generate QR image:', err.message);
                }
            }

            if (connection === 'open') {
                currentQR = null;
                connectionStatus = 'connected';
                const jid = sock.user?.id ? jidNormalizedUser(sock.user.id) : 'unknown';
                console.log(`[WhatsApp] ✅ Connected! Number: ${jid}`);
                broadcast({ type: 'status', status: 'connected', number: jid });
            }

            if (connection === 'close') {
                connectionStatus = 'disconnected';
                currentQR = null;
                broadcast({ type: 'status', status: 'disconnected' });

                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const loggedOut = statusCode === DisconnectReason.loggedOut;

                console.warn(`[WhatsApp] Connection closed. Code=${statusCode} loggedOut=${loggedOut}`);

                if (loggedOut) {
                    // Session invalidated — clear saved credentials
                    const fs = require('fs');
                    if (fs.existsSync(SESSION_DIR)) {
                        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
                        console.log('[WhatsApp] Session files cleared after logout.');
                    }
                }

                // Always attempt reconnect after a short delay (unless forcefully killed)
                reconnectTimeout = setTimeout(connect, 5000);
            }
        });

    } catch (err) {
        console.error('[WhatsApp] Error during connect():', err.message);
        connectionStatus = 'disconnected';
        reconnectTimeout = setTimeout(connect, 8000);
    }
};

// ── Send a WhatsApp message ───────────────────────────────────────────────────
/**
 * sendMessage(phone, text)
 * @param {string} phone  - Indonesian phone number, e.g. "08123456789" or "628123456789"
 * @param {string} text   - Message body (supports WhatsApp markdown: *bold*, _italic_)
 */
const sendMessage = async (phone, text) => {
    if (connectionStatus !== 'connected' || !sock) {
        console.warn('[WhatsApp] Cannot send — not connected.');
        return false;
    }

    try {
        // Normalize phone number to WA JID format
        let normalized = phone.replace(/\D/g, ''); // strip non-digits
        if (normalized.startsWith('0')) {
            normalized = '62' + normalized.slice(1); // 08xx → 628xx
        }
        const jid = `${normalized}@s.whatsapp.net`;

        await sock.sendMessage(jid, { text });
        console.log(`[WhatsApp] ✅ Message sent to ${jid}`);
        return true;
    } catch (err) {
        console.error(`[WhatsApp] ❌ Failed to send to ${phone}:`, err.message);
        return false;
    }
};

// ── Logout & clear session ─────────────────────────────────────────────────────
const logout = async () => {
    try {
        if (sock) await sock.logout();
    } catch (_) { }
    const fs = require('fs');
    if (fs.existsSync(SESSION_DIR)) {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
    }
    sock = null;
    currentQR = null;
    connectionStatus = 'disconnected';
    broadcast({ type: 'status', status: 'disconnected' });
    console.log('[WhatsApp] Logged out and session cleared.');
    // Reconnect to show new QR
    setTimeout(connect, 1000);
};

// ── Getters ────────────────────────────────────────────────────────────────────
const getStatus = () => connectionStatus;
const getCurrentQR = () => currentQR;
const addSseClient = (res) => sseSubscribers.add(res);
const removeSseClient = (res) => sseSubscribers.delete(res);

module.exports = {
    connect,
    sendMessage,
    logout,
    getStatus,
    getCurrentQR,
    addSseClient,
    removeSseClient,
};
