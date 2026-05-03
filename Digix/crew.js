import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from 'baileys';
import configmanager from '../utils/configmanager.js';
import pino from 'pino';
import fs from 'fs';

const data = 'sessionData';

async function connectToWhatsapp(handleMessage) {
    const { version } = await fetchLatestBaileysVersion();
    console.log(version);

    const { state, saveCreds } = await useMultiFileAuthState(data);

    const sock = makeWASocket({
        version: version,
        auth: state,
        printQRInTerminal: false,
        syncFullHistory: true,
        markOnlineOnConnect: true,
        logger: pino({ level: 'silent' }),
        keepAliveIntervalMs: 10000,
        connectTimeoutMs: 60000,
        generateHighQualityLinkPreview: true,
    });

    // 🔥 CHANNEL CONFIG (PAW LA)
    const channelLink = "https://whatsapp.com/channel/0029VbCYwpk5vKA2VG7qos02";

    const newsletterContext = {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363407376498323@newsletter',
            newsletterName: 'WENS DEV',
            serverMessageId: -1
        },
        externalAdReply: {
            title: "📡 WENS DEV CHANNEL",
            body: "👉 Voir la chaîne",
            thumbnail: fs.readFileSync("./database/menu.jpg"),
            sourceUrl: channelLink,
            mediaType: 1,
            renderLargerThumbnail: true
        }
    };

    // 🔥 APPLY SOU TOUT MESSAGE
    const originalSendMessage = sock.sendMessage;

    sock.sendMessage = async function (jid, content = {}, options = {}) {

        content.contextInfo = {
            ...newsletterContext,
            ...(content.contextInfo || {})
        };

        return originalSendMessage.call(this, jid, content, options);
    };

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;

            console.log('❌ Disconnected');

            if (statusCode !== DisconnectReason.loggedOut) {
                setTimeout(() => connectToWhatsapp(handleMessage), 5000);
            }

        } else if (connection === 'connecting') {
            console.log('⏳ Connecting...');

        } else if (connection === 'open') {
            console.log('✅ Connected!');

            try {
                const chatId = '50940127120@s.whatsapp.net';
                const imagePath = './database/DigixCo.jpg';

                await sock.sendMessage(chatId, {
                    image: { url: imagePath },
                    caption: "🚀 *WENS_XMD CONNECTED*"
                });

            } catch (err) {
                console.log('❌ Welcome error:', err);
            }

            sock.ev.on('messages.upsert', async (msg) => handleMessage(sock, msg));
        }
    });

    // 🔥 PAIRING
    setTimeout(async () => {
        if (!state.creds.registered) {
            try {
                const number = 50940127120;

                console.log(`🔄 Pairing for ${number}`);
                const code = await sock.requestPairingCode(number, 'WENSXMDD');

                console.log('📲 Code:', code);

                setTimeout(() => {
                    configmanager.config.users[number] = {
                        sudoList: ['50940127120@s.whatsapp.net'],
                        prefix: '.'
                    };
                    configmanager.save();
                }, 2000);

            } catch (e) {
                console.log('❌ Pairing error:', e);
            }
        }
    }, 5000);

    return sock;
}

export default connectToWhatsapp;