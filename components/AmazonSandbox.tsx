'use client';
import { useState, type ReactNode } from 'react';
import { useStore } from '@/lib/store';
import type { Block, PageDoc } from '@/lib/types';
import { useSandboxControls } from './sandbox-controls';

export default function AmazonSandbox({ doc, render }: { doc: PageDoc; render: (b: Block) => ReactNode }) {
  const s = useStore(st => st.sandboxSessions.amazon)!;
  const products = useStore(st => st.library.products);
  const { control, act, node, running } = useSandboxControls(doc);
  const [department, setDepartment] = useState('All');
  const [sort, setSort] = useState('featured');
  const [menu, setMenu] = useState(false);
  const groups = Array.from(new Set(doc.blocks.map(b => b.group).filter((g): g is string => Boolean(g && g !== 'navigation'))));
  const home = s.view === 'home' && !s.query;
  const count = Object.values(s.cart).reduce((a, b) => a + b, 0);
  const visibleProducts = products.filter(p => groups.includes(`product-${p.id}`)).sort((a, b) => sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : 0);
  const search = (query: string) => { act('search', query); act('search-submit'); };
  const image = (id: string, alt: string, className = '') => <img className={className} src={`/sandbox/${id}.jpg`} alt={alt} onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />;
  return <div className="az-app">
    <header className="az-header"><button className="az-logo" aria-label="Amazon home" onClick={() => act('home')}>amazon<span>⌣</span></button><div className="az-delivery"><small>Deliver to</small><b>⌖ Demo City 10001</b></div>
      <form className="az-search" onSubmit={e => { e.preventDefault(); act('search-submit'); }}><select aria-label="Search department" value={department} onChange={e => { setDepartment(e.target.value); search(e.target.value === 'All' ? '' : e.target.value); }}><option>All</option><option>Organic</option><option>Fresh</option><option>Coffee</option></select><input {...node('search')} aria-label="Search products" placeholder="Search Amazon" value={s.query} disabled={running} onChange={e => act('search', e.target.value)} /><button {...node('search-submit')} aria-label="Search" disabled={running}>⌕</button></form>
      <span className="az-language">🇺🇸 EN</span><div className="az-account"><small>Hello, guest</small>{control('wishlist', 'Account & Lists ▾')}</div><div className="az-orders"><small>Returns</small>{control('orders', '& Orders')}</div>{control('cart', <><span className="az-cart-icon">🛒<b>{count}</b></span>Cart</>, 'az-cart')}
    </header>
    <nav className="az-subnav" aria-label="Shopping categories"><button onClick={() => setMenu(!menu)}>☰ All</button><button onClick={() => search('')}>Today’s picks</button><button onClick={() => search('organic')}>Organic groceries</button><button onClick={() => search('fresh')}>Fresh food</button><button onClick={() => search('coffee')}>Coffee & pantry</button>{control('orders', 'Your orders')}{control('wishlist', 'Your wishlist')}</nav>
    {menu && <div className="az-departments"><b>Shop by department</b>{['All', 'Fresh', 'Organic', 'Coffee', 'Bread', 'Avocados'].map(d => <button key={d} onClick={() => { search(d === 'All' ? '' : d); setMenu(false); }}>{d === 'All' ? 'Shop all groceries' : d}<span>›</span></button>)}</div>}
    {home && <div className="az-home-promos">
      <button className="az-promo az-promo-red" onClick={() => { setSort('low'); document.getElementById('az-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><small>Everyday essentials, extraordinary value</small><h1>Fresh finds<br />under $10</h1>{image('oranges', 'Fresh oranges')}<span>Stock up for the week →</span></button>
      <button className="az-promo az-promo-cream" onClick={() => search('coffee')}><small>Make your morning</small><h2>A little ritual.<br />A better day.</h2>{image('coffee', 'Ground coffee')}<span>Explore coffee & pantry →</span></button>
      <div className="az-promo az-promo-green"><h2>Good food.<br />Great prices.</h2><div className="az-promo-grid">{products.slice(0, 4).map(p => <button key={p.id} onClick={() => act(`product-${p.id}`)}>{image(p.id, p.name)}<span>{p.name}</span></button>)}</div></div>
      <button className="az-promo az-promo-tan" onClick={() => search('bread')}><small>Simple things, made better</small><h2>Bring a little<br />comfort home</h2>{image('bread', 'Freshly baked sourdough')}<span>Shop bakery favorites →</span></button>
    </div>}
    {home && <section className="az-buy-again"><h2>Inspired by your everyday</h2><div>{products.map(p => <button key={p.id} onClick={() => act(`product-${p.id}`)}><h3>{s.wishlist.includes(p.id) ? 'From your wishlist' : 'Picked for you'}</h3>{image(p.id, p.name)}<span>{p.name}</span></button>)}</div></section>}
    <main className={`az-main ${s.view === 'cart' ? 'az-cart-page' : ''}`} id="az-products">
      {doc.blocks.find(b => b.id === 'notice') && render(doc.blocks.find(b => b.id === 'notice')!)}
      <div className="az-main-heading">{render(doc.blocks.find(b => b.id === 'page-title')!)}{['home', 'wishlist'].includes(s.view) && <label>Sort by: <select aria-label="Sort products" value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: Low to High</option><option value="high">Price: High to Low</option></select></label>}</div>
      {s.query && <p className="az-results-count">{visibleProducts.length} results for <b>“{s.query}”</b></p>}
      {s.view === 'checkout' && <div className="az-checkout-steps"><span className={s.checkoutStage === 'shipping' ? 'active' : ''}>1 · Shipping</span><span className={s.checkoutStage === 'review' ? 'active' : ''}>2 · Review & demo payment</span><span className={s.checkoutStage === 'confirmation' ? 'active' : ''}>3 · Confirmation</span></div>}
      {doc.blocks.filter(b => !b.group && !['sandbox-label', 'page-title', 'notice', 'current-state', 'subtotal', 'checkout', 'save-language'].includes(b.id)).map(render)}
      {visibleProducts.length > 0 && <div className={`az-products ${s.view === 'cart' || s.view === 'product' ? 'az-products-list' : ''}`}>{visibleProducts.map((p, index) => <article className="az-product" key={p.id}>
        <div className="az-product-image">{s.view !== 'cart' && s.view !== 'product' ? <button aria-label={`View ${p.name.toLowerCase()}`} onClick={() => act(`product-${p.id}`)}>{image(p.id, p.name)}</button> : image(p.id, p.name)}{index === 0 && <span className="az-bestseller">Popular pick</span>}</div>
        <div className="az-product-info"><h2 {...node(`title-${p.id}`)}>{p.name}</h2><p className="az-stars">★★★★<span>★</span> <small>{[1248, 893, 2106, 746, 508, 931][index % 6]}</small></p><p {...node(`description-${p.id}`)} className={`az-product-description ${node(`description-${p.id}`).className || ''}`}>{p.description}</p><p {...node(`price-${p.id}`)} className={`az-price ${node(`price-${p.id}`).className || ''}`}><sup>$</sup>{Math.floor(p.price)}<sup>{(p.price % 1).toFixed(2).slice(2)}</sup></p><p className="az-prime">✓<b>prime</b> <span>FREE demo delivery</span></p><p className="az-stock">In Stock</p>
          {s.view === 'cart' && <p className="az-quantity">Quantity: <b>{s.cart[p.id]}</b></p>}
          <div className="az-product-actions">{doc.blocks.filter(b => b.group === `product-${p.id}` && b.control && !b.id.startsWith('product-')).map(render)}</div>
        </div>
      </article>)}</div>}
      {groups.filter(g => !g.startsWith('product-')).map(g => <section className="az-form-panel" key={g}>{doc.blocks.filter(b => b.group === g).map(render)}</section>)}
      {s.view === 'cart' && <aside className="az-cart-summary"><p className="az-stock">✓ Your order qualifies for FREE demo delivery.</p><h2>Subtotal ({count} {count === 1 ? 'item' : 'items'}): <b>${products.reduce((sum, p) => sum + p.price * (s.cart[p.id] || 0), 0).toFixed(2)}</b></h2><div className="sr-only">{doc.blocks.filter(b => b.id === 'subtotal').map(render)}</div>{doc.blocks.filter(b => b.id === 'checkout').map(render)}</aside>}
      <div {...node('current-state')} className="sr-only">{doc.blocks.find(b => b.id === 'current-state')?.text}</div>
    </main>
    <footer className="az-footer"><button onClick={() => act('home')}>Back to shopping</button><b>amazon<span>⌣</span></b><p>Local shopping sandbox · Sample products and simulated payments only.<br />No real orders, personal accounts, or charges.</p></footer>
  </div>;
}
