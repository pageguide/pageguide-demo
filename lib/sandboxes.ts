import type { Block, PageDoc } from './types';
import type { Answer, Comment, Library, Post } from './library';

export type SandboxSite = 'amazon' | 'quora';
export interface DemoOrder { id: string; items: Record<string, number>; total: number; payment: string; status: 'paid' | 'cancelled' }
export interface SandboxState {
  site: SandboxSite;
  view: 'home' | 'cart' | 'product' | 'settings' | 'post' | 'checkout' | 'orders' | 'wishlist' | 'ask' | 'bookmarks';
  query: string; selected: string; cart: Record<string, number>; wishlist: string[];
  language: string; draftLanguage: string; liked: string[]; notice: string; revision: number;
  shipping: Record<'name' | 'address' | 'city' | 'postcode', string>;
  checkoutStage: 'shipping' | 'review' | 'confirmation'; payment: 'Demo card •••• 4242' | 'Demo wallet'; orders: DemoOrder[];
  userPosts: Post[]; addedAnswers: Record<string, Answer[]>; addedComments: Record<string, Comment[]>;
  answerDraft: string; commentDrafts: Record<string, string>; questionDraft: { title: string; body: string; topic: string };
  answerVotes: string[]; followedTopics: string[]; bookmarks: string[];
}
export interface BrowserAction { type: string; id?: string; url?: string; value?: string }
export const LANGUAGES = ['English', 'Spanish', 'French', 'Vietnamese'];
export const sandboxUrl = (site: SandboxSite) => `https://${site}.pageguide.test/`;
export function sandboxSite(url: string): SandboxSite | null {
  try { const u = new URL(url); return (['amazon', 'quora'] as const).find((site) => u.origin === new URL(sandboxUrl(site)).origin) || null; } catch { return null; }
}
export function initialSandbox(site: SandboxSite): SandboxState {
  return { site, view: 'home', query: '', selected: '', cart: {}, wishlist: [], language: 'English', draftLanguage: 'English', liked: [], notice: '', revision: 0,
    shipping: { name: '', address: '', city: '', postcode: '' }, checkoutStage: 'shipping', payment: 'Demo card •••• 4242', orders: [],
    userPosts: [], addedAnswers: {}, addedComments: {}, answerDraft: '', commentDrafts: {}, questionDraft: { title: '', body: '', topic: 'Everyday life' },
    answerVotes: [], followedTopics: [], bookmarks: [],
  };
}
export const allPosts = (s: SandboxState, lib: Library): Post[] => [...s.userPosts, ...lib.posts];
const answersFor = (s: SandboxState, p: Post): Answer[] => [...(p.answers || []), ...(s.addedAnswers[p.id] || [])];
const shippingValid = (s: SandboxState) => Object.values(s.shipping).every((v) => v.trim().length >= 2);
const itemCount = (s: SandboxState) => Object.values(s.cart).reduce((a, b) => a + b, 0);
const total = (s: SandboxState, lib: Library) => Math.round(lib.products.reduce((sum, p) => sum + p.price * (s.cart[p.id] || 0), 0) * 100) / 100;
export function stateUrl(s: SandboxState): string {
  const path = s.view === 'home' ? '' : s.view === 'product' || s.view === 'post' ? `${s.view}/${s.selected}` : s.view;
  const params = new URLSearchParams();
  if (s.query) params.set('q', s.query);
  if (s.view === 'checkout') params.set('stage', s.checkoutStage);
  return `${sandboxUrl(s.site)}${path}${params.size ? `?${params}` : ''}`;
}
export function routeSandbox(s: SandboxState, url: string, lib: Library): SandboxState {
  const u = new URL(url), [path, selected = ''] = u.pathname.split('/').filter(Boolean);
  const allowed = s.site === 'amazon' ? ['cart', 'checkout', 'orders', 'wishlist'] : ['settings', 'ask', 'bookmarks'];
  const view = allowed.includes(path) ? path as SandboxState['view']
    : path === 'product' && s.site === 'amazon' && lib.products.some((p) => p.id === selected) ? 'product'
    : path === 'post' && s.site === 'quora' && allPosts(s, lib).some((p) => p.id === selected) ? 'post' : 'home';
  const stage = u.searchParams.get('stage');
  const checkoutStage = stage === 'confirmation' && s.orders.length ? 'confirmation' : stage === 'review' && shippingValid(s) ? 'review' : 'shipping';
  return { ...s, view, selected, checkoutStage, query: (u.searchParams.get('q') || '').slice(0, 200), notice: '', revision: s.revision + 1 };
}
const heading = (id: string, text: string, group?: string): Block => ({ id, type: 'heading', text, level: group ? 2 : 1, group });
const paragraph = (id: string, text: string, group?: string): Block => ({ id, type: 'paragraph', text, group });
const button = (id: string, text: string, group?: string): Block => ({ id, type: 'button', text, control: true, group });
const input = (id: string, text: string, value: string, group?: string, multiline = false): Block => ({ id, type: 'input', text, value, control: true, group, multiline });
const toggle = (items: string[], id: string) => items.includes(id) ? items.filter((x) => x !== id) : [...items, id];
const topicId = (topic: string) => topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export function sandboxDoc(s: SandboxState, lib: Library): PageDoc {
  const amazon = s.site === 'amazon', posts = allPosts(s, lib);
  const blocks: Block[] = [
    paragraph('sandbox-label', `${amazon ? 'Amazon-style market' : 'Quora-style community'} · fictional isolated demo. No real accounts, purchases, or payments.`),
    button('home', amazon ? 'Shop all' : 'Home feed', 'navigation'),
    button(amazon ? 'cart' : 'settings', amazon ? `Cart (${itemCount(s)})` : 'Settings', 'navigation'),
    ...(amazon ? [button('orders', 'Your orders', 'navigation'), button('wishlist', `Wishlist (${s.wishlist.length})`, 'navigation')] : [button('ask-question', 'Ask a question', 'navigation'), button('bookmarks', 'Saved posts', 'navigation')]),
    input('search', amazon ? 'Search products' : 'Search posts', s.query, 'navigation'), button('search-submit', 'Search', 'navigation'),
    paragraph('current-state', `View: ${s.view}. ${amazon ? `Cart contents: ${Object.entries(s.cart).filter(([, n]) => n > 0).map(([id, n]) => `${id}: ${n}`).join(', ') || 'empty'}. Paid orders: ${s.orders.filter((o) => o.status === 'paid').length}.` : `Saved language: ${s.language}. Opened post: ${s.view === 'post' ? s.selected : 'none'}. Followed topics: ${s.followedTopics.join(', ') || 'none'}.`} Search: ${s.query || '(empty)'}.`),
  ];
  if (s.notice) blocks.push(paragraph('notice', s.notice));
  if (amazon && s.view === 'checkout') {
    blocks.push(heading('page-title', s.checkoutStage === 'confirmation' ? 'Order confirmed' : 'Secure demo checkout'), paragraph('payment-warning', 'Simulation only. Use the sample address and demo payment methods. Never enter real payment details.'));
    if (s.checkoutStage === 'confirmation') {
      const order = s.orders[s.orders.length - 1];
      blocks.push(paragraph('order-confirmation', order ? `Order ${order.id} · ${order.status === 'paid' ? 'Demo payment approved' : 'Cancelled'} · $${order.total.toFixed(2)} · ${order.payment}. No real money was charged.` : 'No order has been placed.'), button('orders', 'View all orders'));
    } else if (!itemCount(s)) blocks.push(paragraph('empty', 'Add an item to your cart before checking out.'), button('home', 'Continue shopping'));
    else if (s.checkoutStage === 'shipping') {
      blocks.push(button('use-demo-address', 'Use sample address', 'shipping'));
      for (const [key, label] of Object.entries({ name: 'Recipient name', address: 'Street address', city: 'City', postcode: 'Postal code' })) blocks.push(input(`shipping-${key}`, label, s.shipping[key as keyof typeof s.shipping], 'shipping'));
      blocks.push(button('review-order', 'Continue to order review', 'shipping'));
    } else {
      blocks.push(paragraph('shipping-summary', `Deliver to ${s.shipping.name}, ${s.shipping.address}, ${s.shipping.city}, ${s.shipping.postcode}.`, 'review'));
      for (const p of lib.products.filter((p) => s.cart[p.id] > 0)) blocks.push(paragraph(`review-${p.id}`, `${p.name} · Quantity ${s.cart[p.id]} · $${(p.price * s.cart[p.id]).toFixed(2)}`, 'review'));
      blocks.push(paragraph('order-total', `Order total: $${total(s, lib).toFixed(2)} · Free demo delivery · No additional demo fees.`, 'review'),
        paragraph('payment-current', `Selected payment: ${s.payment}.`, 'review'), button('payment-card', 'Use demo card ending 4242', 'review'), button('payment-wallet', 'Use demo wallet', 'review'),
        button('edit-shipping', 'Edit shipping address', 'review'), button('pay-demo', `Pay $${total(s, lib).toFixed(2)} with demo payment`, 'review'));
    }
  } else if (amazon && s.view === 'orders') {
    blocks.push(heading('page-title', 'Your demo orders'));
    if (!s.orders.length) blocks.push(paragraph('empty', 'You have not placed any demo orders yet.'));
    for (const order of [...s.orders].reverse()) {
      const group = `order-${order.id}`;
      blocks.push(heading(`order-title-${order.id}`, order.id, group), paragraph(`order-status-${order.id}`, `${order.status === 'paid' ? 'Paid · preparing for demo delivery' : 'Cancelled · demo refund recorded'} · Total $${order.total.toFixed(2)} · ${order.payment}`, group));
      for (const [id, quantity] of Object.entries(order.items)) if (quantity > 0) blocks.push(paragraph(`order-item-${order.id}-${id}`, `${lib.products.find((p) => p.id === id)?.name || id} · Quantity ${quantity}`, group));
      if (order.status === 'paid') blocks.push(button(`cancel-${order.id}`, `Cancel demo order ${order.id}`, group));
    }
  } else if (amazon) {
    blocks.push(heading('page-title', s.view === 'cart' ? 'Your shopping cart' : s.view === 'product' ? 'Product details' : s.view === 'wishlist' ? 'Your wishlist' : 'Fresh picks for your day'));
    const products = lib.products.filter((p) => s.view === 'cart' ? (s.cart[p.id] || 0) > 0 : s.view === 'product' ? p.id === s.selected : s.view === 'wishlist' ? s.wishlist.includes(p.id) : `${p.name} ${p.description}`.toLowerCase().includes(s.query.toLowerCase()));
    for (const p of products) {
      const group = `product-${p.id}`;
      blocks.push(heading(`title-${p.id}`, `${p.emoji} ${p.name}`, group), paragraph(`description-${p.id}`, p.description, group), paragraph(`price-${p.id}`, `$${p.price.toFixed(2)}${s.view === 'cart' ? ` · Quantity: ${s.cart[p.id]}` : ''}`, group));
      if (s.view !== 'cart') blocks.push(button(`add-${p.id}`, `Add ${p.name.toLowerCase()} to cart`, group), button(`wish-${p.id}`, `${s.wishlist.includes(p.id) ? 'Remove from' : 'Save to'} wishlist: ${p.name}`, group));
      if (s.view === 'home' || s.view === 'wishlist') blocks.push(button(`product-${p.id}`, `View ${p.name.toLowerCase()}`, group));
      if (s.view === 'cart') blocks.push(button(`increase-${p.id}`, `Increase ${p.name.toLowerCase()} quantity`, group), button(`decrease-${p.id}`, `Decrease ${p.name.toLowerCase()} quantity`, group), button(`remove-${p.id}`, `Remove ${p.name.toLowerCase()}`, group));
    }
    if (!products.length) blocks.push(paragraph('empty', s.view === 'cart' ? 'Your cart is empty.' : s.view === 'wishlist' ? 'Your wishlist is empty.' : 'No products match your search.'));
    if (s.view === 'cart') { blocks.push(paragraph('subtotal', `Subtotal: $${total(s, lib).toFixed(2)}`)); if (itemCount(s)) blocks.push(button('checkout', 'Proceed to demo checkout')); }
  } else if (s.view === 'settings') {
    blocks.push(heading('page-title', 'Language settings'), paragraph('language-current', `Your saved language is ${s.language}. Select a language, then save your settings.`));
    for (const language of LANGUAGES) blocks.push(button(`language-${language.toLowerCase()}`, `${language}${s.draftLanguage === language ? ' (selected)' : ''}`, 'languages'));
    blocks.push(button('save-language', 'Save language settings'));
  } else if (s.view === 'ask') {
    blocks.push(heading('page-title', 'Ask the community'), paragraph('fiction-note', 'All questions, answers, and profiles are fictional demo content.'),
      input('question-title', 'Question title', s.questionDraft.title, 'question-form'), input('question-topic', 'Question topic', s.questionDraft.topic, 'question-form'),
      input('question-body', 'Question details', s.questionDraft.body, 'question-form', true), button('post-question', 'Publish demo question', 'question-form'));
  } else {
    blocks.push(heading('page-title', s.view === 'post' ? 'Community discussion' : s.view === 'bookmarks' ? 'Your saved posts' : 'Questions worth exploring'));
    const visible = posts.filter((p) => s.view === 'post' ? p.id === s.selected : s.view === 'bookmarks' ? s.bookmarks.includes(p.id) : `${p.title} ${p.topic} ${p.body}`.toLowerCase().includes(s.query.toLowerCase()));
    for (const p of visible) {
      const group = `post-${p.id}`, answers = answersFor(s, p);
      blocks.push(heading(`title-${p.id}`, p.title, group), paragraph(`author-${p.id}`, `${p.author} · ${p.topic} · ${answers.length} answers`, group), paragraph(`body-${p.id}`, s.view === 'post' ? p.body : `${p.body.slice(0, 100)}…`, group));
      if (s.view !== 'post') blocks.push(button(`post-${p.id}`, `Read post: ${p.title}`, group));
      else {
        blocks.push(button(`upvote-${p.id}`, `Upvote${s.liked.includes(p.id) ? ' (saved)' : ''}`, group), button(`bookmark-${p.id}`, `${s.bookmarks.includes(p.id) ? 'Unsave' : 'Save'} this post`, group));
        for (const a of answers) {
          const ag = `answer-${a.id}`;
          blocks.push(heading(`answer-author-${a.id}`, a.author, ag), paragraph(`answer-credential-${a.id}`, a.credential, ag), paragraph(`answer-text-${a.id}`, a.text, ag),
            button(`vote-answer-${a.id}`, `Upvote answer by ${a.author} (${a.votes + (s.answerVotes.includes(a.id) ? 1 : 0)})`, ag));
          for (const c of [...a.comments, ...(s.addedComments[a.id] || [])]) blocks.push(paragraph(`comment-${c.id}`, `${c.author}: ${c.text}`, ag));
          blocks.push(input(`comment-input-${a.id}`, `Comment on ${a.author}'s answer`, s.commentDrafts[a.id] || '', ag), button(`submit-comment-${a.id}`, `Post comment on ${a.author}'s answer`, ag));
        }
        blocks.push(input('answer-draft', 'Write your answer', s.answerDraft, 'your-answer', true), button('submit-answer', 'Publish demo answer', 'your-answer'));
      }
    }
    if (!visible.length) blocks.push(paragraph('empty', s.view === 'bookmarks' ? 'No saved posts yet.' : 'No posts match your search. Try gardening, programming, cooking, or travel.'));
    if (s.view !== 'post') for (const topic of [...new Set(posts.map((p) => p.topic))]) blocks.push(button(`topic-${topicId(topic)}`, `Browse ${topic}`, 'topics'), button(`follow-${topicId(topic)}`, `${s.followedTopics.includes(topic) ? 'Unfollow' : 'Follow'} ${topic}`, 'topics'));
  }
  return { url: stateUrl(s), title: `${amazon ? 'Amazon' : 'Quora'} sandbox`, siteName: amazon ? 'Amazon-style demo' : 'Quora-style demo', sandbox: s.site, blocks };
}

