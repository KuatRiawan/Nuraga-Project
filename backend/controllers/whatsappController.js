/**
 * whatsappController.js
 * REST + SSE endpoints for WhatsApp management panel (Admin Settings page).
 */

const jwt = require('jsonwebtoken');
const wa = require('../services/whatsappService');

const getStatus = (req, res) => {
    const reconnectInfo = wa.getReconnectInfo();
    res.json({
        status: wa.getStatus(),
        qr: wa.getCurrentQR() || null,
        reconnectAttempts: reconnectInfo.reconnectAttempts,
        maxReconnectAttempts: reconnectInfo.maxReconnectAttempts,
        isConnected: reconnectInfo.isConnected
    });
};

const stream = (req, res) => {
    const token = req.query.token;
    if (!token) {
        res.writeHead(401, { 'Content-Type': 'text/plain' });
        res.end('Unauthorized: Missing token');
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        res.writeHead(401, { 'Content-Type': 'text/plain' });
        res.end('Unauthorized: Invalid token');
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const current = {
        type: wa.getStatus() === 'qr_ready' ? 'qr' : 'status',
        status: wa.getStatus(),
        qr: wa.getCurrentQR() || undefined,
    };
    res.write(`data: ${JSON.stringify(current)}\n\n`);

    wa.addSseClient(res);

    const heartbeat = setInterval(() => {
        try { res.write(': ping\n\n'); } catch (_) { }
    }, 20000);

    req.on('close', () => {
        clearInterval(heartbeat);
        wa.removeSseClient(res);
    });
};

const logout = async (req, res) => {
    await wa.logout();
    res.json({ message: 'WhatsApp session cleared. New QR will appear shortly.' });
};

const manualReconnect = async (req, res) => {
    console.log('[Controller] Manual reconnect requested');
    await wa.manualReconnect();
    res.json({ message: 'Manual reconnect triggered. Check QR status in stream.' });
};

const testMessage = async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number required.' });

    const ok = await wa.sendMessage(
        phone,
        ` *[NURAGA SAFETY — Test Message]*\n\nKoneksi WhatsApp berjalan dengan baik!\nWaktu: ${new Date().toLocaleString('id-ID')}`
    );

    if (ok) {
        res.json({ message: `Test message sent to ${phone}` });
    } else {
        res.status(503).json({ message: 'WhatsApp not connected. Please scan QR first.' });
    }
};

module.exports = { getStatus, stream, logout, manualReconnect, testMessage };
