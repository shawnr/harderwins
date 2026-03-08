# Harder Wins

Website for the Harder Wins music project at [harderwins.com](https://harderwins.com).

## Build

The site uses a zero-dependency Node.js static site generator. No npm install needed — just Node.js.

```bash
cd harderwins
node build.js
```

This reads `albums.json` and the templates in `src/`, then generates the full site into `docs/`. GitHub Pages serves from the `docs/` folder on the `main` branch.

## Local preview

```bash
cd docs
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Project structure

```
harderwins/
  albums.json          # Album data (single source of truth)
  build.js             # Static site generator (zero dependencies)
  README.md
  src/
    css/style.css      # All styles
    js/main.js         # Client-side JS (player, album swap, Game of Life)
    images/            # Logo assets (copied to docs/images/ on build)
    templates/
      base.html        # Page shell (header, footer, player)
      home.html        # Home page (featured album + grid)
      album.html       # Album detail page
  docs/                # Built output (deployed to GitHub Pages)
    CNAME              # Custom domain config
    css/
    js/
    images/
    [album-slug]/      # Permalink pages for each album
```

## Adding or editing albums

Edit `albums.json`, then run `node build.js`. Album covers go in `../assets/images/album-covers/` and are copied into `docs/images/album-covers/` at build time.

## Deployment

Push the `main` branch to GitHub. GitHub Pages is configured to serve from `docs/`.

```bash
git add -A
git commit -m "your message"
git push origin main
```
