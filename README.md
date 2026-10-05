# Nexus - Your Digital Second Brain 🧠

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)

## 🌟 Overview

Nexus is a personal knowledge manager. Save links, videos, posts and notes in one place, sort them into folders, then select any mix of folders and items and ask an AI agent questions about them. Answers are built only from what you selected and cite the saved items they came from.

## ✨ Features

- **Save from anywhere**: YouTube, X/Twitter, Medium, LinkedIn, Reddit, GitHub, any web link, or your own text notes. Pasting a link picks the right type automatically.
- **Folders**: group items together, move items between folders, rename or delete folders (deleting a folder keeps its items).
- **Select and ask**: tick items and/or whole folders, then run an agent over the selection:
  - **Ask** a question and get an answer with numbered citations that link back to the sources
  - **Summarize** the selection, item by item and as a whole
  - **Compare** items: where they agree, differ and add something new
- **Search** your library by title, link or note text.
- **Sign in** with a username and password, or with Google.

### How the agent works

When you run the agent, the backend reads the text of each selected item (a note's text, a web page's readable text, a YouTube video's captions, a tweet via Twitter's public embed, a GitHub repo's README), splits it into passages, picks the ones that best match your question using BM25 keyword scoring, and sends them to a model on [Groq](https://groq.com) with strict instructions to answer only from those passages and cite them.

Good to know:

- Some sites (Medium, LinkedIn, Reddit) often block automated reading. Those items are listed as "couldn't read" instead of being guessed at.
- Fetched page text is cached for a week.
- A run reads up to 25 items, and each user is limited to 30 runs per hour.
- The server refuses to fetch private or internal addresses (`localhost`, private networks, cloud metadata) even if you save such a link.
- There are no embeddings: retrieval is keyword-based, so it works best for questions that share words with your material.

## 🔧 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT, Google Identity Services
- **AI**: Groq (`openai/gpt-oss-120b` by default)

## 📁 Project Structure

```
backend/src
  index.ts      server setup, auth, content routes
  folders.ts    folder routes and moving items
  agent.ts      the agent route: selection, reading items, rate limit
  ingest.ts     fetching and extracting text (with SSRF protection)
  rag.ts        passage selection, prompt and the Groq call
  db.ts         Mongoose models
client/src
  pages/        Landing, Signin, Signup, Dashboard
  components/   auth/, dashboard/ (folders, selection bar, agent panel), ui/
  hooks/        useContent, useFolders
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20.18 or newer
- A MongoDB database (a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works)
- A [Groq API key](https://console.groq.com/keys), for the agent
- A Google OAuth Client ID, only if you want Google sign-in (see below)

### 1. Clone and install

```bash
git clone https://github.com/yashvikram30/nexus
cd nexus

cd backend && npm install
cd ../client && npm install
```

### 2. Configure environment variables

**`backend/.env`** (copy from `backend/.env.example`):

| Variable | Required | What it is / where to get it |
|---|---|---|
| `MONGO_URL` | yes | MongoDB connection string. In Atlas: Database → Connect → Drivers. |
| `JWT_SECRET` | yes | Any long random string used to sign logins. Generate one with `openssl rand -hex 32`. |
| `PORT` | no | Defaults to `3000`. |
| `GROQ_API_KEY` | for the agent | Create at https://console.groq.com/keys |
| `GROQ_MODEL` | no | Defaults to `openai/gpt-oss-120b`. |
| `AGENT_CONTEXT_CHARS` | no | Characters of saved text sent per run (default `20000`). Raise it if your Groq plan allows more tokens per minute. |
| `GOOGLE_CLIENT_ID` | for Google sign-in | See [Google sign-in](#google-sign-in). |
| `CLIENT_URL` | recommended in production | The site allowed to call the API, e.g. `https://your-app.vercel.app`. Unset allows any site. |
| `DNS_SERVERS` | no | `1.1.1.1,8.8.8.8` if you get `querySrv EREFUSED` connecting to Atlas on a network that blocks SRV lookups. |

The server refuses to start without `MONGO_URL` and `JWT_SECRET`.

**`client/.env.local`** (copy from `client/.env.example`):

| Variable | Required | What it is |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | for Google sign-in | Same Client ID as the backend's `GOOGLE_CLIENT_ID`. The Google button is hidden when empty. |
| `VITE_BACKEND_URL` | in production | Address of the backend. Defaults to `http://localhost:3000`. |

### Google sign-in

1. Open the [Google Cloud Console](https://console.cloud.google.com) and create a project.
2. Set up the OAuth consent screen (**External**) and add yourself as a **test user**.
3. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**, choose **Web application**.
4. Under **Authorized JavaScript origins** add the exact address you open the app at, e.g. `http://localhost:5173`. Leave redirect URIs empty.
5. Copy the Client ID into both env files. There is no client secret to configure.

If Google shows `origin_mismatch`, the origin in step 4 doesn't exactly match your browser's address (check the port, and `http` vs `https`).

### 3. Run it

In two terminals:

```bash
# terminal 1: backend on http://localhost:3000
cd backend
npm run dev        # builds, then starts (re-run after changing backend code)

# terminal 2: frontend on http://localhost:5173
cd client
npm run dev
```

Open http://localhost:5173.

## ☁️ Deployment

The frontend is a static site and the backend is a long-running Node server, so they deploy separately. This setup uses MongoDB Atlas, [Render](https://render.com) for the backend and [Vercel](https://vercel.com) for the frontend, but any equivalents work.

Do the steps in this order, because each one needs an address from the previous step.

### 1. Database (MongoDB Atlas)

- Create a database user with a strong password.
- Under **Network Access**, allow the backend to connect. Render's free tier has no fixed IP, so this usually means `0.0.0.0/0`; the strong password and a long `JWT_SECRET` are what protect you.
- Copy the connection string for `MONGO_URL`.

### 2. Backend (Render)

Create a **Web Service** from your GitHub repo:

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Node version | 20.18 or newer (set the `NODE_VERSION` env var if needed) |

Environment variables: `MONGO_URL`, `JWT_SECRET`, `GROQ_API_KEY`, `GOOGLE_CLIENT_ID`, `NODE_ENV=production`. Render sets `PORT` itself. Leave `CLIENT_URL` for step 4. You do not need `DNS_SERVERS` on a host.

Note the service URL, e.g. `https://nexus-api.onrender.com`. On Render's free tier the service sleeps when idle, so the first request after a pause can take up to a minute.

### 3. Frontend (Vercel)

Import the same repo as a new project:

| Setting | Value |
|---|---|
| Root Directory | `client` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Environment variables: `VITE_BACKEND_URL` (the Render URL from step 2) and `VITE_GOOGLE_CLIENT_ID`. These are baked in at build time, so redeploy after changing them. `client/vercel.json` already sends every route to `index.html` so pages like `/dashboard` work on refresh. On Netlify, add a `_redirects` file containing `/* /index.html 200` instead.

### 4. Connect the pieces

- On Render, set `CLIENT_URL` to your Vercel URL (no trailing path) and redeploy, so only your site can call the API.
- In the Google Cloud Console, add your Vercel URL to **Authorized JavaScript origins** (and your custom domain, if you add one). While the OAuth app is in Testing mode only listed test users can sign in; publish it from the **Audience** page to open it up.

### Deployment notes

- Run **one** backend instance. The agent's hourly rate limit is held in memory, so several instances (or a restart) each count separately.
- Agent runs cost whatever your Groq plan charges. If you hit `rate limit` errors, select fewer items or adjust `AGENT_CONTEXT_CHARS`.
- Logins are stored as a token in the browser's local storage and sent in the `Authorization` header.

## 🗺️ Roadmap

- [ ] Shareable read-only links to a folder
- [ ] Embedding-based retrieval for better recall
- [ ] Streaming agent answers
- [ ] Readers for more sources (PDFs, paywalled sites)
- [ ] Browser extension for one-click saving

## 🤝 Contributing

Contributions are always welcome!

## 📞 Contact

[@Yash Vikram](https://x.com/100xYash)