/** User clicks and agent actions have identical validation and state transitions. */
export function applySandboxAction(s: SandboxState, action: BrowserAction, lib: Library): { state: SandboxState; observation: string } {
  const target = sandboxDoc(s, lib).blocks.find((b) => b.id === action.id && b.control);
  if (!target || !['click', 'fill'].includes(action.type)) throw new Error('That control is not available on this page.');
  const n: SandboxState = { ...s, cart: { ...s.cart }, shipping: { ...s.shipping }, questionDraft: { ...s.questionDraft }, commentDrafts: { ...s.commentDrafts },
    addedAnswers: { ...s.addedAnswers }, addedComments: { ...s.addedComments }, notice: '', revision: s.revision + 1 };
  const id = target.id;
  if (action.type === 'fill') {
    if (target.type !== 'input') throw new Error('Only input fields can be filled.');
    const value = (action.value || '').slice(0, target.multiline ? 2000 : 300);
    if (id === 'search') n.query = value.slice(0, 200);
    else if (id.startsWith('shipping-')) n.shipping[id.slice(9) as keyof typeof n.shipping] = value;
    else if (id.startsWith('question-')) n.questionDraft[id.slice(9) as keyof typeof n.questionDraft] = value;
    else if (id === 'answer-draft') n.answerDraft = value;
    else if (id.startsWith('comment-input-')) n.commentDrafts[id.slice(14)] = value;
  } else {
    if (target.type !== 'button') throw new Error('That target is not a clickable button.');
    if (id === 'home') { n.view = 'home'; n.query = ''; n.selected = ''; }
    else if (['cart', 'orders', 'wishlist', 'bookmarks'].includes(id)) n.view = id as SandboxState['view'];
    else if (id === 'settings') { n.view = 'settings'; n.draftLanguage = s.language; }
    else if (id === 'ask-question') n.view = 'ask';
    else if (id === 'search-submit') { n.view = 'home'; n.notice = `Search results for “${n.query || 'all'}”.`; }
    else if (id === 'checkout') { n.view = 'checkout'; n.checkoutStage = 'shipping'; }
    else if (id === 'use-demo-address') n.shipping = { name: 'Alex Demo', address: '123 Example Lane', city: 'Demo City', postcode: '10001' };
    else if (id === 'review-order') { if (!shippingValid(n)) n.notice = 'Enter a name, street address, city, and postal code, or use the sample address.'; else n.checkoutStage = 'review'; }
    else if (id === 'edit-shipping') n.checkoutStage = 'shipping';
    else if (id === 'payment-card') n.payment = 'Demo card •••• 4242';
    else if (id === 'payment-wallet') n.payment = 'Demo wallet';
    else if (id === 'pay-demo') {
      if (!itemCount(n) || !shippingValid(n) || n.checkoutStage !== 'review') throw new Error('A non-empty cart and reviewed shipping address are required.');
      const order: DemoOrder = { id: `DEMO-${String(s.orders.length + 1).padStart(3, '0')}`, items: { ...n.cart }, total: total(n, lib), payment: n.payment, status: 'paid' };
      n.orders = [...s.orders, order]; n.cart = {}; n.checkoutStage = 'confirmation'; n.notice = `Demo payment approved. Order ${order.id} confirmed. No real money was charged.`;
    } else if (id.startsWith('cancel-')) { n.orders = s.orders.map((o) => o.id === id.slice(7) ? { ...o, status: 'cancelled' } : o); n.notice = 'Order cancelled and demo refund recorded. No real payment was involved.'; }
    else if (id.startsWith('language-')) n.draftLanguage = LANGUAGES.find((l) => id === `language-${l.toLowerCase()}`)!;
    else if (id === 'save-language') { n.language = n.draftLanguage; n.notice = `Language saved: ${n.language}.`; }
    else if (id === 'post-question') {
      if (n.questionDraft.title.trim().length < 8 || n.questionDraft.body.trim().length < 10 || !n.questionDraft.topic.trim()) n.notice = 'Add a question title (8+ characters), details (10+ characters), and a topic.';
      else { const post: Post = { id: `user-question-${n.revision}`, title: n.questionDraft.title.trim(), body: n.questionDraft.body.trim(), topic: n.questionDraft.topic.trim(), author: 'You (demo)', answers: [] }; n.userPosts = [post, ...s.userPosts]; n.selected = post.id; n.view = 'post'; n.questionDraft = { title: '', body: '', topic: 'Everyday life' }; n.notice = 'Your demo question was published.'; }
    } else if (id === 'submit-answer') {
      if (n.answerDraft.trim().length < 10) n.notice = 'Write at least 10 characters before publishing your answer.';
      else { const answer: Answer = { id: `user-answer-${n.revision}`, author: 'You (demo)', credential: 'Demo community member', votes: 0, text: n.answerDraft.trim(), comments: [] }; n.addedAnswers[s.selected] = [...(s.addedAnswers[s.selected] || []), answer]; n.answerDraft = ''; n.notice = 'Your demo answer was published.'; }
    } else if (id.startsWith('submit-comment-')) {
      const answer = id.slice(15), text = (n.commentDrafts[answer] || '').trim();
      if (text.length < 2) n.notice = 'Write a comment before posting.';
      else { n.addedComments[answer] = [...(s.addedComments[answer] || []), { id: `user-comment-${n.revision}`, author: 'You (demo)', text }]; n.commentDrafts[answer] = ''; n.notice = 'Your demo comment was posted.'; }
    } else if (id.startsWith('post-')) { n.view = 'post'; n.selected = id.slice(5); n.answerDraft = ''; }
    else if (id.startsWith('upvote-')) { n.liked = toggle(s.liked, id.slice(7)); n.notice = 'Vote updated.'; }
    else if (id.startsWith('vote-answer-')) { n.answerVotes = toggle(s.answerVotes, id.slice(12)); n.notice = 'Answer vote updated.'; }
    else if (id.startsWith('bookmark-')) { n.bookmarks = toggle(s.bookmarks, id.slice(9)); n.notice = 'Saved posts updated.'; }
    else if (id.startsWith('topic-') || id.startsWith('follow-')) {
      const topic = allPosts(s, lib).map((p) => p.topic).find((t) => topicId(t) === id.slice(id.startsWith('topic-') ? 6 : 7))!;
      if (id.startsWith('topic-')) { n.query = topic; n.view = 'home'; } else { n.followedTopics = toggle(s.followedTopics, topic); n.notice = 'Followed topics updated.'; }
    } else if (id.startsWith('product-')) { n.view = 'product'; n.selected = id.slice(8); }
    else if (id.startsWith('wish-')) { n.wishlist = toggle(s.wishlist, id.slice(5)); n.notice = 'Wishlist updated.'; }
    else {
      const match = /^(add|increase|decrease|remove)-(.+)$/.exec(id);
      if (!match) throw new Error('Unsupported sandbox action.');
      const [, operation, product] = match, quantity = n.cart[product] || 0;
      n.cart[product] = operation === 'remove' ? 0 : operation === 'decrease' ? Math.max(0, quantity - 1) : Math.min(99, quantity + 1);
      n.notice = operation === 'add' ? `${lib.products.find((p) => p.id === product)!.name} added to cart.` : 'Cart updated.';
    }
  }
  return { state: n, observation: sandboxDoc(n, lib).blocks.filter((b) => !b.control).map((b) => b.text).join('\n') };
}

