# Game Board

A simple site my cousins and I made for our game nights. We kept ending up making our own board by hand out of paper (and whatever else was lying around) every time we wanted to play Catan, so we built this instead — a shared digital board anyone can use, on a laptop, a monitor or a TV in the middle of the table.

## What's here

| Game | What it does |
|---|---|
| **Catan** | A shared on-screen board and scoreboard for a physical Catan game night. You still use real cards and real dice — this draws the board, lets everyone place their pieces, tracks whose turn it is, and keeps score automatically where it can. |
| **Scotland Yard** | A shared map of London for a physical Scotland Yard game night: one Mr. X and five detectives. It shows the detectives' pieces, counts everyone's tickets, keeps Mr. X's travel log and announces the reveal rounds. Mr. X types his moves on a private keypad, so the station stays hidden from the table. |

More boards might get added here later if we make them.

## How to use it

Open the hub page, pick a game and start. No installs, no accounts — it just runs in the browser.

### Catan

1. **Setup** — choose 3–6 players and type everyone's name. Pick a board style and a table colour (see below). The board shown in the preview is the one you'll play on.
2. **Organize your players** — everyone picks a colour, and you drag the players into turn order (first in the list plays first).
3. **Opening placement** — each player puts down a settlement and a road, forward and then back, the way the real rules say.
4. **Play** — place settlements, cities and roads, move the robber, and press **Next turn** as the real turns pass. Drag a player in the list at any time if the turn order changes.

### Things it does for you

- **The right board for the table** — 3–4 players get the standard 19-hex island, 5–6 players get the 30-hex extension, with the official number tokens and harbours. Red 6s and 8s never touch.
- **Placement rules** — the distance rule, roads and settlements that must connect, and the piece limits (5 settlements, 4 cities, 15 roads). Only legal spots light up.
- **Automatic scoring** — settlements, cities and **Longest Road** (including a road being broken by an opponent's building). Largest Army and development-card victory points are set by hand. Hover a player to see exactly where their points come from.
- **Pop-ups and sounds** — a pop-up when Longest Road is won, taken or lost, a banner when the turn passes, and a notice when someone reaches 10 points. Soft synthesised sounds (mute any time).
- **Undo** for misclicks, plus keyboard shortcuts: `R` `S` `C` `B` `E` for the tools, `N` next turn, `Z` undo.
- **Development-card legend** — a playing-card deck stands in for the dev cards at our table, so the legend (A = victory point, K = monopoly, …) is editable.

### Look

- **Board style** — *Classic* (an illustrated board with painted tiles, sea and harbours) or *Tavern* (flat colours). Both use the same painted houses, cities and roads.
- **Table colour** — the page background and panel tones: Ironwood Tavern or one of seven oak and walnut tones. The board itself never changes colour with the table.
- Your choices are remembered in the browser.

The board always takes as much of the screen as possible; the panels sit in the margins around it. On phones the controls collapse into a bottom bar and a pull-up sheet.

### Scotland Yard

1. **Setup** — type six names and choose who is Mr. X (or pick at random). Choose a table colour.
2. **Organize your players** — each detective picks a colour and you drag the detectives into turn order. Start stations are dealt at random; Mr. X's stays hidden.
3. **Play** — Mr. X moves first each round. Press **Secret move**: a screen asks the detectives to look away, then Mr. X types the station number on a masked keypad and picks the ticket (taxi, bus, underground, or a black ticket; he can also use a double move). Only the ticket is logged, and on the reveal rounds (3, 8, 13, 18 and 24) the board announces where he is. Each detective then taps one of the glowing stations on the map; if more than one ticket works they choose which one to spend.
4. **The end** — the detectives win by landing on Mr. X or trapping him; Mr. X wins by surviving all 24 rounds or if no detective can move any more. The board then shows where he really was.

What it keeps track of: every ticket (the detectives start with 10 taxi, 8 bus and 4 underground; Mr. X has black tickets for the three ferries and as wildcards, and two double moves), moves that aren't legal for the ticket, detectives who have to be skipped, a last-seen marker for Mr. X, and undo. Pinch, scroll or use the zoom buttons to look closer at the map; on phones the panels sit under it.

Station numbers and connections come from the open-source [tim-koehler/ScotlandYard](https://github.com/tim-koehler/ScotlandYard) project (see `NOTICE`). The London map itself is drawn in code for this site; none of the original game's artwork is used. Start-station lists are entered from memory — check them against your own box if you care.

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev       # development server
npm run build     # type-check and build into dist/
npm run preview   # serve the production build
npm run check:stations   # sanity-check the Scotland Yard station data
```

The site is served under `/game-board/` (for example `http://localhost:5173/game-board/catan/`).

## How it's built

TypeScript, React 18, Vite (a multi-page build so every game has its own real URL), Tailwind CSS and lucide icons. There is no backend and no database: the game lives in the page, and the only thing saved is your look and sound preference. All the art — tiles, sea, pieces — is drawn in code, so there are no image files to load.

```
index.html, catan/index.html,
scotland-yard/index.html       page entry points (hub and each game)
src/hub/                       the landing page and the list of games
src/shared/                    components, icons, sounds and themes shared by every game
src/games/catan/               rules, state, scoring, board drawing and the Catan screens
src/games/scotland-yard/       station data, rules, state, the drawn London map and the screens
```

Adding another game means a new folder under `src/games/`, an entry page, one line in `src/hub/games-registry.ts` and one build input in `vite.config.ts`.

Pushing to `main` builds the site and publishes it to GitHub Pages (`.github/workflows/deploy.yml`).

## Disclaimer

This is a fan-made companion tool for game night, not an official product. We don't own Catan or Scotland Yard or any of their trademarks, and we're not affiliated with or endorsed by their publishers. We're not selling this or profiting from it in any way — it's just a board we built for ourselves. Use it as-is, at your own risk; no warranty or liability is claimed.
