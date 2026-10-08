(function () {
  const $ = id => document.getElementById(id);

  // ── Saved-data format ──
  // Bump EXPORT_VERSION whenever the shape of an export changes.
  const EXPORT_VERSION = 3;
  // If a field's id ever changes, add 'old-id': 'new-id' here so saves made before the
  // change still land in the right box. Example: { 'inv-bp-1': 'inv-backpack-1' }
  const FIELD_RENAMES = {};

  function upgradeEntry(entry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return {};
    Object.entries(FIELD_RENAMES).forEach(([oldId, newId]) => {
      if (oldId in entry && !(newId in entry)) entry[newId] = entry[oldId];
      delete entry[oldId];
    });
    return entry;
  }
  function upgradeStore(store) {
    if (!store || typeof store !== 'object' || Array.isArray(store)) return {};
    Object.keys(store).forEach(id => { store[id] = upgradeEntry(store[id]); });
    return store;
  }

  // ── Browser storage, with a visible warning if saving stops working ──
  const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); return true; }
    catch { $('save-warning').hidden = false; return false; }
  }

  // One entry per kind of sheet. Each has its own dropdown, view, and saved list.
  const KINDS = {
    characters: {
      view: $('view-characters'), select: $('character-select'),
      key: 'crows.characters', selKey: 'crows.selected',
      deleteBtn: $('btn-delete-crow'), noun: 'crow', savedLabel: 'Saved crows',
      nameId: 'char-name', newLabel: '+ New Crow', prefix: 'c',
      store: {}, current: 'new'
    },
    pets: {
      view: $('view-pets'), select: $('pet-select'),
      key: 'crows.pets', selKey: 'crows.selectedPet',
      deleteBtn: $('btn-delete-pet'), noun: 'pet', savedLabel: 'Saved pets',
      nameId: 'pet-name', newLabel: '+ New Pet', prefix: 'p',
      store: {}, current: 'new',
      layout: data => renderPetSlots(data['pet-slots'])
    }
  };

  // ── Pet inventory: one slot per point of the pet's Slots stat ──
  // Lowering Slots only hides slots; their contents stay saved and come back if it's raised.
  const MAX_PET_SLOTS = 30;
  function renderPetSlots(value) {
    const n = Math.min(Math.max(parseInt(value, 10) || 0, 0), MAX_PET_SLOTS);
    const grid = $('pet-inv');
    $('pet-inv-hint').hidden = n > 0;
    if (grid.children.length === n) return false;
    grid.innerHTML = '';
    for (let i = 1; i <= n; i++) grid.append(window.CrowsFields.slot('pet-inv-' + i, 'Slot ' + i));
    return true;
  }

  // ── Town: a single shared page, not one per character ──
  const SLOT_STEP = 6;
  const town = { view: $('view-town'), grid: $('storage-grid'), slots: SLOT_STEP, storage: [] };

  function renderStorage() {
    town.grid.innerHTML = '';
    for (let i = 0; i < town.slots; i++) {
      const slot = window.CrowsFields.slot('storage-slot-' + (i + 1), 'Slot ' + (i + 1));
      const box = slot.querySelector('textarea');
      box.dataset.slot = i;
      box.value = town.storage[i] || '';
      town.grid.append(slot);
    }
    $('storage-remove').disabled = town.slots <= SLOT_STEP;
  }
  function saveTown() {
    town.grid.querySelectorAll('textarea').forEach(t => { town.storage[t.dataset.slot] = t.value; });
    town.storage.length = town.slots;
    lsSet('crows.town', JSON.stringify({ slots: town.slots, storage: town.storage }));
  }
  function loadTown(data) {
    const n = parseInt(data && data.slots, 10);
    town.slots = n >= SLOT_STEP ? Math.ceil(n / SLOT_STEP) * SLOT_STEP : SLOT_STEP;
    town.storage = Array.isArray(data && data.storage) ? data.storage.slice(0, town.slots) : [];
    renderStorage();
  }

  $('storage-add').addEventListener('click', () => {
    saveTown();
    town.slots += SLOT_STEP;
    renderStorage();
    saveTown();
  });
  $('storage-remove').addEventListener('click', () => {
    if (town.slots <= SLOT_STEP) return;
    saveTown();
    const removed = town.storage.slice(town.slots - SLOT_STEP);
    if (removed.some(v => v && v.trim()) &&
        !confirm('The last 6 slots have items in them. Remove them anyway?')) return;
    town.slots -= SLOT_STEP;
    renderStorage();
    saveTown();
  });

  // Read / write every field inside one view
  function collect(root) {
    const data = {};
    root.querySelectorAll('input[id], textarea[id]').forEach(el => {
      data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return data;
  }
  function apply(root, data) {
    root.querySelectorAll('input[id], textarea[id]').forEach(el => {
      const v = data[el.id];
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v == null ? '' : v;
    });
  }
  // Fill one sheet: build any data-dependent fields first (pet slots), then set every value
  function fill(k, data) {
    if (k.layout) k.layout(data);
    apply(k.view, data);
  }

  function label(k, data) {
    return (data[k.nameId] || '').trim() || 'Unnamed';
  }
  function render(k) {
    k.select.innerHTML = '';
    const fresh = new Option(k.newLabel, 'new');
    fresh.className = 'new-option';
    k.select.add(fresh);
    const saved = Object.entries(k.store);
    if (saved.length) {
      const group = document.createElement('optgroup');
      group.label = k.savedLabel;
      saved.forEach(([id, d]) => group.append(new Option(label(k, d), id)));
      k.select.add(group);
    }
    k.select.value = k.current;
    k.select.classList.toggle('is-new', k.current === 'new');
    k.deleteBtn.disabled = k.current === 'new';
  }
  function persist(k) {
    lsSet(k.key, JSON.stringify(k.store));
    lsSet(k.selKey, k.current);
  }
  // First edit on "New …" creates a new entry; later edits update it.
  // Values for fields no longer on the page are kept, so nothing is silently dropped.
  function save(k) {
    const isNew = k.current === 'new';
    if (isNew) k.current = k.prefix + Date.now();
    const before = k.store[k.current] || {};
    const after = Object.assign({}, before, collect(k.view));
    k.store[k.current] = after;
    persist(k);
    // The dropdown only needs rebuilding when an entry appears or its name changes
    if (isNew || label(k, before) !== label(k, after)) render(k);
  }

  function showView(name) {
    Object.entries(KINDS).forEach(([n, k]) => {
      k.view.hidden = n !== name;
      k.select.classList.toggle('active', n === name);
    });
    // Single shared pages, each opened by its own top-bar button
    Object.entries(PAGES).forEach(([n, page]) => {
      $(page.view).hidden = n !== name;
      $(page.button).classList.toggle('active', n === name);
    });
    lsSet('crows.view', name);
  }

  const PAGES = {
    town: { view: 'view-town', button: 'btn-town' },
    items: { view: 'view-items', button: 'btn-items' }
  };
  Object.entries(PAGES).forEach(([name, page]) => $(page.button).addEventListener('click', () => showView(name)));

  // Dropdowns: clicking or opening one switches to its view; choosing an entry loads it.
  // (Not on focus, so tabbing past a dropdown doesn't change the page.)
  const OPEN_KEYS = [' ', 'Enter', 'ArrowUp', 'ArrowDown'];
  Object.entries(KINDS).forEach(([name, k]) => {
    k.select.addEventListener('pointerdown', () => showView(name));
    k.select.addEventListener('keydown', e => { if (OPEN_KEYS.includes(e.key)) showView(name); });
    k.select.addEventListener('change', () => {
      k.current = k.select.value;
      fill(k, k.current === 'new' ? {} : (k.store[k.current] || {}));
      persist(k);
      render(k);
      showView(name);
    });

    // Delete the selected entry, then fall back to a blank "New …" sheet
    k.deleteBtn.addEventListener('click', () => {
      if (k.current === 'new') return;
      const who = label(k, k.store[k.current] || {});
      if (!confirm('Delete ' + k.noun + ' "' + who + '"? This cannot be undone.')) return;
      delete k.store[k.current];
      k.current = 'new';
      fill(k, {});
      persist(k);
      render(k);
      showView(name);
    });
  });

  // Every number on the sheets is a whole number; keep it inside the box's min/max once you finish typing
  document.addEventListener('change', e => {
    const el = e.target;
    if (!el.matches('input[type="number"]') || el.value === '') return;
    let v = Math.round(Number(el.value));
    if (el.min !== '' && v < Number(el.min)) v = Number(el.min);
    if (el.max !== '' && v > Number(el.max)) v = Number(el.max);
    if (String(v) !== el.value) {
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true })); // save the corrected value
    }
  });

  // Autosave whichever sheet was edited ('input' fires for text, numbers and checkboxes)
  document.addEventListener('input', e => {
    Object.values(KINDS).forEach(k => { if (k.view.contains(e.target)) save(k); });
    if (e.target.id === 'pet-slots' && renderPetSlots(e.target.value)) {
      apply($('pet-inv'), KINDS.pets.store[KINDS.pets.current] || {});
    }
    if (town.view.contains(e.target) && e.target.matches('textarea')) saveTown();
  });

  // ── Export: every character, every pet, the town and the item library in one file ──
  $('btn-export').addEventListener('click', () => {
    const payload = {
      format: 'crows-export',
      version: EXPORT_VERSION,
      characters: KINDS.characters.store,
      pets: KINDS.pets.store,
      town: { slots: town.slots, storage: town.storage },
      items: window.CrowsItems ? window.CrowsItems.all() : []
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'crows.json';
    a.click();
    // Give the browser time to start the download before the link is discarded
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  });

  // ── Load: full exports are merged in; old single-character files still work ──
  const isPlainObject = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const characterFieldIds = new Set(
    [...KINDS.characters.view.querySelectorAll('input[id], textarea[id]')].map(el => el.id)
  );

  $('btn-load').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      let data;
      try { data = JSON.parse(ev.target.result); } catch { data = null; }

      if (isPlainObject(data) && data.format === 'crows-export') {
        if ((data.characters != null && !isPlainObject(data.characters)) ||
            (data.pets != null && !isPlainObject(data.pets))) {
          alert('This Crows export looks damaged, so nothing was loaded.');
          return;
        }
        Object.assign(KINDS.characters.store, upgradeStore(data.characters || {}));
        Object.assign(KINDS.pets.store, upgradeStore(data.pets || {}));
        Object.values(KINDS).forEach(k => {
          persist(k);
          render(k);
          if (k.current !== 'new' && k.store[k.current]) fill(k, k.store[k.current]);
        });
        if (data.town) { loadTown(data.town); saveTown(); }
        const ni = window.CrowsItems ? window.CrowsItems.merge(data.items) : 0;
        const nc = Object.keys(data.characters || {}).length;
        const np = Object.keys(data.pets || {}).length;
        alert('Loaded ' + nc + ' character(s), ' + np + ' pet(s)' + (ni ? ', ' + ni + ' new item(s)' : '') + (data.town ? ' and the town.' : '.'));
        return;
      }

      // Older export: a single character sheet. Only accept it if it has character fields.
      const single = isPlainObject(data) ? upgradeEntry(data) : null;
      if (single && Object.keys(single).some(id => characterFieldIds.has(id))) {
        KINDS.characters.current = 'new';
        showView('characters');
        fill(KINDS.characters, single);
        save(KINDS.characters);
        return;
      }

      alert('Could not read file — make sure it is a Crows export (.json).');
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // ── Restore saved state on page load ──
  if (lsSet('crows.check', '1')) { try { localStorage.removeItem('crows.check'); } catch {} }
  Object.values(KINDS).forEach(k => {
    try { k.store = upgradeStore(JSON.parse(lsGet(k.key))); } catch { k.store = {}; }
    k.current = lsGet(k.selKey) || 'new';
    if (k.current !== 'new' && !k.store[k.current]) k.current = 'new';
    render(k);
    fill(k, k.current === 'new' ? {} : k.store[k.current]);
  });
  try { loadTown(JSON.parse(lsGet('crows.town'))); } catch { loadTown(null); }
  const lastView = lsGet('crows.view');
  showView(Object.hasOwn(KINDS, lastView) || Object.hasOwn(PAGES, lastView) ? lastView : 'characters');
})();
