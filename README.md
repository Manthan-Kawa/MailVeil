# 🛡️ MAILVEIL

### AI-Powered Email Forensics & Threat Intelligence Platform

**Smart India Hackathon (SIH) Prototype** — *AI-Powered Email Threat Detection, GeoLocation and Forensic Intelligence Platform*

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://sentinel-x-defense.vercel.app/)
[![Repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/Manthan-Kawa/Sentinel-X)
[![Built with React](https://img.shields.io/badge/React-Vite-61DAFB)](#tech-stack)
[![Status](https://img.shields.io/badge/status-prototype-orange)](#disclaimer)

🔗 **Live Demo:** [sentinel-x-defense.vercel.app](https://sentinel-x-defense.vercel.app/)
📦 **Repository:** [github.com/Manthan-Kawa/Sentinel-X](https://github.com/Manthan-Kawa/Sentinel-X)

---

## 📖 Overview

**Mailveil** is a premium, dark-themed enterprise SOC/forensic-style web application built as a prototype for the Smart India Hackathon problem statement on **AI-powered email threat detection, geolocation, and forensic intelligence**.

Rather than a generic dashboard, Mailveil is designed to look and feel like a real Security Operations Center (SOC) tool — enabling analysts to ingest suspicious emails, detect threats with AI-explainable reasoning, trace network/geographic origin, correlate indicators into attack graphs, manage investigations, and preserve tamper-evident forensic evidence.

> All data in this prototype is **synthetic/mock data**, generated for demonstration purposes. No real email content, IPs, or attacker data are used.

### Core Demo Flow

```
Email → Detect → Explain → Trace → Correlate → Investigate → Preserve → Report
```

---

## ✨ Key Features

### 🖥️ Dashboard
- KPI cards: Emails Analyzed, Threats Detected, Critical Threats, Active Investigations, Model Accuracy, Campaigns
- Threat distribution charts and activity timeline
- Recent threats feed
- World map of **probable infrastructure locations**

### 📧 Email Analyzer
- Drag-and-drop `.eml` upload
- **Load Demo Email** button with a simulated analysis animation
- Sample verdict: `Risk 96/100 | BEC | CRITICAL | Confidence 94.7%`
- Explainable risk factors, including:
  - Sender impersonation
  - Lookalike domain
  - SPF / DKIM / DMARC failure
  - Suspicious URL
  - Social engineering indicators
- Clear separation between **Observed Facts** and **AI Inference**

### 🔍 Header Forensics
- From, Reply-To, Return-Path, Message-ID inspection
- SPF / DKIM / DMARC authentication results
- SMTP relay timeline — IP, hostname, timestamp, country, ASN, and confidence per hop

### 🌐 Threat Intelligence
- IP, domain, and URL reputation lookups
- ASN and hosting provider details
- DNS records and related indicators
- Lookalike-domain similarity scoring

### 📍 Origin Investigation
- Interactive map with an **Origin Confidence Engine**
- Careful, non-definitive language throughout: *"Probable Source Infrastructure"*, *"Observed Network Location"*
- Never asserts an exact attacker location — confidence-based estimates only

### 🕸️ Attack Graph
- Built with **React Flow**
- Visualizes correlated entities: `Email → Domain → IP → Hosting → URL → Campaign → Case`
- Zoom, pan, node selection, and detail inspection

### 📁 Investigations & Evidence Vault
- Case management with severity, status, and timeline tracking
- Evidence Vault with SHA-256 hashing, timestamps, and case IDs
- Simulated integrity chain: `Evidence → SHA-256 → Immutable Ledger → Integrity Verified`
- Uses **mock blockchain-style ledger data** only

### 📊 Reports & Mailveil AI
- Conversational **Mailveil AI** assistant (e.g. "Why is this suspicious?", "Summarize this case")
- Report previews for **Executive**, **Technical**, and **Forensic** audiences

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| Icons | Lucide |
| Charts | Recharts |
| Graph Visualization | React Flow |
| Deployment | Vercel |

---

## 🗂️ Sidebar / Navigation

`Dashboard` · `Email Analyzer` · `Header Forensics` · `Threat Intelligence` · `Origin Investigation` · `Attack Graph` · `Campaigns` · `Investigations` · `Evidence Vault` · `Reports` · `Alerts` · `Settings`

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm / yarn / pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/Manthan-Kawa/Sentinel-X.git
cd Sentinel-X

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173` (default Vite port).

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🎯 Design Principles

- **Judge-ready, not gimmicky** — enterprise SOC aesthetic over cyberpunk clichés (no excessive neon, skulls, or clutter)
- **Explainability first** — every AI verdict separates observed facts from inferred conclusions
- **Responsible language** — origin/geolocation findings are always framed as probabilistic, never definitive attribution
- **Fully interactive demo** — navigation, charts, the attack graph, and the analysis flow are functional, not static mockups

---

## 🔭 Future Scope

- **Companion App** — extend Sentinel-X beyond the web dashboard into a dedicated app for on-the-go threat monitoring and alerts
- **Direct Gmail Integration** — once user trust is established, allow Sentinel-X to connect directly to a user's Gmail inbox (via OAuth) for automatic, real-time email analysis — removing the need to manually upload/forward suspicious emails
- **Continuous Learning** — feed verified investigation outcomes back into the detection model to improve accuracy over time

---

## ⚠️ Disclaimer

This is a **hackathon prototype** built for demonstration purposes as part of Smart India Hackathon (SIH). All emails, IPs, domains, threat indicators, geolocation data, and "blockchain" ledger entries are **synthetic/mock data** and do not represent real investigations, real infrastructure, or real attackers.

---

## 👥 Team — Cyber Sentinels

- Manthan Kawa
- Manthan Raichura
- Dharmik Chavda
- Tirth Patel
- Omkar Patil
- Janvi Parmar

---

## 📄 License

This project was built for hackathon submission/demonstration purposes. Add a license (e.g., MIT) here if you intend to open-source it further.
