# BPSR Meter

A DPS meter for Blue Protocol built with Electron, React 19, and TypeScript. This project is a fork of [NeRooNx's BPSR Meter](https://github.com/NeRooNx/BPSR-Meter), featuring improved performance with Vite, Tailwind CSS, and optimized DOM updates.

<img width="1458" height="782" alt="image" src="https://github.com/user-attachments/assets/3f949d1e-4293-49ce-a397-b10a0c64c9e9" />

---

## Features

- **Real-time DPS tracking** for solo and group gameplay
- **Combat timer** with configurable auto-clear timeout
- **Group damage tracking** with individual player statistics
- **Monster/Boss tracking** with detailed damage breakdowns
- **Combat history** with session logging and export
- **Auto-update checker** via GitHub releases
- **Multiple language support** (English, Chinese)
- **Windivert/Npcap support** windivert is integrated, npcap has to be installed manually

---

## Quick Start

### Requirements

- **Windows OS**
- **[Npcap](https://npcap.com/#download)** - Required for packet capture

### Windivert Users [Exit Lag/VPN]

- You need to restart the application as admin for it to work. Npcap installation is still required since it's enabled by default.

### Installation

**For Users (Recommended)**

1. Download the latest installer from the [Releases](https://github.com/Denoder/BPSR-Meter/releases) page
2. Run the installer and follow the prompts
3. The application will launch automatically after installation

**For Developers**

1. Clone the repository:
   ```bash
   git clone https://github.com/Denoder/BPSR-Meter.git
   cd BPSR-Meter
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

---

## Development

### Prerequisites

- Node.js v22.20.0 or higher
- npm or compatible package manager
- Npcap (for packet capture on Windows)
- Visual Studio Build Tools (for native module compilation)

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode with hot reload |
| `npm run dev:windows` | Start development with hot reload - and utf8 output |
| `npm run build` | Build renderer and main process |
| `npm run build:server` | Build standalone server |
| `npm run build:all` | Build everything |
| `npm run dist` | Create Windows installer |
| `npm run lint:prettier` | Format code with Prettier |

---

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Dimole's Star Resonance counter](https://github.com/dmlgzs/StarResonanceDamageCounter) - Original project
- [MrSnakke's BPSR Meter](https://github.com/mrsnakke/BPSR-Meter) - First fork
- [NeRooNx's BPSR Meter](https://github.com/NeRooNx/BPSR-Meter) - Previous fork

---

**Author:** Denoder
