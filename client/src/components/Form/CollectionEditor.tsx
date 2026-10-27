import { useId } from 'react';
import { newId } from '../../types';
import { useFormCopy, type FieldKey } from '../../i18n/forms';
interface Props<T extends { id: string }> {
  items: T[]; onChange: (items: T[]) => void; fields: Array<{ key: Exclude<keyof T, 'id'> & FieldKey; wide?: boolean; multiline?: boolean }>;
  title: string; limit: number;
}
export function CollectionEditor<T extends { id: string }>({ items, onChange, fields, title, limit }: Props<T>) {
  const c = useFormCopy(); const prefix = useId();
  const add = () => onChange([...items, Object.fromEntries([['id',newId()], ...fields.map(f => [f.key,''])]) as T]);
  const update = (id:string, key:keyof T, value:string) => onChange(items.map(it => it.id === id ? {...it,[key]:value} : it));
  const move = (index:number, offset:number) => { const next=[...items]; [next[index],next[index+offset]]=[next[index+offset],next[index]]; onChange(next); };
  return <div className="collection-list">{items.map((it,index) => <section key={it.id} className="collection-card"><div className="collection-toolbar"><h3>{title} {index+1}</h3><div>
    <button className="icon-button" aria-label={c.up} title={c.up} disabled={index===0} onClick={() => move(index,-1)}>↑</button><button className="icon-button" aria-label={c.down} title={c.down} disabled={index===items.length-1} onClick={() => move(index,1)}>↓</button><button className="icon-button" aria-label={c.remove} title={c.remove} onClick={() => onChange(items.filter(row=>row.id!==it.id))}>×</button>
    </div></div><div className="collection-fields">{fields.map(f => { const id=`${prefix}-${it.id}-${f.key}`; return <div key={f.key} className={f.wide ? 'wide' : ''}><label className="label" htmlFor={id}>{c[f.key]}</label>{f.multiline ? <textarea id={id} className="field" rows={4} maxLength={4096} value={String(it[f.key])} onChange={e=>update(it.id,f.key,e.target.value)} /> : <input id={id} className="field" maxLength={4096} value={String(it[f.key])} onChange={e=>update(it.id,f.key,e.target.value)} />}</div>; })}</div></section>)}<button className="btn-ghost collection-add" disabled={items.length>=limit} onClick={add}>+ {c.add} · {title}</button></div>;
}
