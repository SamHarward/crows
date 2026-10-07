// Builds the repeated parts of the sheets: inventory slots and expertise rows.
//
// IMPORTANT: each field's id is how saved crows and exported files find their data.
// Never change an existing id here. To rename one, change it here AND add the
// old → new pair to FIELD_RENAMES in sheet.js so existing saves are carried over.
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
    ['inv-bp-1', 'Backpack 1'], ['inv-bp-2', 'Backpack 2'], ['inv-bp-3', 'Backpack 3'], ['inv-bp-4', 'Backpack 4'], ['inv-bp-5', 'Backpack 5'],
    ['inv-bp-6', 'Backpack 6'], ['inv-bp-7', 'Backpack 7'], ['inv-bp-8', 'Backpack 8'], ['inv-bp-9', 'Backpack 9'], ['inv-bp-10', 'Backpack 10']
  ];

  // ── Expertises: two columns of groups. Each skill gets exp-<key>-cur and exp-<key>-max. ──
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

  // One labelled inventory slot (also used by the pet inventory and town storage in sheet.js)
  function slot(id, name) {
    const wrap = el('div', 'inv-slot');
    const label = el('label', 'inv-slot-label', name);
    label.htmlFor = id;
    const box = el('textarea');
    box.id = id;
    wrap.append(label, box);
    return wrap;
  }
  function fillSlots(container, list) {
    list.forEach(entry => container.append(entry ? slot(entry[0], entry[1]) : el('div')));
  }

  function numberInput(id, ariaLabel) {
    const input = el('input');
    input.type = 'number';
    input.id = id;
    input.min = '0';
    input.placeholder = '—';
    input.setAttribute('aria-label', ariaLabel);
    return input;
  }
  function expertiseColumn(groups) {
    const col = el('div');
    const header = el('div', 'expertise-col-header');
    header.append(el('span', '', 'Skill'), el('span', '', 'Cur'), el('span', '', 'Max'));
    col.append(header);
    groups.forEach(([groupName, skills]) => {
      const group = el('div', 'expertise-group');
      group.append(el('div', 'expertise-group-label', groupName));
      skills.forEach(([key, name]) => {
        const row = el('div', 'expertise-row');
        const label = el('label', 'expertise-label', name);
        label.htmlFor = 'exp-' + key + '-cur';
        row.append(label,
          numberInput('exp-' + key + '-cur', name + ' current'),
          numberInput('exp-' + key + '-max', name + ' max'));
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
