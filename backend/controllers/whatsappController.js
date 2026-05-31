/**
 * whatsappController.js
 * REST + SSE endpoints for WhatsApp management panel (Admin Settings page).
 */

const jwt = require('jsonwebtoken');
const wa = require('../services/whatsappService');

// GET /api/wa/status  — current connection status + QR if qr_ready
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

// GET /api/wa/stream  — SSE stream, pushes { type, status, qr } events
const stream = (req, res) => {
    // Strict token validation for SSE stream (token passed in query string)
    const token = req.query.token;
    if (!token) {
        res.writeHead(401, { 'Content-Type': 'text/plain' });
        res.end('Unauthorized: Missing token');
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Token is valid, proceed with stream
    } catch (err) {
        res.writeHead(401, { 'Content-Type': 'text/plain' });
        res.end('Unauthorized: Invalid token');
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send current state immediately on connect
    const current = {
        type: wa.getStatus() === 'qr_ready' ? 'qr' : 'status',
        status: wa.getStatus(),
        qr: wa.getCurrentQR() || undefined,
    };
    res.write(`data: ${JSON.stringify(current)}\n\n`);

    wa.addSseClient(res);

    // Heartbeat every 20s
    const heartbeat = setInterval(() => {
        try { res.write(': ping\n\n'); } catch (_) {}
    }, 20000);

    req.on('close', () => {
        clearInterval(heartbeat);
        wa.removeSseClient(res);
    });
};

// POST /api/wa/logout  — disconnect and reset session (new QR will appear)
const logout = async (req, res) => {
    await wa.logout();
    res.json({ message: 'WhatsApp session cleared. New QR will appear shortly.' });
};

// POST /api/wa/reconnect  — force manual reconnect (resets attempts counter)
const manualReconnect = async (req, res) => {
    console.log('[Controller] Manual reconnect requested');
    await wa.manualReconnect();
    res.json({ message: 'Manual reconnect triggered. Check QR status in stream.' });
};

// POST /api/wa/test  — send a test message (Admin only)
const testMessage = async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number required.' });

    const ok = await wa.sendMessage(
        phone,
        `✅ *[NURAGA SAFETY — Test Message]*\n\nKoneksi WhatsApp berjalan dengan baik!\nWaktu: ${new Date().toLocaleString('id-ID')}`
    );

    if (ok) {
        res.json({ message: `Test message sent to ${phone}` });
    } else {
        res.status(503).json({ message: 'WhatsApp not connected. Please scan QR first.' });
    }
};

module.exports = { getStatus, stream, logout, manualReconnect, testMessage };
