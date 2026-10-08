// ── Item library ──
// Players create their own items on the Items page. The Item tray lists them on every
// other page so they can be dragged (or clicked, then a slot clicked) into inventory slots.
// Items are saved in this browser and included in Export/Load.
(function () {
  const $ = id => document.getElementById(id);
  const SAVE_KEY = 'crows.itemLibrary';
  const TRAY_KEY = 'crows.trayOpen';
  const DRAG_TYPE = 'application/x-crows-item';

  let items = [];          // [{ id, name, text }]
  let editingId = null;    // item being edited on the Items page
  let picked = null;       // item chosen by click, waiting for a slot click

  try { items = JSON.parse(localStorage.getItem(SAVE_KEY)) || []; } catch { items = []; }
  if (!Array.isArray(items)) items = [];

  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(items)); }
    catch { $('save-warning').hidden = false; }
  }
  const byName = (a, b) => a.name.localeCompare(b.name);
  const findItem = id => items.find(i => i.id === id);
  // What lands in an inventory slot: the name, then the description underneath
  const slotText = item => item.text ? item.name + '\n' + item.text : item.name;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function button(text, className, onClick, label) {
    const b = el('button', className, text);
    b.type = 'button';
    if (label) b.setAttribute('aria-label', label);
    b.addEventListener('click', onClick);
    return b;
  }
  const matches = (item, query) => !query || (item.name + ' ' + item.text).toLowerCase().includes(query);

  // ── Items page: create / edit / delete ──
  function resetForm() {
    editingId = null;
    $('item-name').value = '';
    $('item-text').value = '';
    $('item-save').textContent = 'Add item';
    $('item-cancel').hidden = true;
    $('item-form-title').textContent = 'New Item';
  }

  $('item-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('item-name').value.trim();
    const text = $('item-text').value.trim();
    if (!name) { $('item-name').focus(); return; }
    const existing = editingId && findItem(editingId);
    if (existing) Object.assign(existing, { name, text });
    else items.push({ id: 'i' + Date.now() + Math.random().toString(36).slice(2, 6), name, text });
    persist();
    resetForm();
    renderAll();
    $('item-name').focus();
  });
  $('item-cancel').addEventListener('click', resetForm);

  function renderLibrary() {
    const list = $('item-list');
    const query = $('item-search').value.trim().toLowerCase();
    list.innerHTML = '';
    const shown = items.filter(i => matches(i, query)).sort(byName);
    $('item-count').textContent = items.length ? items.length + (items.length === 1 ? ' item' : ' items') : '';
    if (!shown.length) {
      list.append(el('li', 'items-empty', items.length ? 'No items match "' + query + '".' : 'No items yet. Create one on the left.'));
      return;
    }
    shown.forEach(item => {
      const li = el('li', 'library-item');
      const head = el('div', 'library-head');
      head.append(
        el('span', 'library-name', item.name),
        button('Edit', 'item-action', () => {
          editingId = item.id;
          $('item-name').value = item.name;
          $('item-text').value = item.text;
          $('item-save').textContent = 'Save changes';
          $('item-cancel').hidden = false;
          $('item-form-title').textContent = 'Edit Item';
          $('item-name').focus();
        }, 'Edit ' + item.name),
        button('Delete', 'item-action item-delete', () => {
          if (!confirm('Delete "' + item.name + '"? Copies already placed in inventory slots stay where they are.')) return;
          items = items.filter(i => i.id !== item.id);
          if (editingId === item.id) resetForm();
          persist();
          renderAll();
        }, 'Delete ' + item.name)
      );
      li.append(head);
      if (item.text) li.append(el('div', 'library-text', item.text));
      list.append(li);
    });
  }
  $('item-search').addEventListener('input', renderLibrary);

  // ── Item tray: drag (or click) items into inventory slots ──
  function renderTray() {
    const list = $('tray-list');
    const query = $('tray-search').value.trim().toLowerCase();
    list.innerHTML = '';
    const shown = items.filter(i => matches(i, query)).sort(byName);
    if (!shown.length) {
      list.append(el('li', 'items-empty', items.length ? 'No items match.' : 'No items yet. Create some on the Items page.'));
      return;
    }
    shown.forEach(item => {
      const li = el('li');
      const chip = el('button', 'tray-item' + (picked === item.id ? ' picked' : ''));
      chip.type = 'button';
      chip.draggable = true;
      chip.dataset.id = item.id;
      chip.setAttribute('aria-pressed', picked === item.id ? 'true' : 'false');
      chip.append(el('span', 'tray-item-name', item.name));
      if (item.text) chip.append(el('span', 'tray-item-text', item.text));
      chip.addEventListener('click', () => setPicked(picked === item.id ? null : item.id));
      li.append(chip);
      list.append(li);
    });
  }
  $('tray-search').addEventListener('input', renderTray);

  function positionTray() {
    $('item-tray').style.top = document.querySelector('.site-bar').offsetHeight + 'px';
  }
  window.addEventListener('resize', positionTray);

  function setTray(open) {
    positionTray();
    $('item-tray').hidden = !open;
    document.body.classList.toggle('tray-open', open);
    $('btn-tray').classList.toggle('active', open);
    $('btn-tray').setAttribute('aria-expanded', String(open));
    if (!open) setPicked(null);
    try { localStorage.setItem(TRAY_KEY, open ? '1' : ''); } catch {}
  }
  $('btn-tray').addEventListener('click', () => setTray($('item-tray').hidden));
  $('tray-close').addEventListener('click', () => setTray(false));
  $('tray-manage').addEventListener('click', () => $('btn-items').click());

  function setPicked(id) {
    picked = id;
    document.body.classList.toggle('placing-item', !!id);
    $('tray-hint').textContent = id
      ? 'Now click an inventory slot to place "' + findItem(id).name + '". Press Esc to cancel.'
      : 'Drag an item onto an inventory slot, or click an item and then click a slot.';
    renderTray();
  }

  const isSlot = node => node instanceof HTMLTextAreaElement && !!node.closest('.inv-slot');

  function place(slot, item) {
    const text = slotText(item);
    const current = slot.value.trim();
    if (current && current !== text) {
      const shownName = current.split('\n')[0].slice(0, 40);
      if (!confirm('Replace "' + shownName + '" with ' + item.name + '?')) return false;
    }
    slot.value = text;
    slot.dispatchEvent(new Event('input', { bubbles: true })); // autosave picks it up
    slot.classList.add('just-placed');
    setTimeout(() => slot.classList.remove('just-placed'), 900);
    return true;
  }

  // Dragging (mouse / trackpad)
  document.addEventListener('dragstart', e => {
    const chip = e.target.closest && e.target.closest('.tray-item');
    if (!chip) return;
    const item = findItem(chip.dataset.id);
    e.dataTransfer.setData(DRAG_TYPE, item.id);
    e.dataTransfer.setData('text/plain', slotText(item));
    e.dataTransfer.effectAllowed = 'copy';
    document.body.classList.add('dragging-item');
  });
  document.addEventListener('dragend', () => {
    document.body.classList.remove('dragging-item');
    document.querySelectorAll('.drop-target').forEach(n => n.classList.remove('drop-target'));
  });
  document.addEventListener('dragover', e => {
    if (!isSlot(e.target) || !e.dataTransfer.types.includes(DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    e.target.classList.add('drop-target');
  });
  document.addEventListener('dragleave', e => {
    if (isSlot(e.target)) e.target.classList.remove('drop-target');
  });
  document.addEventListener('drop', e => {
    if (!isSlot(e.target) || !e.dataTransfer.types.includes(DRAG_TYPE)) return;
    e.preventDefault(); // stop the browser inserting the text itself
    e.target.classList.remove('drop-target');
    const item = findItem(e.dataTransfer.getData(DRAG_TYPE));
    if (item) place(e.target, item);
  });

  // Click an item, then click a slot (works on touchscreens, where dragging doesn't)
  document.addEventListener('pointerdown', e => {
    if (!picked || !isSlot(e.target)) return;
    e.preventDefault();
    const item = findItem(picked);
    if (item && place(e.target, item)) setPicked(null);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && picked) setPicked(null);
  });

  function renderAll() {
    if (picked && !findItem(picked)) picked = null;
    renderLibrary();
    renderTray();
  }

  // ── Export / Load hooks used by sheet.js ──
  window.CrowsItems = {
    all: () => items.map(i => Object.assign({}, i)),
    merge(list) {
      if (!Array.isArray(list)) return 0;
      let added = 0;
      list.forEach(i => {
        if (!i || typeof i.name !== 'string') return;
        const item = { id: String(i.id || 'i' + Date.now() + added), name: i.name, text: String(i.text || '') };
        const existing = findItem(item.id);
        if (existing) Object.assign(existing, item);
        else { items.push(item); added++; }
      });
      persist();
      renderAll();
      return added;
    }
  };

  resetForm();
  renderAll();
  setPicked(null);
  let trayOpen = false;
  try { trayOpen = localStorage.getItem(TRAY_KEY) === '1'; } catch {}
  setTray(trayOpen);
})();