export function verifySandboxTask(task: string, s: SandboxState, lib: Library, initial?: SandboxState): { supported: boolean; completed: boolean; answer: string; reason: string } {
  const checks: { passed: boolean; result: string; missing: string }[] = [];
  const mentioned = lib.products.filter((p) => new RegExp(`\\b${p.id.replace(/s$/, '')}s?\\b`, 'i').test(task));
  const paying = /\b(buy|purchase|pay|place an order|complete.{0,15}checkout|check out)\b/i.test(task);
  const quantityFor = (id: string) => Math.max(1, Number(task.match(new RegExp(`\\b(\\d+)\\s+(?:fresh\\s+|organic\\s+|crisp\\s+)?${id.replace(/s$/, '')}s?\\b`, 'i'))?.[1] || 1));
  const quoted = task.match(/["“]([^"”]+)["”]/)?.[1]?.toLowerCase();
  const topicRequested = [...new Set(allPosts(s, lib).map((p) => p.topic))].find((t) => task.toLowerCase().includes(t.toLowerCase()));
  if (s.site === 'amazon') {
    const order = s.orders.slice(initial?.orders.length || 0).find((o) => o.status === 'paid' && mentioned.every((p) => (o.items[p.id] || 0) >= quantityFor(p.id)) && (!/\bwallet\b/i.test(task) || o.payment === 'Demo wallet'));
    if (paying) checks.push({ passed: Boolean(order), result: `Demo payment approved for order ${order?.id}. No real money was charged.`, missing: 'A new paid demo order containing the requested items has not been confirmed.' });
    else if (/\b(add|put)\b/i.test(task) && /\bcart\b/i.test(task)) for (const p of mentioned) {
      const count = quantityFor(p.id);
      checks.push({ passed: (s.cart[p.id] || 0) >= (initial?.cart[p.id] || 0) + count, result: `${p.name} are in your cart (quantity: ${s.cart[p.id]}). No real order was placed.`, missing: `Expected ${count} additional ${p.id}; cart changed from ${initial?.cart[p.id] || 0} to ${s.cart[p.id] || 0}.` });
    }
    if (/\bwishlist\b/i.test(task)) for (const p of mentioned) checks.push({ passed: s.wishlist.includes(p.id), result: `${p.name} are saved to your wishlist.`, missing: `${p.name} are not in your wishlist.` });
    if (/\bcancel\b/i.test(task) && /\border\b/i.test(task)) checks.push({ passed: s.orders.some((o) => o.status === 'cancelled' && initial?.orders.some((before) => before.id === o.id && before.status === 'paid')), result: 'The demo order was cancelled and a simulated refund recorded.', missing: 'No previously paid demo order was cancelled during this run.' });
    if (!paying && /\b(open|go to|proceed to|start)\b.{0,30}\bcheckout\b/i.test(task)) checks.push({ passed: s.view === 'checkout' && itemCount(s) > 0, result: 'Demo checkout is open with items ready to review.', missing: 'Checkout must be open with a non-empty cart.' });
  } else {
    if (/language/i.test(task)) { const language = LANGUAGES.find((l) => task.toLowerCase().includes(l.toLowerCase())); checks.push({ passed: Boolean(language && s.language === language), result: `Your demo language preference is saved as ${s.language}.`, missing: language ? `Expected saved language ${language}; it is still ${s.language}. Selecting without saving is not enough.` : 'No supported target language was specified.' }); }
    if (/\b(find|browse|read|open)\b/i.test(task) && /\b(post|posts|gardening|programming|cooking|travel)\b/i.test(task)) { const p = allPosts(s, lib).find((p) => p.id === s.selected), topic = ['gardening', 'programming', 'cooking', 'travel'].find((t) => task.toLowerCase().includes(t)); checks.push({ passed: s.view === 'post' && Boolean(p && (!topic || p.topic.toLowerCase() === topic)), result: `Opened “${p?.title}” for reading.`, missing: `A ${topic || 'matching'} post must be opened, not just listed in search results.` }); }
    if (/\bupvote\b/i.test(task)) checks.push({ passed: /\banswer\b/i.test(task) ? s.answerVotes.some((id) => !initial?.answerVotes.includes(id)) : Boolean(s.selected && s.liked.includes(s.selected)), result: 'The requested vote is recorded.', missing: 'The requested upvote was not recorded.' });
    if (/\b(ask|publish|post|create)\b.{0,30}\bquestion\b/i.test(task)) checks.push({ passed: s.userPosts.slice(0, s.userPosts.length - (initial?.userPosts.length || 0)).some((p) => (!topicRequested || p.topic === topicRequested || `${p.title} ${p.body}`.toLowerCase().includes(topicRequested.toLowerCase())) && (!quoted || p.title.toLowerCase().includes(quoted))), result: 'Your demo question was published.', missing: 'No new question was published.' });
    if (/\b(write|publish|post|add)\b.{0,30}\banswer\b/i.test(task)) checks.push({ passed: Object.entries(s.addedAnswers).some(([id, answers]) => answers.slice(initial?.addedAnswers[id]?.length || 0).some((a) => !quoted || a.text.toLowerCase().includes(quoted))), result: 'Your demo answer was published.', missing: 'No new answer was published; a draft alone does not count.' });
    if (/\b(write|publish|post|add|leave)\b.{0,30}\bcomment\b/i.test(task)) checks.push({ passed: Object.entries(s.addedComments).some(([id, comments]) => comments.slice(initial?.addedComments[id]?.length || 0).some((c) => !quoted || c.text.toLowerCase().includes(quoted))), result: 'Your demo comment was posted.', missing: 'No new comment was posted; a draft alone does not count.' });
    if (/\bfollow\b/i.test(task)) { const topic = allPosts(s, lib).map((p) => p.topic).find((t) => task.toLowerCase().includes(t.toLowerCase())); checks.push({ passed: Boolean(topic && s.followedTopics.includes(topic)), result: `You are following ${topic}.`, missing: 'The requested topic is not followed.' }); }
    if (/\b(save|bookmark)\b.{0,20}\bpost\b/i.test(task)) checks.push({ passed: Boolean(s.selected && s.bookmarks.includes(s.selected)), result: 'The opened post is saved.', missing: 'The opened post has not been saved.' });
  }
  if (!checks.length) return { supported: false, completed: false, answer: 'This task needs page-evidence verification.', reason: 'No deterministic state check applies to this task.' };
  const completed = checks.every((c) => c.passed), reason = completed ? 'All requested state changes were checked against the actual sandbox state.' : checks.filter((c) => !c.passed).map((c) => c.missing).join(' ');
  return { supported: true, completed, answer: completed ? checks.map((c) => c.result).join(' ') : reason, reason };
}
