const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Udostępnianie strony WWW z folderu public
app.use(express.static(path.join(__dirname, 'public')));

let tiktokConnection = null;

io.on('connection', (socket) => {
    socket.on('connectTikTok', (username) => {
        if (tiktokConnection) {
            try { tiktokConnection.disconnect(); } catch(e){}
        }

        tiktokConnection = new WebcastPushConnection(username);

        tiktokConnection.connect().then(() => {
            socket.emit('status', `Połączono z LIVE: @${username}`);
        }).catch(err => {
            socket.emit('status', `Błąd: ${err.message}`);
        });

        tiktokConnection.on('chat', data => {
            io.emit('chatMessage', { user: data.nickname || data.uniqueId, text: data.comment });
        });

        tiktokConnection.on('gift', data => {
            if (data.giftType === 1 && data.repeatEnd) {
                io.emit('giftEvent', { user: data.nickname || data.uniqueId, giftName: data.giftName, count: data.repeatCount });
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));
