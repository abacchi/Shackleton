(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // SCROLL PROGRESS BAR
  const bar = document.getElementById('scroll-progress');
  if (bar) {
    const update = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? (scrolled / max) * 100 : 0;
      bar.style.width = pct + '%';
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  if (prefersReducedMotion) return;

  // Split h2 text into per-word spans so we can stagger their reveal.
  document.querySelectorAll('h2').forEach(h => {
    // Preserve inner HTML structure for nested tags by walking text nodes only.
    const walk = (node) => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          const parts = child.nodeValue.split(/(\s+)/);
          parts.forEach(part => {
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(part));
            } else if (part.length) {
              const s = document.createElement('span');
              s.className = 'word';
              s.textContent = part;
              frag.appendChild(s);
            }
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(h);
    const words = h.querySelectorAll('.word');
    words.forEach((w, i) => { w.style.transitionDelay = (i * 90) + 'ms'; });
  });

  // FADE-AND-RISE REVEALS
  const revealSelectors = [
    '.chapter > *:not(.timeline):not(h2)',
    '.timeline li',
    'figure',
    '.diary'
  ];
  const revealEls = document.querySelectorAll(revealSelectors.join(','));
  revealEls.forEach(el => el.classList.add('reveal'));

  // Observe h2 separately — uses its own word-by-word reveal.
  const headingObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        headingObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('h2').forEach(h => headingObserver.observe(h));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => revealObserver.observe(el));

  // TIMELINE CASCADE (stagger per-row delay)
  document.querySelectorAll('.timeline li').forEach((li, i) => {
    li.style.transitionDelay = (i * 70) + 'ms';
  });

  // ANIMATED MAP ROUTE
  const map = document.getElementById('route-map');
  if (map) {
    const routes = map.querySelectorAll('.route');
    const lengths = [];
    routes.forEach(path => {
      const len = path.getTotalLength();
      lengths.push(len);
      // Preserve existing dasharray for stylistic lines by storing it.
      const originalDash = path.getAttribute('stroke-dasharray');
      path.dataset.origDash = originalDash || '';
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.style.opacity = '0';
    });

    let drawn = false;
    const mapObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !drawn) {
          drawn = true;
          let cumulative = 0;
          routes.forEach((path, i) => {
            const len = lengths[i];
            const duration = Math.min(2200, 600 + len * 1.8);
            setTimeout(() => {
              path.style.transition = `stroke-dashoffset ${duration}ms ease-out, opacity 300ms ease-out`;
              path.style.opacity = '1';
              path.style.strokeDashoffset = '0';
              // After draw completes, restore original dash pattern (e.g. for drift/rescue dashed lines).
              setTimeout(() => {
                const orig = path.dataset.origDash;
                path.style.transition = 'none';
                path.style.strokeDasharray = orig || 'none';
                path.style.strokeDashoffset = '0';
              }, duration + 50);
            }, cumulative);
            cumulative += duration * 0.65;
          });
          mapObserver.disconnect();
        }
      });
    }, { threshold: 0.35 });
    mapObserver.observe(map);
  }
})();
