// Floating "Back to portfolio" pill for the standalone prototypes.
// Usage: <script src="../runtime/back-to-portfolio.js" data-href="../../../"></script>
(function () {
  var s = document.currentScript;
  var href = (s && s.getAttribute('data-href')) || '../../../';
  var style = document.createElement('style');
  style.textContent =
    '.back-to-portfolio{position:fixed;left:16px;bottom:16px;z-index:900;display:inline-flex;align-items:center;gap:8px;' +
    'padding:10px 16px;border-radius:999px;background:#0a0a0f;color:#fff;font:600 13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;' +
    'text-decoration:none;border:1px solid rgba(255,255,255,.22);box-shadow:0 8px 28px rgba(0,0,0,.35);transition:transform .2s,box-shadow .2s}' +
    '.back-to-portfolio:hover{transform:translateY(-2px);box-shadow:0 10px 32px rgba(139,92,246,.5)}' +
    '.back-to-portfolio:focus-visible{outline:2px solid #22d3ee;outline-offset:3px}' +
    '.back-to-portfolio i{width:9px;height:9px;border-radius:50%;background:linear-gradient(110deg,#8b5cf6,#22d3ee 60%,#f472b6)}' +
    '@media (max-width:640px){.back-to-portfolio{left:10px;bottom:10px;padding:9px 13px}}' +
    '@media print{.back-to-portfolio{display:none}}';
  document.head.appendChild(style);
  var a = document.createElement('a');
  a.className = 'back-to-portfolio';
  a.href = href;
  var pt = false; try { pt = localStorage.getItem('lang') === 'pt'; } catch (e) {}
  a.innerHTML = '<i></i>' + (pt ? '← Voltar ao portfólio' : '← Back to portfolio');
  document.body.appendChild(a);
})();
