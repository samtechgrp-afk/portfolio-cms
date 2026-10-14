import { Fragment, createContext, useContext, useMemo, useState } from 'react';
import './page.css';
import './builder.css';
import { BlockView, getSlots, getWidget } from './WidgetRegistry.jsx';
import { Icon } from './icons.jsx';
import { countNested } from './blockTree.js';
import { typographyStyle, useTypographyAssets } from '../typography.js';
import ConfirmDialog from '../../cms/components/ConfirmDialog.jsx';
import { InlineEditContext } from './inlineEdit.jsx';

const CanvasContext = createContext(null);
const listKey = (target) => (target ? `${target.parentId}:${target.slot}` : 'root');

/** Index at which a dragged block would land in a list, from the pointer's vertical position. */
function indexFromPoint(listEl, y) {
  const items = [...listEl.children].filter((el) => el.classList.contains('bb-item'));
  for (let i = 0; i < items.length; i += 1) {
    const r = items[i].getBoundingClientRect();
    if (y < r.top + r.height / 2) return i;
  }
  return items.length;
}

function IconBtn({ icon, label, onClick, disabled, danger }) {
  return (
    <button
      type="button" className={`bb-iconbtn ${danger ? 'is-danger' : ''}`} aria-label={label} title={label} disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

function BlockList({ list, target }) {
  const c = useContext(CanvasContext);
  const key = listKey(target);
  const over = (e) => {
    if (!c.dragId) return;
    e.preventDefault();
    e.stopPropagation(); // the innermost list under the pointer decides
    e.dataTransfer.dropEffect = 'move';
    const index = indexFromPoint(e.currentTarget, e.clientY);
    if (c.drop?.key !== key || c.drop.index !== index) c.setDrop({ key, index });
  };
  const drop = (e) => {
    if (!c.dragId) return;
    e.preventDefault();
    e.stopPropagation();
    c.onDropBlock(c.dragId, target, indexFromPoint(e.currentTarget, e.clientY));
    c.endDrag();
  };
  const line = (index) => c.drop?.key === key && c.drop.index === index && <div className="bb-dropline" aria-hidden="true" />;
  return (
    <div className="bb-list" onDragOver={over} onDrop={drop}>
      {list.map((b, i) => <Fragment key={b.id}>{line(i)}<BlockItem block={b} index={i} count={list.length} /></Fragment>)}
      {line(list.length)}
      <button type="button" className={`bb-add ${list.length ? '' : 'is-empty'}`} onClick={(e) => { e.stopPropagation(); c.onAdd(target); }}>
        <Icon name="plus" size={16} />
        {list.length ? 'Add block' : target ? 'Add a block here' : 'Add your first block'}
      </button>
    </div>
  );
}

function BlockItem({ block, index, count }) {
  const c = useContext(CanvasContext);
  const w = getWidget(block.type);
  const selected = c.selectedId === block.id;
  const slotLabels = Object.fromEntries(getSlots(block).map((s) => [s.name, s.label]));
  const name = w?.label ?? block.type;

  const slot = (slotName) => (
    <div className="bb-slot">
      <span className="bb-slot__label">{slotLabels[slotName] || slotName}</span>
      <BlockList list={block.props?.slots?.[slotName] || []} target={{ parentId: block.id, slot: slotName }} />
    </div>
  );

  return (
    <div
      className={`bb-item ${selected ? 'is-selected' : ''} ${block.hidden ? 'is-hidden' : ''} ${c.dragId === block.id ? 'is-dragging' : ''}`}
      data-block-id={block.id} data-block-type={block.type}
      onClick={(e) => { e.stopPropagation(); c.onSelect(block.id); }}
    >
      <div className="bb-item__bar" role="toolbar" aria-label={`${name} block controls`}>
        <span className="bb-item__name">
          {/* A plain element, not a <button>: Firefox will not start a drag from a button. Keyboard users have the move buttons. */}
          <span
            className="bb-grip" draggable="true" aria-hidden="true" title="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', block.id);
              e.dataTransfer.setDragImage(e.currentTarget.closest('.bb-item'), 16, 16);
              setTimeout(() => c.startDrag(block.id), 0);
            }}
            onDragEnd={c.endDrag}
          ><Icon name="grip" size={16} /></span>
          {w && <Icon name={w.icon} size={14} />}{name}{block.hidden && <em className="bb-hiddenbadge">Hidden</em>}
        </span>
        <span className="bb-item__btns">
          <IconBtn icon="arrow-up" label={`Move ${name} up`} disabled={index === 0} onClick={() => c.onMove(block.id, -1)} />
          <IconBtn icon="arrow-down" label={`Move ${name} down`} disabled={index === count - 1} onClick={() => c.onMove(block.id, 1)} />
          <IconBtn icon="copy" label={`Duplicate ${name}`} onClick={() => c.onDuplicate(block.id)} />
          <IconBtn icon={block.hidden ? 'eye-off' : 'eye'} label={block.hidden ? `Show ${name}` : `Hide ${name}`} onClick={() => c.onToggleHidden(block.id)} />
          <IconBtn icon="edit" label={`Edit ${name} properties`} onClick={() => c.onSelect(block.id)} />
          <IconBtn icon="trash" label={`Delete ${name}`} danger onClick={() => c.onRequestDelete(block)} />
        </span>
      </div>
      <div className="bb-item__preview">
        <BlockView block={block} editing slot={slot} ctx={c.ctx} />
      </div>
    </div>
  );
}

export default function BlockCanvas({ blocks, typography, title, fonts = [], projects = [], selectedId, onSelect, onAdd, onMove, onDuplicate, onToggleHidden, onDropBlock, onDelete, onPatch }) {
  const [pending, setPending] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [drop, setDrop] = useState(null);
  useTypographyAssets(typography, { fonts, blocks });

  const requestDelete = (block) => (countNested(block) > 0 ? setPending(block) : onDelete(block.id));
  const inline = useMemo(() => (onPatch ? { patch: onPatch } : null), [onPatch]);
  const endDrag = () => { setDragId(null); setDrop(null); };
  const value = {
    selectedId, onSelect, onAdd, onMove, onDuplicate, onToggleHidden, onRequestDelete: requestDelete, ctx: { projectTitle: title, projects },
    dragId, drop, setDrop, startDrag: setDragId, endDrag, onDropBlock,
  };

  return (
    <CanvasContext.Provider value={value}>
      <InlineEditContext.Provider value={inline}>
      <div
        className="pb-page pb-page--edit bb-canvas" style={typographyStyle(typography)} onClick={() => onSelect(null)}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDrop(null); }}
      >
        <BlockList list={blocks} target={null} />
      </div>
      </InlineEditContext.Provider>
      <ConfirmDialog
        open={!!pending}
        title="Delete this block?"
        message={pending ? `This ${getWidget(pending.type)?.label ?? 'block'} contains ${countNested(pending)} other ${countNested(pending) === 1 ? 'block' : 'blocks'}, which will be deleted too.` : ''}
        onCancel={() => setPending(null)}
        onConfirm={() => { onDelete(pending.id); setPending(null); }}
      />
    </CanvasContext.Provider>
  );
}

