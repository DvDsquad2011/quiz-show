const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// Stato globale: contiene tutte le stanze attive create dai conduttori
const stanze = {}; 

io.on('connection', (socket) => {

    // 1. IL CONDUTTORE CREA LA STANZA CON LA PASSWORD
    socket.on('createRoom', (password) => {
        if (!password) {
            socket.emit('erroreStanza', 'La password non può essere vuota.');
            return;
        }
        stanze[password] = {
            hostId: socket.id,
            locked: false,
            vincitore: null
        };
        socket.join(password);
        socket.emit('stanzaCreataOK', password);
    });

    // 2. IL GIOCATORE ENTRA NELLA STANZA SE LA PASSWORD È CORRETTA
    socket.on('joinRoom', ({ password, nome, team }) => {
        const stanza = stanze[password];
        if (!stanza) {
            socket.emit('erroreStanza', 'Password errata o stanza inesistente.');
            return;
        }
        socket.roomPassword = password;
        socket.playerName = nome;
        socket.playerTeam = team;
        socket.join(password);
    });

    // 3. UN GIOCATORE PREME IL PULSANTE
    socket.on('pressione_pulsante', (data) => {
        const password = data.password || socket.roomPassword;
        const stanza = stanze[password];
        
        if (stanza && !stanza.locked) {
            stanza.locked = true; // Blocca immediatamente la stanza per gli altri
            stanza.vincitore = { nome: data.nome, squadra: data.squadra };
            
            // Invia il vincitore solo a chi si trova in questa specifica stanza
            io.to(password).emit('risultato_buzzer', { vincitore: stanza.vincitore });
        }
    });

    // 4. IL CONDUTTORE RESETTA IL PULSANTE PER LA PROSSIMA DOMANDA
    socket.on('reset_conduttore', (password) => {
        const stanza = stanze[password];
        if (stanza && socket.id === stanza.hostId) {
            stanza.locked = false;
            stanza.vincitore = null;
            
            // Sblocca i pulsanti solo per i partecipanti di questa stanza
            io.to(password).emit('sistema_resettato');
        }
    });

    // 5. GESTIONE DELLA DISCONNESSIONE
    socket.on('disconnect', () => {
        const passwordStanzaHost = Object.keys(stanze).find(key => stanze[key].hostId === socket.id);
        if (passwordStanzaHost) {
            io.to(passwordStanzaHost).emit('erroreStanza', 'Il conduttore ha chiuso la sessione.');
            delete stanze[passwordStanzaHost];
        }
    });
});

// Avvia il server sulla porta corretta
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`QUIZ SHOW ATTIVO SULLA PORTA ${PORT}`);
});