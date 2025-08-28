# Shinel Studios — Frontend

Modern React + Vite site for **Shinel Studios** with animated homepage and “Our Work” subpages (Video Editing, GFX, Thumbnails, Shorts).  
The site supports light/dark themes, a global header/footer, and responsive design.

---

## ✨ Tech Stack

- **React 18**
- **Vite** (fast dev server & build)
- **React Router v6**
- **Framer Motion** (animations)
- **lucide-react** (icons)
- **Tailwind utility classes** (inline usage)
- Custom CSS (`index.css`, `App.css`)

---

## 📦 Getting Started

### 1) Install Node.js
Use Node.js **18+** (20+ recommended).

### 2) Install dependencies
```bash
cd frontend
npm install
````

### 3) Run dev server

```bash
npm run dev
```

Your app will run on [http://localhost:5173](http://localhost:5173).

### 4) Build for production

```bash
npm run build
```

### 5) Preview production build

```bash
npm run preview
```

---

## 🔗 Routes

The app is wired in `src/App.jsx`:

| Path             | Component                   |
| ---------------- | --------------------------- |
| `/`              | `ShinelStudiosHomepage.jsx` |
| `/video-editing` | `VideoEditing.jsx`          |
| `/gfx`           | `GFX.jsx`                   |
| `/thumbnails`    | `Thumbnails.jsx`            |
| `/shorts`        | `Shorts.jsx`                |
| `*`              | Redirects to `/`            |

---

## 🗂️ Project Structure

```
frontend/
├─ public/                # static assets
├─ src/
│  ├─ assets/             # logos & images
│  ├─ components/         # React pages/components
│  │  ├─ ShinelStudiosHomepage.jsx
│  │  ├─ VideoEditing.jsx
│  │  ├─ GFX.jsx
│  │  ├─ Thumbnails.jsx
│  │  ├─ Shorts.jsx
│  │  ├─ SiteHeader.jsx
│  │  └─ SiteFooter.jsx
│  ├─ data/
│  │  └─ gamingVideos.js
│  ├─ App.jsx
│  ├─ main.jsx
│  ├─ index.css
│  └─ App.css
└─ package.json
```

---

## 🎨 Theming

Each page uses a `isDark` state to toggle **light/dark** themes.
CSS variables like `--text`, `--surface`, and `--orange` are updated dynamically.
The header includes a theme toggle (☀️/🌙).

---

## 🧱 Header & Footer

* **Header:**

  * Fixed at top
  * Enlarged logo
  * “Our Work” dropdown
  * Mobile nav + theme toggle

* **Footer:**

  * Enlarged logo
  * Quick links (Home, Services, Testimonials, Contact)
  * Newsletter input
  * Socials: Instagram, Linktree, LinkedIn

---

## ▶️ Gaming Page Video Data

Video items come from `src/data/gamingVideos.js`. Example:

```js
export default [
  {
    id: 1,
    type: "youtube",
    youtubeId: "dQw4w9WgXcQ",
    title: "Epic Montage",
    creator: "Creator Name",
    duration: "03:21",
    tags: ["Montage", "FPS"]
  },
  {
    id: 2,
    type: "file",
    src: "/videos/demo.mp4",
    thumb: "/thumbs/demo.jpg",
    title: "Trailer Cut",
    creator: "Brand",
    duration: "00:45",
    tags: ["Trailer", "Brand"]
  }
];
```

Local files should go in `/public/videos` and `/public/thumbs`.

---

## 🚀 Deployment

Any static host works (Netlify, Vercel, GitHub Pages).

* **Build:**

  ```bash
  npm run build
  ```

  Deploy the `dist/` folder.

* **Netlify SPA fix:**
  Create `_redirects` file:

  ```
  /* /index.html 200
  ```

---

## 🛠️ Troubleshooting

* **404 on refresh:** Add SPA rewrites (see deployment).
* **Import errors:** Check filenames are exact (case-sensitive).
* **Icons missing:** Install `lucide-react`:

  ```bash
  npm i lucide-react
  ```
* **Logos not loading:** Ensure `logo_dark.png` / `logo_light.png` exist in `src/assets/`.

---

## 📜 License

© 2025 Shinel Studios. All rights reserved.

```

