// Builds the repeated parts of the sheets: inventory slots and expertise checkboxes.
//
// IMPORTANT: each field's id is how saved crows and exported files find their data.
// Changing an id means anything already saved in that box is no longer shown.
(function () {
  const $ = id => document.getElementById(id);

  // ── Character inventory ──
  const WORN = [
    ['inv-head', 'Head'], ['inv-neck', 'Neck'], ['inv-waist', 'Waist'],
    ['inv-arms', 'Arms'], ['inv-finger', 'Finger'], ['inv-feet', 'Feet']
  ];
  // Five columns; null leaves a cell empty so each row lines up.
  const PACK = [
    ['inv-hand-1', 'Hand 1'], ['inv-hand-2', 'Hand 2'], null, null, null,
    ['inv-belt-1', 'Belt 1'], ['inv-belt-2', 'Belt 2'], ['inv-belt-3', 'Belt 3'], ['inv-belt-4', 'Belt 4'], null,
    ['inv-elemental-1', 'Elemental 1'], ['inv-elemental-2', 'Elemental 2'], ['inv-elemental-3', 'Elemental 3'], null, null,
    ['inv-bp-1', 'Backpack 1'], ['inv-bp-2', 'Backpack 2'], ['inv-bp-3', 'Backpack 3'], ['inv-bp-4', 'Backpack 4'], ['inv-bp-5', 'Backpack 5'],
    ['inv-bp-6', 'Backpack 6'], ['inv-bp-7', 'Backpack 7'], ['inv-bp-8', 'Backpack 8'], ['inv-bp-9', 'Backpack 9'], ['inv-bp-10', 'Backpack 10']
  ];

  // ── Expertises: two columns of groups. Each skill gets one checkbox, exp-<key>. ──
  const EXPERTISES = [
    [
      ['General', [
        ['athletics', 'Athletics'], ['endurance', 'Endurance'], ['gymnastics', 'Gymnastics'],
        ['handlepet', 'Handle Pet'], ['lift', 'Lift'], ['navigate', 'Navigate'],
        ['picklock', 'Pick Lock'], ['search', 'Search'], ['stealth', 'Stealth'],
        ['thievery', 'Thievery'], ['traits', 'Traits']
      ]],
      ['Crafting', [
        ['alchemy', 'Alchemy'], ['blacksmithing', 'Blacksmithing'], ['enchanting', 'Enchanting']
      ]],
      ['Lore', [
        ['historicallore', 'Historical'], ['magiclore', 'Magic'], ['monsterlore', 'Monster'],
        ['naturelore', 'Nature'], ['religiouslore', 'Religious']
      ]]
    ],
    [
      ['Spellcasting', [
        ['alteration', 'Alteration'], ['benefaction', 'Benefaction'], ['conjuration', 'Conjuration'],
        ['elemental', 'Elemental'], ['illusion', 'Illusion'], ['necromancy', 'Necromancy']
      ]],
      ['Weapon', [
        ['bashing', 'Bashing'], ['bow', 'Bow'], ['chopping', 'Chopping'], ['cruelty', 'Cruelty'],
        ['slashing', 'Slashing'], ['stabbing', 'Stabbing'], ['unarmed', 'Unarmed']
      ]]
    ]
  ];

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  // One labelled inventory slot (also used by the pet inventory and town storage in sheet.js).
  // The ⠿ handle at the top right moves the slot's contents to an empty slot (see js/items.js).
  function slot(id, name) {
    const wrap = el('div', 'inv-slot');
    const head = el('div', 'inv-slot-head');
    const label = el('label', 'inv-slot-label', name);
    label.htmlFor = id;
    const handle = el('span', 'slot-move', '⠿');
    handle.setAttribute('role', 'button');
    handle.tabIndex = 0;
    handle.draggable = true;
    handle.title = 'Move to an empty slot';
    handle.setAttribute('aria-label', 'Move ' + name + ' to an empty slot');
    head.append(label, handle);
    const box = el('textarea');
    box.id = id;
    box.placeholder = ' '; // lets CSS tell empty slots apart (:placeholder-shown)
    wrap.append(head, box);
    return wrap;
  }
  function fillSlots(container, list) {
    list.forEach(entry => container.append(entry ? slot(entry[0], entry[1]) : el('div')));
  }

  function expertiseColumn(groups) {
    const col = el('div');
    groups.forEach(([groupName, skills]) => {
      const group = el('div', 'expertise-group');
      group.append(el('div', 'expertise-group-label', groupName));
      skills.forEach(([key, name]) => {
        const row = el('div', 'expertise-row');
        const label = el('label', 'expertise-label', name);
        label.htmlFor = 'exp-' + key;
        const box = el('input');
        box.type = 'checkbox';
        box.id = 'exp-' + key;
        row.append(label, box);
        group.append(row);
      });
      col.append(group);
    });
    return col;
  }

  fillSlots($('inv-worn'), WORN);
  fillSlots($('inv-pack'), PACK);
  EXPERTISES.forEach(groups => $('expertise-columns').append(expertiseColumn(groups)));

  window.CrowsFields = { slot };
})();
