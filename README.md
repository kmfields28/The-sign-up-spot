# The Sign Up Spot

Find the perfect activity for your kid — sports, arts, camps, STEM, and more.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Run locally
```bash
npm start
```
Opens at http://localhost:3000

### 3. Deploy to Vercel

**Option A — Via GitHub (recommended):**
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repo
4. Click Deploy — done!

**Option B — Via Vercel CLI:**
```bash
npm install -g vercel
vercel
```

## Adding Real Data (Optional)

The app currently runs on curated seed data. To connect a live database:

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the SQL in `SUPABASE_SETUP.sql`
3. Add to `.env`:
```
REACT_APP_SUPABASE_URL=your_project_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```
4. Uncomment the Supabase section in `src/App.jsx`

## Tech Stack
- React 18
- No external UI libraries — all styles are inline
- Google Fonts (Fraunces + DM Sans)
