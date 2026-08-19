import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Support large payload for high-resolution base64 candidate photo uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Server-side persistent storage file path
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'election_state.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadServerState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading server election state:", err);
  }
  return null;
}

function saveServerState(state: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error("Error writing server election state:", err);
    return false;
  }
}

// ==========================================
// BACKEND API ROUTES
// ==========================================

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET Current Election State (includes all synced candidate photos)
app.get("/api/election", (_req, res) => {
  const state = loadServerState();
  if (state) {
    return res.json({ success: true, state });
  }
  return res.json({ success: false, message: "No server state initialized yet" });
});

// POST Save Election State
app.post("/api/election", (req, res) => {
  const { state } = req.body;
  if (!state || !state.candidates || !state.positions) {
    return res.status(400).json({ success: false, message: "Invalid election state payload" });
  }
  const saved = saveServerState(state);
  if (saved) {
    return res.json({ success: true, message: "State saved to cloud server successfully" });
  }
  return res.status(500).json({ success: false, message: "Failed to persist state" });
});

// POST Update Candidate Photo directly
app.post("/api/candidates/:id/photo", (req, res) => {
  const candidateId = req.params.id;
  const { photoUrl } = req.body;
  const state = loadServerState();
  if (!state) {
    return res.status(404).json({ success: false, message: "Election state not initialized" });
  }

  let found = false;
  state.candidates = state.candidates.map((c: any) => {
    if (c.id === candidateId) {
      found = true;
      return { ...c, photoUrl: photoUrl || '', photoRequiresVerification: false };
    }
    return c;
  });

  if (!found) {
    return res.status(404).json({ success: false, message: "Candidate not found" });
  }

  saveServerState(state);
  return res.json({ success: true, message: "Candidate photo updated on server", state });
});

// POST Cast Vote
app.post("/api/vote", (req, res) => {
  const { voterId, selections } = req.body;
  const state = loadServerState();
  if (!state) {
    return res.status(400).json({ success: false, message: "Election not ready" });
  }

  const normalizedId = (voterId || "").trim().toUpperCase();
  const voter = state.voters[normalizedId];

  if (!voter) {
    return res.status(400).json({ success: false, message: "Invalid voter ID" });
  }

  if (voter.status === 'VOTED') {
    return res.status(400).json({ success: false, message: "Voter has already cast a ballot" });
  }

  state.voters[normalizedId] = {
    ...voter,
    status: 'VOTED',
    votedAt: new Date().toISOString(),
  };

  state.votes.push({
    id: `vote-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    selections,
  });

  saveServerState(state);
  return res.json({ success: true, message: "Vote recorded successfully", state });
});

// ==========================================
// VITE MIDDLEWARE & STATIC ASSET SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
