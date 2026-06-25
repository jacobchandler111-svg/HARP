// Small shared helpers. No domain logic here.
window.HARP = window.HARP || {};

HARP.util = {
  // Format a number as whole-dollar currency, e.g. 1234567 -> "$1,234,567"
  money: function (n) {
    return '$' + Math.round(Number(n) || 0).toLocaleString();
  },

  // Format a percentage to one decimal, e.g. 26.4 -> "26.4%"
  pct: function (n) {
    return (Number(n) || 0).toFixed(1) + '%';
  },

  // Escape user-supplied text before inserting into HTML.
  escape: function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};
