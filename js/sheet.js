(function () {
  const $ = id => document.getElementById(id);

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
      store: {}, current: 'new'
    }
  };

  const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

  // ── Town: a single shared page, not one per character ──
  const SLOT_STEP = 6;
  const town = { view: $('view-town'), grid: $('storage-grid'), slots: SLOT_STEP, storage: [] };

  function renderStorage() {
    town.grid.innerHTML = '';
    for (let i = 0; i < town.slots; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      const name = document.createElement('span');
      name.className = 'inv-slot-label';
      name.textContent = 'Slot ' + (i + 1);
      const box = document.createElement('textarea');
      box.dataset.slot = i;
      box.value = town.storage[i] || '';
      slot.append(name, box);
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
  function save(k) {
    if (k.current === 'new') k.current = k.prefix + Date.now();
    k.store[k.current] = collect(k.view);
    persist(k);
    render(k);
  }

  function showView(name) {
    Object.entries(KINDS).forEach(([n, k]) => {
      k.view.hidden = n !== name;
      k.select.classList.toggle('active', n === name);
    });
    town.view.hidden = name !== 'town';
    $('btn-town').classList.toggle('active', name === 'town');
    lsSet('crows.view', name);
  }

  $('btn-town').addEventListener('click', () => showView('town'));

  // Dropdown behaviour: focusing a dropdown switches to its view; choosing loads that entry.
  Object.entries(KINDS).forEach(([name, k]) => {
    k.select.addEventListener('focus', () => showView(name));
    k.select.addEventListener('change', () => {
      k.current = k.select.value;
      apply(k.view, k.current === 'new' ? {} : (k.store[k.current] || {}));
      persist(k);
      render(k);
      showView(name);
    });
  });

  // Delete the selected entry, then fall back to a blank "New …" sheet
  Object.entries(KINDS).forEach(([name, k]) => {
    k.deleteBtn.addEventListener('click', () => {
      if (k.current === 'new') return;
      const who = label(k, k.store[k.current] || {});
      if (!confirm('Delete ' + k.noun + ' "' + who + '"? This cannot be undone.')) return;
      delete k.store[k.current];
      k.current = 'new';
      apply(k.view, {});
      persist(k);
      render(k);
      showView(name);
    });
  });

  // Autosave whichever sheet was edited
  ['input', 'change'].forEach(evt =>
    document.addEventListener(evt, e => {
      Object.values(KINDS).forEach(k => { if (k.view.contains(e.target)) save(k); });
      if (town.view.contains(e.target) && e.target.matches('textarea')) saveTown();
    })
  );

  // ── Export: every character, every pet, and the town in one file ──
  $('btn-export').addEventListener('click', () => {
    const payload = {
      format: 'crows-export',
      version: 3,
      characters: KINDS.characters.store,
      pets: KINDS.pets.store,
      town: { slots: town.slots, storage: town.storage }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'crows.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // ── Load: full exports are merged in; old single-character files still work ──
  $('btn-load').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('bad');
        if (data.format === 'crows-export') {
          Object.assign(KINDS.characters.store, data.characters || {});
          Object.assign(KINDS.pets.store, data.pets || {});
          Object.values(KINDS).forEach(k => {
            persist(k);
            render(k);
            if (k.current !== 'new' && k.store[k.current]) apply(k.view, k.store[k.current]);
          });
          if (data.town) { loadTown(data.town); saveTown(); }
          const nc = Object.keys(data.characters || {}).length;
          const np = Object.keys(data.pets || {}).length;
          alert('Loaded ' + nc + ' character(s) and ' + np + ' pet(s)' + (data.town ? ', plus the town.' : '.'));
        } else {
          // Older export: a single character sheet
          showView('characters');
          apply(KINDS.characters.view, data);
          save(KINDS.characters);
        }
      } catch {
        alert('Could not read file — make sure it is a valid Crows JSON export.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // ── Restore saved state on page load ──
  Object.values(KINDS).forEach(k => {
    try { k.store = JSON.parse(lsGet(k.key)) || {}; } catch { k.store = {}; }
    k.current = lsGet(k.selKey) || 'new';
    if (k.current !== 'new' && !k.store[k.current]) k.current = 'new';
    render(k);
    if (k.current !== 'new') apply(k.view, k.store[k.current]);
  });
  try { loadTown(JSON.parse(lsGet('crows.town'))); } catch { loadTown(null); }
  const lastView = lsGet('crows.view');
  showView(lastView === 'pets' || lastView === 'town' ? lastView : 'characters');
})();
