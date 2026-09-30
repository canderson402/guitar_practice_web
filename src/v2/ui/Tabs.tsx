import React from 'react';
import s from './Tabs.module.css';

export interface TabItem { id: string; label: React.ReactNode }

interface Props {
  label: string; items: TabItem[]; activeId: string; onSelect(id: string): void;
  renderItem?(item: TabItem, active: boolean, node: React.ReactNode): React.ReactNode;
  trailing?: React.ReactNode;
}

export const Tabs: React.FC<Props> = ({ label, items, activeId, onSelect, renderItem, trailing }) => {
  const idx = Math.max(0, items.findIndex(i => i.id === activeId));
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    onSelect(items[(idx + dir + items.length) % items.length].id);
  };
  return (
    <div className={s.bar}>
      <div role="tablist" aria-label={label} className={s.list} onKeyDown={onKeyDown}>
        {items.map(item => {
          const active = item.id === activeId;
          const node = (
            <button key={item.id} type="button" role="tab" aria-selected={active} tabIndex={active ? 0 : -1}
              className={[s.tab, active ? s.on : ''].join(' ')} onClick={() => onSelect(item.id)}>
              {item.label}
            </button>
          );
          return renderItem ? <React.Fragment key={item.id}>{renderItem(item, active, node)}</React.Fragment> : node;
        })}
      </div>
      {trailing}
    </div>
  );
};
