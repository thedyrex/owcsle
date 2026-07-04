
<div align="center">

<img src="public\owcsle-white.png" alt="OWCSLE" width="400" />

**A daily Overwatch esports guessing game - figure out the mystery OWCS pro from clues like team, role, and country.**

[![Play Now](https://img.shields.io/badge/▶_Play_Now-owcsle.xyz-38bdf8?style=for-the-badge)](https://owcsle.xyz)
[![Ko-fi](https://img.shields.io/badge/Support-Ko--fi-FF5E5B?style=for-the-badge&logo=kofi&logoColor=white)](https://ko-fi.com)

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

</div>

---

## 🎮 How it works

Every day there's a new mystery OWCS pro player. Type in guesses and get color-coded feedback on each attribute:

| Clue | Feedback |
|------|----------|
| 🟩 Green | Exact match |
| 🟨 Yellow | Close — same region, or age within range |
| ⬛ Gray | No match |

Solve it in as few guesses as you can, keep your streak alive, and climb the leaderboard in the endless "Unlimited" mode.

## ✨ Features

- 🗓️ **Daily puzzle** — one new OWCS player every day, same for everyone
- 🇺🇸 **USA board** — a second daily puzzle for the Overwatch World Cup 2026 USA roster
- 🕹️ **Arcade mode** — unlimited play when one puzzle a day isn't enough
- 📺 **OWTV integration** — featured articles and watch links, refreshed daily
- 📊 **Stats & streaks** — win rate, guess distribution, and shareable result cards
- 🏆 **Leaderboard & XP** — sign in via email, earn XP, level up
- 🌗 **Light & dark mode** — plus mobile-friendly boards

## 🛠️ Tech stack

| Layer | Tech |
|-------|------|
| Framework | [Next.js](https://nextjs.org) (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Auth & database | [Supabase](https://supabase.com) |
| Asset storage | Cloudflare R2 + CDN |
| Hosting & crons | [Vercel](https://vercel.com) |

## 🚀 Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play. You'll need a `.env` with Supabase, Twitch, and R2 credentials for full functionality.

## ☕ Support

OWCSLE is a free fan project. If you enjoy it, consider [buying me a coffee on Ko-fi](https://ko-fi.com) 💙

---

<div align="center">
<sub>Not affiliated with Blizzard Entertainment. Overwatch and OWCS are trademarks of Blizzard Entertainment, Inc.</sub>
</div>
