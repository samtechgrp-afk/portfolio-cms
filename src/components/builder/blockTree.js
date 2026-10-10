/* Pure helpers for the block tree. Blocks look like { id, type, props }.
   Container-style blocks keep nested blocks in props.slots[slotName] (an array of blocks). */

export const newBlockId = () => `blk_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

const slotsOf = (block) => block.props?.slots ?? null;

export function findBlock(blocks, id) {
  for (const b of blocks) {
    if (b.id === id) return b;
    const slots = slotsOf(b);
    if (slots) for (const list of Object.values(slots)) {
      const hit = findBlock(list, id);
      if (hit) return hit;
    }
  }
  return null;
}

/** Applies fn(list, index) to the list that directly contains block `id`. Returns a new tree. */
export function updateList(blocks, id, fn) {
  const index = blocks.findIndex((b) => b.id === id);
  if (index !== -1) return fn(blocks, index);
  let changed = false;
  const next = blocks.map((b) => {
    const slots = slotsOf(b);
    if (!slots) return b;
    const newSlots = {};
    for (const [name, list] of Object.entries(slots)) {
      const updated = updateList(list, id, fn);
      if (updated !== list) changed = true;
      newSlots[name] = updated;
    }
    return changed ? { ...b, props: { ...b.props, slots: newSlots } } : b;
  });
  return changed ? next : blocks;
}

export const patchProps = (blocks, id, patch) =>
  updateList(blocks, id, (list, i) => list.map((b, k) => (k === i ? { ...b, props: { ...b.props, ...patch } } : b)));

export const removeBlock = (blocks, id) => updateList(blocks, id, (list, i) => list.filter((_, k) => k !== i));

export const moveBlock = (blocks, id, dir) =>
  updateList(blocks, id, (list, i) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return list;
    const copy = [...list];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  });

export const insertAfter = (blocks, id, block) =>
  updateList(blocks, id, (list, i) => [...list.slice(0, i + 1), block, ...list.slice(i + 1)]);

/** target: null for the page root, or { parentId, slot }. */
export function insertBlock(blocks, target, block) {
  if (!target) return [...blocks, block];
  return updateList(blocks, target.parentId, (list, i) =>
    list.map((b, k) => {
      if (k !== i) return b;
      const slots = { ...(b.props.slots || {}) };
      slots[target.slot] = [...(slots[target.slot] || []), block];
      return { ...b, props: { ...b.props, slots } };
    })
  );
}

/** Deep copy with fresh ids, including nested blocks. */
export function cloneBlock(block) {
  const copy = JSON.parse(JSON.stringify(block));
  const reid = (b) => {
    b.id = newBlockId();
    if (b.props?.slots) Object.values(b.props.slots).forEach((list) => list.forEach(reid));
  };
  reid(copy);
  return copy;
}

export function countNested(block) {
  const slots = slotsOf(block);
  if (!slots) return 0;
  return Object.values(slots).reduce((n, list) => n + list.reduce((m, b) => m + 1 + countNested(b), 0), 0);
}

export function countBlocks(blocks) {
  return blocks.reduce((n, b) => n + 1 + countNested(b), 0);
}
