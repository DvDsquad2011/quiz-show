const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
    app.use(express.static('public'));

let isLocked = false;
let vincitoreBuzzer = null;

io.on('connection', (socket) => {
    socket.on('pressione_pulsante', (data) => {
        if (!isLocked) {
            isLocked = true; 
            vincitoreBuzzer = { nome: data.nome, squadra: data.squadra };
            io.emit('risultato_buzzer', { vincitore: vincitoreBuzzer });
        }
    });

    socket.on('reset_conduttore', () => {
        isLocked = false;
        vincitoreBuzzer = null;
        io.emit('sistema_resettato'); 
    });
});

http.listen(3000, () => {
    console.log('--- QUIZ SHOW ATTIVO! ---');
    console.log('Apri nel browser: http://localhost:3000');
});