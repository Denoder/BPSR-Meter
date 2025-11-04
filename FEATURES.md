# BPSR Meter - Features & Settings Documentation

This document provides detailed information about all features and settings available in BPSR Meter.

---

## Table of Contents

- [Main Features](#main-features)
- [View Modes](#view-modes)
- [Settings](#settings)
  - [Visible Columns](#visible-columns)
  - [BPTimer Integration](#bptimer-integration)
  - [Auto Clear Options](#auto-clear-options)
  - [Performance Options](#performance-options)
  - [Updates](#updates)
- [Window Management](#window-management)
- [Control Bar Features](#control-bar-features)
- [Additional Features](#additional-features)

---

## Main Features

### 1. Real-time DPS Tracking
Monitors and displays damage per second (DPS) for yourself and nearby players in real-time.

- **Solo Mode**: View only your own statistics
- **Nearby Mode**: View statistics for all players in range
- **Skills Mode**: Detailed breakdown of damage by individual skills

### 2. Combat Timer
Displays the duration of the current combat session. The timer:
- Starts automatically when combat begins (when damage is detected)
- Continues running during combat
- Can be paused/resumed manually
- Resets when you clear statistics

### 3. Group Damage Tracking
Track damage for specific players in your group:
- Manually add players to your group via the Group Management window
- Filter statistics to show only group members
- Persist group membership across sessions
- View individual player breakdowns

### 4. Monster/Boss Tracking
View detailed damage statistics for monsters and bosses:
- See which enemies you're fighting
- Track damage dealt to each monster
- Sort by total damage, DPS, or other metrics
- Useful for raid/boss fight analysis

### 5. Combat History
Review past combat sessions:
- Automatically saves combat data when enabled
- Browse through previous sessions
- Export combat logs for analysis
- View detailed breakdowns of past fights

### 6. Player Registry
Maintain a database of known players:
- Automatically tracks players you encounter
- Add players manually by UID
- Store player names and stats
- Quick reference for group management

---

## View Modes

### Solo Mode
**What it does**: Shows only your character's statistics.

**When to use**:
- Solo content (leveling, dailies, solo missions)
- Personal DPS testing
- When you want to focus on your own performance

**How to access**: Click the "Solo/Nearby" toggle button in the control bar.

---

### Nearby Mode
**What it does**: Shows statistics for all players within detection range.

**When to use**:
- Group content (dungeons, raids, field bosses)
- Comparing your performance with others
- Team composition analysis

**How to access**: Click the "Solo/Nearby" toggle button in the control bar.

---

### Skills Mode
**What it does**: Displays a detailed breakdown of damage/healing by individual skills.

**Features**:
- Shows each skill's total damage
- Hit count per skill
- Average damage per hit
- Crit rate per skill
- Can toggle between Solo and Nearby scope

**When to use**:
- Analyzing skill rotation effectiveness
- Identifying your highest-damage abilities
- Optimizing your skill usage

**How to access**: Click the chart icon button in the control bar.

---

## Settings

### Visible Columns

**Location**: Settings Window → Visible Columns section

Control which statistics are displayed in the main DPS meter window.

| Column | Description |
|--------|-------------|
| **DPS** | Damage Per Second - average damage output rate |
| **HPS** | Healing Per Second - average healing output rate |
| **Total DMG** | Total damage dealt during the combat session |
| **DMG Taken** | Total damage received during the combat session |
| **% DMG** | Percentage of total damage dealt by this player |
| **Crit %** | Percentage of attacks that were critical hits |
| **Crit DMG** | Total damage from critical hits |
| **Avg Crit** | Average damage per critical hit |
| **Lucky %** | Percentage of attacks that were lucky hits (Blue Protocol mechanic) |
| **Peak DPS** | Highest DPS achieved during any moment in combat |
| **Total Heal** | Total healing done during the combat session |

**How to customize**:
1. Open Settings (gear icon)
2. Check/uncheck boxes for desired columns
3. Changes apply immediately to the main window

---

### BPTimer Integration

**Location**: Settings Window → BPTimer Integration section

**Setting**: Submit boss HP data to BPTimer

**What it does**: Automatically submits boss health threshold data to the BPTimer community database when you fight field bosses.

**Why use it**: Helps the community track field boss spawn times by collecting data on when bosses are defeated.

**Privacy note**: Only boss HP thresholds are submitted - no personal information or player names are sent.

**Default**: Enabled

**Recommendation**: Keep enabled if you frequently fight field bosses to contribute to the community.

---

### Auto Clear Options

**Location**: Settings Window → Auto Clear Options section

#### Clear data on server change
**What it does**: Automatically resets all DPS statistics when you change servers or zones.

**When to use**:
- Enable if you want fresh statistics for each zone/dungeon
- Enable if you do multiple different activities (prevents mixing data)

**When to disable**:
- If you want continuous statistics across zone changes
- If you manually prefer to reset statistics

**Default**: Enabled

**Recommendation**: Keep enabled for most users to maintain clean, per-zone statistics.

---

#### Clear data on inactivity timeout
**What it does**: Automatically resets statistics after a specified period with no combat activity.

**When to use**:
- Enable if you take breaks between fights and want automatic cleanup
- Enable if you want separate statistics for each engagement

**When to disable**:
- If you want statistics to persist across breaks
- If you're doing sporadic combat with long idle periods

**Default**: Disabled

**Configuration**: Set timeout duration (1-300 seconds)
- Default: 20 seconds
- Lower values = more aggressive cleanup
- Higher values = longer retention after combat ends

**Recommendation**: Enable with 30-60 second timeout for dungeon content where you have breaks between pulls.

---

### Performance Options

**Location**: Settings Window → Performance Options section

#### Performance mode (reduce CPU/GPU usage)
**What it does**: Reduces the update frequency from 100ms to 250ms to lower CPU and GPU usage.

**Impact**:
- Reduces FPS drops and system load
- Lower power consumption (good for laptops)
- Slightly less responsive UI updates (still very usable)

**When to enable**:
- If you experience frame drops in-game
- If your system has limited resources
- If you're on a laptop and want better battery life

**Default**: Disabled

**Recommendation**: Enable if you notice any performance impact from the DPS meter.

---

#### Update interval (ms)
**What it does**: Controls how frequently the DPS meter updates its display (in milliseconds).

**Range**: 50ms - 1000ms
- Lower values = more responsive but higher CPU usage
- Higher values = less responsive but better performance

**Default**: 100ms

**Note**: This setting is only available when Performance Mode is disabled. Performance Mode automatically sets this to 250ms.

**Recommendation**: 
- 50-100ms: For high-end systems that want maximum responsiveness
- 150-250ms: Balanced option for most users
- 300-500ms: Low-end systems or maximum battery saving

---

#### Disable window transparency
**What it does**: Removes the transparent window background, using a solid black background instead.

**Impact**:
- Significantly reduces GPU load
- Best performance improvement option
- Requires application restart to take full effect
- Less visually integrated with game UI

**When to enable**:
- If you have performance issues
- If you have an older GPU
- If you prioritize performance over aesthetics

**Default**: Disabled

**Recommendation**: Enable this if you want the absolute best performance. This is the single most effective performance setting.

---

### Updates

**Location**: Settings Window → Updates section

#### Check for Updates
**What it does**: Manually checks GitHub for new releases of BPSR Meter.

**Features**:
- Compares your version with the latest release
- Shows release notes if an update is available
- Provides direct download link to the latest version
- Automatically checks for updates on startup

**How to update**:
1. Click "Check for Updates" button
2. If an update is available, click "Download Update"
3. Browser opens to the release page
4. Download and install the new version

**Recommendation**: Keep auto-update checking enabled and manually check if you haven't updated in a while.

---

## Window Management

### Window Controls

All windows (Main, Settings, Group, History, Monsters) have these controls:

| Button | Function |
|--------|----------|
| **Drag Handle** | Click and drag to move the window |
| **Lock** | Lock window position (prevents accidental movement) |
| **Zoom In** | Increase window size/scale |
| **Zoom Out** | Decrease window size/scale |
| **Close** | Close the window |

### Window Sizes
Window sizes and scales are automatically saved and restored when you reopen them.

**Available Windows**:
- **Main**: Primary DPS meter display
- **Settings**: Configuration panel
- **Group**: Group management interface
- **History**: Combat history browser
- **Monsters**: Monster/boss damage tracker

---

## Control Bar Features

The control bar at the top of the main window provides quick access to common functions:

### Primary Controls

| Button | Function | Description |
|--------|----------|-------------|
| **Reset** | Reset Statistics | Clears all combat data (preserves player registry) |
| **Pause** | Pause/Resume | Stops/resumes data collection |
| **Timer** | Combat Timer | Shows current combat duration |
| **History** | Open History | View past combat sessions |
| **Group** | Manage Group | Add/remove group members |
| **Monsters** | Monster View | View damage to monsters/bosses |
| **Skills** | Skills View | Toggle detailed skill breakdown |

### Secondary Controls

| Button | Function | Description |
|--------|----------|-------------|
| **Solo/Nearby** | Toggle view mode | Switch between solo and nearby player tracking |
| **Sort** | Change sorting | Sort by DPS, Damage, Healing, etc. |
| **Language** | Change language | Switch between English, Chinese, etc. |
| **Settings** | Open settings | Access configuration panel |

---

## Additional Features

### Packet Capture Backends

BPSR Meter supports two packet capture methods:

#### Npcap (Default)
- Standard packet capture driver
- Works for most users
- Stable and reliable
- **Installation**: Download from [npcap.com](https://npcap.com/)

#### WinDivert
- Alternative for VPN/Exit Lag users
- Integrated with the application
- **Requires**: Administrator privileges
- **When to use**: If you use VPNs or proxy services

**How to switch**: Use the Device Picker window to select your capture backend.

---

### Filter Mode

**What it does**: Controls which players are included in statistics.

**Options**:
- **All**: Show all detected players (default)
- **Group Only**: Show only manually added group members

**How to change**: Managed through the Group Management window

**Use case**: Focus statistics on your specific group members in crowded areas.

---

### Manual Group

**What it does**: Allows you to manually define a group of players to track.

**Features**:
- Add players by clicking them in the player list
- Remove players individually
- Clear entire group
- Group persists across sessions

**How to use**:
1. Open Group Management window
2. Click "Add to Group" for desired players
3. Enable "Group Only" filter mode
4. Main window now shows only group members

**Use case**: Tracking specific players in raids or coordinated groups.

---

### Combat History Saving

**Settings Available**:
- **Enable History Save**: Save combat sessions to disk
- **Enable Fight Log**: Additional detailed logging (for debugging)

**What's saved**:
- Combat duration
- All player statistics
- Skill breakdowns
- Timestamp

**Storage location**: `logs/` directory in application folder (Windows Key + R -> Open: `%appdata%/bpsr-meter`)

**Use case**: 
- Reviewing past performance
- Comparing builds/loadouts
- Sharing results with others

---

### Player Registry

**What it does**: Maintains a database of players you've encountered

**Automatically tracks**:
- Player UID
- Player name
- Character class
- Last seen timestamp

**Manual features**:
- Add players by UID
- Delete players from registry
- Search by name or UID

---

## Version Information

For the latest version and update information:
- Check Settings → Updates
- Visit [GitHub Releases](https://github.com/Denoder/BPSR-Meter/releases)
- Auto-check on startup (enabled by default)

---

## Contributing

If you'd like to contribute to BPSR Meter or report issues:
- GitHub Repository: [Denoder/BPSR-Meter](https://github.com/Denoder/BPSR-Meter)
- Issue Tracker: [GitHub Issues](https://github.com/Denoder/BPSR-Meter/issues)
