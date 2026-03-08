/* ==========================================================================
   HARDER WINS — main.js
   Album swap, sticky footer player, scroll animations
   ========================================================================== */

(function () {
  'use strict';

  var ALBUMS = window.__ALBUMS__ || [];

  /* -----------------------------------------------------------------------
     FEATURED ALBUM SWAP
     ----------------------------------------------------------------------- */
  var AlbumSwap = {
    featuredEl: null,
    gridEl: null,
    currentFeaturedId: null,

    init: function () {
      this.featuredEl = document.getElementById('featured-album');
      this.gridEl = document.getElementById('album-grid');
      if (!this.featuredEl || !this.gridEl) return;

      this.currentFeaturedId = this.featuredEl.getAttribute('data-album-id');

      this.gridEl.addEventListener('click', function (e) {
        if (e.target.closest('.album-card__permalink')) return;
        var card = e.target.closest('.album-card');
        if (card) {
          var albumId = card.getAttribute('data-album-id');
          if (albumId && albumId !== this.currentFeaturedId) this.swapFeatured(albumId);
        }
      }.bind(this));

      this.handleHash();
      window.addEventListener('hashchange', this.handleHash.bind(this));
    },

    handleHash: function () {
      var hash = window.location.hash.replace('#', '');
      if (hash) {
        var album = ALBUMS.find(function (a) { return a.slug === hash || a.id === hash; });
        if (album && album.id !== this.currentFeaturedId) this.swapFeatured(album.id, true);
      }
    },

    swapFeatured: function (newAlbumId, skipHash) {
      var newAlbum = ALBUMS.find(function (a) { return a.id === newAlbumId; });
      if (!newAlbum) return;

      if (!skipHash) history.pushState(null, '', '#' + newAlbum.slug);

      this.featuredEl.style.opacity = '0';
      var self = this;
      setTimeout(function () {
        self.featuredEl.setAttribute('data-album-id', newAlbum.id);
        self.renderFeatured(newAlbum);
        self.renderGrid(newAlbum.id);
        self.currentFeaturedId = newAlbum.id;
        self.featuredEl.style.opacity = '1';
        self.featuredEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    },

    renderFeatured: function (album) {
      var tags = (album.tags || []).map(function (t) {
        return '<span class="tag">' + esc(t) + '</span>';
      }).join('');

      this.featuredEl.innerHTML =
        '<div class="featured-album__inner">' +
          '<div class="featured-album__cover">' +
            '<img src="/images/album-covers/' + album.coverImage + '" alt="' + esc(album.title) + '">' +
          '</div>' +
          '<div class="featured-album__info">' +
            '<h2 class="featured-album__title">' + esc(album.title) + '</h2>' +
            '<p class="featured-album__desc">' + esc(album.description) + '</p>' +
            '<p class="featured-album__meta">' + esc(album.releaseDate) + '</p>' +
            '<div class="featured-album__tags">' + tags + '</div>' +
            '<div class="inline-player">' +
              '<iframe style="border: 0; width: 100%; max-width: 350px; height: 120px;" src="https://bandcamp.com/EmbeddedPlayer/album=' + album.bandcampAlbumId + '/size=large/bgcol=333333/linkcol=e32c14/tracklist=false/artwork=none/transparent=true/" seamless><a href="' + album.bandcampUrl + '">' + esc(album.title) + ' by Harder Wins</a></iframe>' +
            '</div>' +
            '<div class="featured-album__actions">' +
              '<a class="btn" href="' + album.bandcampUrl + '" target="_blank" rel="noopener">Bandcamp</a>' +
              '<a class="btn" href="/' + album.slug + '/">Details</a>' +
            '</div>' +
          '</div>' +
        '</div>';
    },

    renderGrid: function (featuredId) {
      var gridAlbums = ALBUMS.filter(function (a) { return a.id !== featuredId; });
      this.gridEl.innerHTML = gridAlbums.map(function (album) {
        return (
          '<div class="album-card fade-in-up is-visible" data-album-id="' + album.id + '">' +
            '<div class="album-card__image">' +
              '<img src="/images/album-covers/' + album.coverImage + '" alt="' + esc(album.title) + '" loading="lazy">' +
              '<div class="album-card__overlay"></div>' +
            '</div>' +
            '<a class="album-card__permalink" href="/' + album.slug + '/" title="Permalink">#</a>' +
            '<div class="album-card__body">' +
              '<div class="album-card__title">' + esc(album.title) + '</div>' +
              '<div class="album-card__year">' + album.year + '</div>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    }
  };

  /* -----------------------------------------------------------------------
     SCROLL ANIMATIONS
     ----------------------------------------------------------------------- */
  var ScrollAnimate = {
    init: function () {
      if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('.fade-in-up').forEach(function (el) { el.classList.add('is-visible'); });
        return;
      }
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
      document.querySelectorAll('.fade-in-up').forEach(function (el) { obs.observe(el); });
    }
  };

  function esc(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  /* -----------------------------------------------------------------------
     CARD NAVIGATION — fallback for pages without featured swap (detail pages)
     Clicking an album card navigates to its detail page
     ----------------------------------------------------------------------- */
  var CardNav = {
    init: function () {
      // Only activate if AlbumSwap didn't initialize (i.e. no featured section)
      if (document.getElementById('featured-album')) return;

      document.addEventListener('click', function (e) {
        if (e.target.closest('.album-card__permalink')) return;
        var card = e.target.closest('.album-card');
        if (card) {
          var albumId = card.getAttribute('data-album-id');
          var album = ALBUMS.find(function (a) { return a.id === albumId; });
          if (album) window.location.href = '/' + album.slug + '/';
        }
      });
    }
  };

  /* -----------------------------------------------------------------------
     GAME OF LIFE — dub soundsystem LED display
     700×100 canvas filled with a dot grid. Dead cells are dim grey.
     Live cells glow red, gold, or green (randomly assigned at birth).
     Runs Conway's Game of Life rules on a slow tick.
     ----------------------------------------------------------------------- */
  var LifeDisplay = {
    canvas: null,
    ctx: null,
    cols: 0,
    rows: 0,
    cellSize: 8,    // dot diameter
    gap: 2,         // space between dots
    grid: null,     // 0 = dead, 1/2/3 = alive (color index)
    colors: [
      null,
      '#e32636',   // 1 = red
      '#d4af37',   // 2 = gold
      '#4ade40'    // 3 = green
    ],
    deadColor: '#222222',
    bgColor: '#030303',
    tickInterval: 400,  // ms between generations
    timer: null,
    history: [],        // last N alive counts to detect oscillation
    historyLen: 6,      // how many ticks to track
    staleCount: 0,      // consecutive ticks with repeating population

    init: function () {
      this.canvas = document.getElementById('life-display');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      // Size canvas to fill container width
      var containerWidth = this.canvas.parentElement.offsetWidth || 700;
      this.canvas.width = containerWidth;
      this.canvas.height = 100;

      var step = this.cellSize + this.gap;
      this.cols = Math.floor(this.canvas.width / step);
      this.rows = Math.floor(this.canvas.height / step);

      // Initialize grid — ~15% alive to start
      this.grid = [];
      for (var r = 0; r < this.rows; r++) {
        this.grid[r] = [];
        for (var c = 0; c < this.cols; c++) {
          if (Math.random() < 0.15) {
            this.grid[r][c] = this.randomColor();
          } else {
            this.grid[r][c] = 0;
          }
        }
      }

      this.draw();
      this.timer = setInterval(this.tick.bind(this), this.tickInterval);

      // Respect reduced motion
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        clearInterval(this.timer);
      }
    },

    randomColor: function () {
      return Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
    },

    countNeighbors: function (r, c) {
      var count = 0;
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          var nr = r + dr;
          var nc = c + dc;
          // Wrap edges (toroidal)
          if (nr < 0) nr = this.rows - 1;
          if (nr >= this.rows) nr = 0;
          if (nc < 0) nc = this.cols - 1;
          if (nc >= this.cols) nc = 0;
          if (this.grid[nr][nc] > 0) count++;
        }
      }
      return count;
    },

    tick: function () {
      var next = [];
      var aliveCount = 0;

      for (var r = 0; r < this.rows; r++) {
        next[r] = [];
        for (var c = 0; c < this.cols; c++) {
          var alive = this.grid[r][c] > 0;
          var neighbors = this.countNeighbors(r, c);

          if (alive) {
            if (neighbors === 2 || neighbors === 3) {
              next[r][c] = this.grid[r][c];
            } else {
              next[r][c] = 0;
            }
          } else {
            if (neighbors === 3) {
              next[r][c] = this.randomColor();
            } else {
              next[r][c] = 0;
            }
          }

          if (next[r][c] > 0) aliveCount++;
        }
      }

      this.grid = next;

      // Detect stalling: track population history
      // Oscillators repeat every 2-3 ticks, still-lifes every 1 tick
      this.history.push(aliveCount);
      if (this.history.length > this.historyLen) {
        this.history.shift();
      }

      var stalled = false;
      if (this.history.length >= this.historyLen) {
        // Check if population is stuck in a cycle (same counts repeating)
        var unique = [];
        for (var i = 0; i < this.history.length; i++) {
          if (unique.indexOf(this.history[i]) === -1) unique.push(this.history[i]);
        }
        // If only 1-3 unique values over 6 ticks, it's oscillating or static
        if (unique.length <= 3) {
          this.staleCount++;
        } else {
          this.staleCount = 0;
        }
      }

      // Also stalled if population drops too low
      if (aliveCount < 5) {
        stalled = true;
      }

      // Inject life if stale for 4+ ticks or population bottomed out
      if (stalled || this.staleCount >= 4) {
        this.injectLife();
        this.staleCount = 0;
        this.history = [];
      }

      this.draw();
    },

    injectLife: function () {
      // Seed ~10% of cells in a random rectangular region to create localized activity
      var regionW = Math.floor(this.cols * 0.4);
      var regionH = Math.floor(this.rows * 0.6);
      var startC = Math.floor(Math.random() * (this.cols - regionW));
      var startR = Math.floor(Math.random() * (this.rows - regionH));

      for (var r = startR; r < startR + regionH; r++) {
        for (var c = startC; c < startC + regionW; c++) {
          if (Math.random() < 0.2) {
            this.grid[r][c] = this.randomColor();
          }
        }
      }
    },

    draw: function () {
      var ctx = this.ctx;
      var step = this.cellSize + this.gap;
      var radius = this.cellSize / 2;

      // Clear
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Center the grid
      var totalW = this.cols * step - this.gap;
      var totalH = this.rows * step - this.gap;
      var offsetX = (this.canvas.width - totalW) / 2;
      var offsetY = (this.canvas.height - totalH) / 2;

      // Draw dead cells first (no shadow needed, batch them)
      ctx.shadowBlur = 0;
      ctx.fillStyle = this.deadColor;
      for (var r = 0; r < this.rows; r++) {
        for (var c = 0; c < this.cols; c++) {
          if (this.grid[r][c] === 0) {
            var dx = offsetX + c * step + radius;
            var dy = offsetY + r * step + radius;
            ctx.beginPath();
            ctx.arc(dx, dy, radius * 0.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw alive cells with glow
      for (var r2 = 0; r2 < this.rows; r2++) {
        for (var c2 = 0; c2 < this.cols; c2++) {
          var val = this.grid[r2][c2];
          if (val > 0) {
            var ax = offsetX + c2 * step + radius;
            var ay = offsetY + r2 * step + radius;
            var color = this.colors[val];

            // Outer glow halo
            ctx.shadowColor = color;
            ctx.shadowBlur = 12;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(ax, ay, radius, 0, Math.PI * 2);
            ctx.fill();

            // Bright center dot
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(ax, ay, radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
          }
        }
      }
      ctx.shadowBlur = 0;
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    AlbumSwap.init();
    CardNav.init();
    ScrollAnimate.init();
    LifeDisplay.init();
  });

})();
