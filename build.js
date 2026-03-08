#!/usr/bin/env node
/* ==========================================================================
   HARDER WINS — build.js
   Zero-dependency static site generator
   Usage: node build.js
   ========================================================================== */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const DOCS = path.join(ROOT, 'docs');
const ASSETS_COVERS = path.join(ROOT, '..', 'assets', 'images', 'album-covers');
const ASSETS_LOGOS = path.join(SRC, 'images');

// ---------------------------------------------------------------------------
// Read source files
// ---------------------------------------------------------------------------
console.log('Reading source files...');

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'albums.json'), 'utf8'));
const baseTemplate = fs.readFileSync(path.join(SRC, 'templates', 'base.html'), 'utf8');
const homeTemplate = fs.readFileSync(path.join(SRC, 'templates', 'home.html'), 'utf8');
const albumTemplate = fs.readFileSync(path.join(SRC, 'templates', 'album.html'), 'utf8');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function render(template, vars) {
  var result = template;

  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, function (match, key, content) {
    return vars[key] ? content : '';
  });

  result = result.replace(/\{\{(\w+)\}\}/g, function (match, key) {
    return vars.hasOwnProperty(key) ? vars[key] : match;
  });

  return result;
}

function buildCard(album, addFadeClass) {
  var cls = addFadeClass ? 'album-card fade-in-up' : 'album-card';
  return (
    '<div class="' + cls + '" data-album-id="' + album.id + '">' +
      '<div class="album-card__image">' +
        '<img src="/images/album-covers/' + album.coverImage + '" alt="' + escapeHtml(album.title) + '" loading="lazy">' +
        '<div class="album-card__overlay">' +
          '<button class="btn btn--play btn--sm" data-play-album="' + album.id + '">&#9654; Play</button>' +
        '</div>' +
      '</div>' +
      '<a class="album-card__permalink" href="/' + album.slug + '/" title="Permalink">#</a>' +
      '<div class="album-card__body">' +
        '<div class="album-card__title">' + escapeHtml(album.title) + '</div>' +
        '<div class="album-card__artists">' + escapeHtml(album.artists) + '</div>' +
        '<div class="album-card__year">' + album.year + '</div>' +
      '</div>' +
    '</div>'
  );
}

function buildTagsHtml(tags) {
  return (tags || []).map(function (t) {
    return '<span class="tag">' + escapeHtml(t) + '</span>';
  }).join('');
}

function baseVars(pageTitle, metaDesc, canonicalPath, ogImage) {
  return {
    page_title: pageTitle,
    meta_description: metaDesc || data.site.description,
    canonical_url: 'https://harderwins.com' + (canonicalPath || '/'),
    og_type: canonicalPath === '/' ? 'website' : 'music.album',
    og_image: ogImage || 'https://harderwins.com/images/hw-flag-web.png',
    site_tagline: data.site.tagline,
    site_copyright: data.site.copyright,
    year: new Date().getFullYear().toString(),
    albums_json: JSON.stringify(data.albums),
    link_bandcamp: data.links.bandcamp,
    link_spotify: data.links.spotify,
    link_appleMusic: data.links.appleMusic,
    link_youtube: data.links.youtube,
    link_soundcloud: data.links.soundcloud,
    link_instagram: data.links.instagram,
    link_bluesky: data.links.bluesky,
    link_email: data.links.email
  };
}

// ---------------------------------------------------------------------------
// Ensure output directories
// ---------------------------------------------------------------------------
console.log('Preparing output directories...');

function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }

mkdirp(path.join(DOCS, 'css'));
mkdirp(path.join(DOCS, 'js'));
mkdirp(path.join(DOCS, 'images', 'album-covers'));

// ---------------------------------------------------------------------------
// Copy static assets
// ---------------------------------------------------------------------------
console.log('Copying assets...');

fs.copyFileSync(path.join(SRC, 'css', 'style.css'), path.join(DOCS, 'css', 'style.css'));
fs.copyFileSync(path.join(SRC, 'js', 'main.js'), path.join(DOCS, 'js', 'main.js'));

// Album cover images
if (fs.existsSync(ASSETS_COVERS)) {
  fs.readdirSync(ASSETS_COVERS).filter(function (f) {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(f);
  }).forEach(function (f) {
    fs.copyFileSync(path.join(ASSETS_COVERS, f), path.join(DOCS, 'images', 'album-covers', f));
    console.log('  Copied cover: ' + f);
  });
}

