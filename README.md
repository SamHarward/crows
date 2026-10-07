# Crows

A character sheet for the Crows tabletop game. It's a plain website with no build step and nothing to install.

## Using it

Open `index.html` in a browser.

- **Crows / Pets**: pick an entry from a dropdown, or choose **+ New** and start typing to create one. The **×** next to each dropdown deletes the selected entry.
- **Town**: one shared page for everyone, with a Storage box that grows and shrinks in rows of 6.
- **Saving** is automatic, in the browser you're using. If the browser can't save (for example in a private window), a red banner tells you.
- **Export** downloads every crow, pet and the town as one `crows.json` file. **Load** merges a file back in. Export regularly; it's your backup, and it's how you move sheets to another computer or browser.

## Files

| File | What's in it |
|---|---|
| `index.html` | The page layout |
| `style.css` | All styling. Colours and font sizes are defined once at the top (`:root`) |
| `js/fields.js` | Builds the repeated fields: inventory slots and expertise rows |
| `js/sheet.js` | Saving, loading, export/import, switching between crows, pets and the town |

## The one rule: never change a field's `id`

Every box has an `id` (like `char-name` or `inv-bp-3`). Saved crows and exported files find their data by that id. You can freely move boxes, restyle them, or change the text people see. But if an id changes, existing saves can't find their data.

If you really need to rename one:

1. Change the id (in `index.html` or `js/fields.js`).
2. Add the old and new ids to `FIELD_RENAMES` at the top of `js/sheet.js`, e.g. `{ 'inv-bp-1': 'inv-backpack-1' }`.

Old saves and exports are then moved to the new id automatically when they load.

Adding new fields is always safe: older saves just leave them blank.

## Previewing while editing

Double-clicking `index.html` works fine. To preview it the way a website is served, run a local server from this folder:

```bash
python -m http.server 8123
```

Then open http://localhost:8123.
