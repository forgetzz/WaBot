import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({
    auth: state,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { qr, connection } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("WhatsApp Connected 🔥");
    }

    if (connection === "close") {
      console.log("Connection closed, reconnecting...");
      setTimeout(() => {
        startBot();
      }, 5000);
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];

    if (!msg.message || msg.key.fromMe) return;

    const userText =
      msg.message.conversation || msg.message.extendedTextMessage?.text;

    if (!userText) return;

    const aiResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer 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`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost",
          "X-Title": "Ippang WA Bot",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.1-8b-instruct:free",
          messages: [
            {
              role: "system",
              content: `
Kamu adalah ippang yang berbicara seperti manusia asli.
Jawaban maksimal 1–2 kalimat.
Jangan terdengar seperti AI.
Jika tidak tahu jawaban, katakan tidak mengerti.
`,
            },
            {
              role: "user",
              content: userText,
            },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      console.log("AI ERROR:", err);
      return;
    }
    

    const data = await aiResponse.json();
    const reply =
      data?.choices?.[0]?.message?.content || "Maaf, error dulu.";

    await sock.sendMessage(msg.key.remoteJid, { text: reply });
  });
}

startBot();


// 🔥 TAMBAHKAN DI SINI (PALING BAWAH)

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Ippang Bot Running 🔥");
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
