// Prepaint theme bootstrap — keep in sync with any React-side theme toggles.
// Externalized from index.html so we can drop 'unsafe-inline' from the CSP.
(function () {
  try {
    var isDark =
      (localStorage.getItem('theme') === 'dark') ||
      (!localStorage.getItem('theme') &&
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

    var root = document.documentElement;
    root.classList.toggle('dark', !!isDark);

    var metaTheme = document.querySelector('meta[name="theme-color"]:not([media])');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', isDark ? '#0F0F0F' : '#ffffff');

    var lightIcon = document.querySelector('link[rel="icon"][data-theme="light"]');
    var darkIcon = document.querySelector('link[rel="icon"][data-theme="dark"]');
    if (lightIcon && darkIcon) {
      lightIcon.disabled = !!isDark;
      darkIcon.disabled = !isDark;
    }
    var favicon = document.getElementById('favicon');
    if (favicon) {
      favicon.href = isDark ? '/favicon-dark-32x32.png' : '/favicon-light-32x32.png';
    }
  } catch (e) { /* no-op */ }
})();

// Stabilize mobile viewport units (avoid address-bar jumps).
(function () {
  try {
    var setVH = function () {
      var vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', vh + 'px');
    };
    setVH();
    window.addEventListener('resize', setVH, { passive: true });
  } catch (e) { /* no-op */ }
})();
