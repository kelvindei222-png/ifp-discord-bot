# IFP-Core 🤖

**A powerful, feature-rich Discord administration and engagement bot built with TypeScript and Discord.js v14.**

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=flat-square&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)

## ✨ Features

### 🛡️ **Moderation System**
- **Ban/Kick/Mute** - Advanced moderation with reason logging
- **Warning System** - Issue and track warnings with persistent storage
- **Bad Words Filter** - Automatic content filtering with customizable word lists
- **Auto-Moderation** - Intelligent spam and raid protection
- **Audit Logging** - Complete action logging with customizable channels

### 🏛️ **Administration**
- **Server Statistics** - Detailed server analytics and member information
- **Role Management** - Add, remove, and manage roles with permissions
- **Channel Management** - Create, delete, edit, lock/unlock channels
- **User Information** - Comprehensive user profiles and statistics
- **Permission Management** - Fine-grained access control

### 💰 **Economy & Leveling**
- **Virtual Currency** - Earn and spend coins through various activities
- **Banking System** - Secure coin storage with interest
- **Daily/Weekly Rewards** - Regular income opportunities
- **XP & Leveling** - Progressive leveling system with rewards
- **Leaderboards** - Compete with other members

### 🎮 **Games & Entertainment**
- **Coinflip Gambling** - Risk coins for bigger rewards
- **Interactive Polls** - Create engaging community polls
- **Giveaway System** - Host exciting giveaways with requirements
- **Pomodoro Timer** - Productivity tools with visual countdown
- **Fun Commands** - Various entertainment features

### 🔧 **Utility Commands**
- **Server Info** - Detailed server information display
- **User Profiles** - Rich user information cards
- **Avatar Display** - High-quality avatar viewing
- **Ping/Latency** - Bot performance monitoring

### 📊 **Advanced Features**
- **Real-time Updates** - Live-updating embeds and statistics
- **Custom Embeds** - Beautiful, responsive message formatting
- **Button Interactions** - Modern Discord UI components
- **Slash Commands** - Full slash command implementation
- **Error Handling** - Robust error management and logging

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0 or higher
- npm or yarn package manager
- Discord Bot Token
- Discord Application ID

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ifp-core
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   Create a `.env` file in the root directory:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_application_id_here
   GUILD_ID=your_test_server_id_here  # Optional, for development
   ```

4. **Deploy commands**
   ```bash
   npm run deploy-commands
   ```

5. **Start the bot**
   ```bash
   # Development mode with hot reload
   npm run dev
   
   # Production mode
   npm run prod
   ```

## 📋 Commands Overview

### Admin Commands
| Command | Description | Permissions |
|---------|-------------|--------------|
| `/serverstats` | Display server statistics | Manage Guild |
| `/role add/remove/list/info` | Role management | Manage Roles |
| `/channel create/delete/edit/lock/unlock` | Channel management | Manage Channels |

### Moderation Commands
| Command | Description | Permissions |
|---------|-------------|--------------|
| `/ban` | Ban a user | Ban Members |
| `/kick` | Kick a user | Kick Members |
| `/mute` | Mute a user | Manage Messages |
| `/warn` | Warn a user | Manage Messages |
| `/badwords add/remove/list` | Manage word filter | Manage Messages |

### Economy Commands
| Command | Description |
|---------|--------------|
| `/balance` | Check coin balance |
| `/daily` | Claim daily rewards |
| `/weekly` | Claim weekly rewards |
| `/transfer` | Send coins to others |
| `/leaderboard` | View top users |

### Fun Commands
| Command | Description |
|---------|--------------|
| `/coinflip` | Gamble coins |
| `/poll create/simple` | Create polls |
| `/giveaway create/end/reroll` | Manage giveaways |
| `/pomodoro` | Start productivity timer |

### Utility Commands
| Command | Description |
|---------|--------------|
| `/ping` | Check bot latency |
| `/userinfo` | User information |
| `/serverinfo` | Server information |

## 🏗️ Architecture

### Project Structure
```
src/
├── commands/          # Slash commands
│   ├── admin/         # Administration commands
│   ├── economy/       # Economy system commands
│   ├── fun/           # Entertainment commands
│   ├── general/       # Utility commands
│   ├── moderation/    # Moderation commands
│   └── study/         # Productivity commands
├── events/            # Discord event handlers
├── handlers/          # Command and event loaders
├── lib/               # Core libraries and utilities
│   ├── auditLogger.ts # Logging system
│   ├── economyManager.ts # Economy engine
│   └── ...
├── data/              # JSON data storage
├── types/             # TypeScript definitions
├── utils/             # Helper functions
└── index.ts           # Main entry point
```

### Key Technologies
- **TypeScript** - Type-safe development
- **Discord.js v14** - Latest Discord API wrapper
- **Canvas** - Image generation for timers
- **Node.js** - Runtime environment

## 🔧 Configuration

The bot supports extensive configuration options:

### Environment Variables
- `DISCORD_TOKEN` - Bot token (required)
- `CLIENT_ID` - Application ID (required)
- `GUILD_ID` - Test server ID (optional, for development)

### Data Storage
- Economy data: `src/data/economy.json`
- Bad words: `src/data/badwords.json`
- Warnings: `src/data/warnings.json`
- Audit logs: `src/data/logConfig.json`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, questions, or feature requests:
- Create an issue on GitHub
- Join our Discord server (if available)
- Contact the development team

## 🎯 Roadmap

- [ ] **Database Integration** - SQLite/PostgreSQL support
- [ ] **Web Dashboard** - Browser-based configuration
- [ ] **Music System** - Voice channel music bot
- [ ] **Ticket System** - Support ticket management
- [ ] **Automod Enhancement** - AI-powered moderation
- [ ] **Custom Commands** - User-defined commands
- [ ] **Scheduled Events** - Automated tasks
- [ ] **API Integration** - External service connections

---

**Built with ❤️ for Discord communities**
