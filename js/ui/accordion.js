// Collapsible ("condensable") section behavior.
window.HARP = window.HARP || {};
HARP.ui = HARP.ui || {};

HARP.ui.accordion = {
  init: function (root) {
    root = root || document;
    root.querySelectorAll('.accordion-header').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.accordion-item');
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        item.classList.toggle('collapsed', expanded);
      });
    });
  }
};
