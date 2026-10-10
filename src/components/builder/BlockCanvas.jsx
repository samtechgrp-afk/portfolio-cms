import { createContext, useContext, useState } from 'react';
import './page.css';
import './builder.css';
import { BlockView, getSlots, getWidget } from './WidgetRegistry.jsx';
import { Icon } from './icons.jsx';
import { countNested } from './blockTree.js';
import { parseFontUrls, typographyStyle, useFontLinks } from '../typography.js';
import ConfirmDialog from '../../cms/components/ConfirmDialog.jsx';

const CanvasContext = createContext(null);

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
  return (
    <div className="bb-list">
      {list.map((b, i) => <BlockItem key={b.id} block={b} index={i} count={list.length} />)}
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
      className={`bb-item ${selected ? 'is-selected' : ''}`}
      data-block-id={block.id} data-block-type={block.type}
      onClick={(e) => { e.stopPropagation(); c.onSelect(block.id); }}
    >
      <div className="bb-item__bar" role="toolbar" aria-label={`${name} block controls`}>
        <span className="bb-item__name">{w && <Icon name={w.icon} size={14} />}{name}</span>
        <span className="bb-item__btns">
          <IconBtn icon="arrow-up" label={`Move ${name} up`} disabled={index === 0} onClick={() => c.onMove(block.id, -1)} />
          <IconBtn icon="arrow-down" label={`Move ${name} down`} disabled={index === count - 1} onClick={() => c.onMove(block.id, 1)} />
          <IconBtn icon="copy" label={`Duplicate ${name}`} onClick={() => c.onDuplicate(block.id)} />
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

export default function BlockCanvas({ blocks, typography, title, selectedId, onSelect, onAdd, onMove, onDuplicate, onDelete }) {
  const [pending, setPending] = useState(null);
  useFontLinks(parseFontUrls(typography?.fontUrl));

  const requestDelete = (block) => (countNested(block) > 0 ? setPending(block) : onDelete(block.id));
  const value = {
    selectedId, onSelect, onAdd, onMove, onDuplicate, onRequestDelete: requestDelete, ctx: { projectTitle: title },
  };

  return (
    <CanvasContext.Provider value={value}>
      <div className="pb-page pb-page--edit bb-canvas" style={typographyStyle(typography)} onClick={() => onSelect(null)}>
        <BlockList list={blocks} target={null} />
      </div>
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

