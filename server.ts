import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin if credentials are provided
let db: admin.firestore.Firestore | null = null;
try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    db = admin.firestore();
    console.log("Firebase initialized successfully");
  } else {
    console.log("Firebase credentials missing, skipping Firestore export");
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory session tracking for duration calculation
  const activeSessions = new Map<string, string>();

  // API endpoint for metrics
  app.post("/api/metrics", (req, res) => {
    const { event: eventName, sessionId, timestamp } = req.body;
    
    const event: any = {
      ...req.body,
      timestamp: timestamp || new Date().toISOString()
    };

    if (eventName === 'session_start' && sessionId) {
      activeSessions.set(sessionId, event.timestamp);
    } else if (eventName === 'session_end' && sessionId) {
      const startTimeStr = activeSessions.get(sessionId);
      if (startTimeStr) {
        const startTime = new Date(startTimeStr).getTime();
        const endTime = new Date(event.timestamp).getTime();
        const durationMs = endTime - startTime;
        event.data = { ...event.data, durationSeconds: Math.round(durationMs / 1000) };
        activeSessions.delete(sessionId);
      }
    }
    
    // Log to console for immediate visibility in agent logs
    console.log("[METRIC EVENT]:", JSON.stringify(event));
    
    // Export to Firestore if configured
    if (db) {
      console.log(`[FIRESTORE]: Exporting event "${eventName || event.event}" to collection "metrics"...`);
      db.collection("metrics").add(event)
        .then(doc => console.log(`[FIRESTORE SUCCESS]: Document written with ID: ${doc.id}`))
        .catch(err => {
          console.error("[FIRESTORE ERROR]: Error exporting to Firestore:", err);
        });
    } else {
      console.log("[FIRESTORE SKIP]: Database not initialized. Check environment variables.");
    }
    
    // Also save to a file
    const logPath = path.join(__dirname, "metrics.jsonl");
    fs.appendFileSync(logPath, JSON.stringify(event) + "\n");
    
    res.status(204).send();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
