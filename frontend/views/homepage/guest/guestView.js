// frontend/views/homepage/guest/guestView.js
document.addEventListener('DOMContentLoaded', () => {
  const accordionItems = document.querySelectorAll('.acc-item');
  const guestSearchButton = document.getElementById('guestSearchButton');
  const sidebarSearchInput = document.getElementById('sidebarSearch');

  // Simple accordion logic:
  // Only buttons WITHOUT "locked" class can toggle their panel.
  accordionItems.forEach((item) => {
    const trigger = item.querySelector('.acc-trigger');
    const panel = item.querySelector('.acc-panel');

    if (!trigger || !panel) return;

    if (trigger.classList.contains('locked') || trigger.disabled) {
      // Locked items never open
      return;
    }

    trigger.addEventListener('click', () => {
      const isOpen = panel.classList.contains('open');
      // Close all other panels
      document.querySelectorAll('.acc-panel.open').forEach((p) => {
        p.classList.remove('open');
        p.style.maxHeight = 0;
      });

      if (!isOpen) {
        panel.classList.add('open');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });

  // When the Guest "Search" button is clicked,
  // focus the sidebar search input (or later open a search modal).
  if (guestSearchButton) {
    guestSearchButton.addEventListener('click', () => {
      if (sidebarSearchInput) {
        sidebarSearchInput.focus();
      }
      alert(
        'Guest search is limited to viewing public templates. Register for full access.'
      );
    });
  }
});