// Background image
var bgSrc = path.join(ROOT, '..', 'assets', 'images', 'page-background.jpg');
if (fs.existsSync(bgSrc)) {
  fs.copyFileSync(bgSrc, path.join(DOCS, 'images', 'page-background.jpg'));
  console.log('  Copied: page-background.jpg');
}

// Logo images
if (fs.existsSync(ASSETS_LOGOS)) {
  fs.readdirSync(ASSETS_LOGOS).filter(function (f) {
    return /\.(png|svg|jpg|jpeg|webp)$/i.test(f);
  }).forEach(function (f) {
    fs.copyFileSync(path.join(ASSETS_LOGOS, f), path.join(DOCS, 'images', f));
    console.log('  Copied logo: ' + f);
  });
}

// CNAME
var cnamePath = path.join(DOCS, 'CNAME');
if (!fs.existsSync(cnamePath)) {
  fs.writeFileSync(cnamePath, 'harderwins.com');
  console.log('  Created CNAME');
}

// ---------------------------------------------------------------------------
// Build home page
// ---------------------------------------------------------------------------
console.log('Building home page...');

var featured = data.albums.find(function (a) { return a.featured; }) || data.albums[0];
var gridAlbums = data.albums.filter(function (a) { return a.id !== featured.id; });

var gridCardsHtml = gridAlbums.map(function (album) {
  return buildCard(album, true);
}).join('\n    ');

var homeContent = render(homeTemplate, {
  featured_id: featured.id,
  featured_slug: featured.slug,
  featured_title: escapeHtml(featured.title),
  featured_artists: escapeHtml(featured.artists),
  featured_description: escapeHtml(featured.description),
  featured_releaseDate: escapeHtml(featured.releaseDate),
  featured_bandcampAlbumId: featured.bandcampAlbumId,
  featured_bandcampUrl: featured.bandcampUrl,
  featured_coverImage: featured.coverImage,
  featured_tags_html: buildTagsHtml(featured.tags),
  grid_cards: gridCardsHtml,
  link_bandcamp: data.links.bandcamp
});

var homeVars = baseVars(
  'Harder Wins',
  data.site.description,
  '/',
  'https://harderwins.com/images/album-covers/' + featured.coverImage
);
homeVars.content = homeContent;

fs.writeFileSync(path.join(DOCS, 'index.html'), render(baseTemplate, homeVars));
console.log('  Built: index.html');

// ---------------------------------------------------------------------------
// Build individual album pages
// ---------------------------------------------------------------------------
console.log('Building album pages...');

data.albums.forEach(function (album) {
  var relatedAlbums = data.albums.filter(function (a) { return a.id !== album.id; });
  var relatedCardsHtml = relatedAlbums.map(function (a) { return buildCard(a, false); }).join('\n');

  var albumContent = render(albumTemplate, {
    album_id: album.id,
    album_slug: album.slug,
    album_title: escapeHtml(album.title),
    album_artists: escapeHtml(album.artists),
    album_description: escapeHtml(album.description),
    album_longDescription: escapeHtml(album.longDescription || album.description),
    album_credits: escapeHtml(album.credits || ''),
    album_releaseDate: escapeHtml(album.releaseDate),
    album_bandcampAlbumId: album.bandcampAlbumId,
    album_bandcampUrl: album.bandcampUrl,
    album_coverImage: album.coverImage,
    album_tags_html: buildTagsHtml(album.tags),
    related_cards: relatedCardsHtml
  });

  var albumVars = baseVars(
    album.title + ' \u2014 Harder Wins',
    album.description,
    '/' + album.slug + '/',
    'https://harderwins.com/images/album-covers/' + album.coverImage
  );
  albumVars.content = albumContent;

  var albumDir = path.join(DOCS, album.slug);
  mkdirp(albumDir);
  fs.writeFileSync(path.join(albumDir, 'index.html'), render(baseTemplate, albumVars));
  console.log('  Built: /' + album.slug + '/');
});

// ---------------------------------------------------------------------------
console.log('\nBuild complete!');
console.log('Output: ' + DOCS);
console.log(data.albums.length + ' album pages + index');
console.log('\nTo preview: cd docs && python3 -m http.server 8000');
