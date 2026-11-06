import type { Block, PageDoc } from './types';
import type { Answer, Comment, Library, Post } from './library';
import { TRACKS, ROOMS, AMENITIES } from './sandbox-media';
import { MET_PLACES, placesForAmenity, amenityKey, floorLabel } from './met-places';
import { localizeQuoraPost, localizeQuoraBlock, canonicalQuoraTopic, qt } from './quora-i18n';

export type SandboxSite = 'amazon' | 'quora' | 'soundcloud' | 'met-map';
export interface DemoOrder {
  id: string; items: Record<string, number>; total: number; payment: string; status: 'paid' | 'cancelled';
  itemNames?: Record<string, string>; placedAt?: string;
  delivery?: { status: 'delivered' | 'in-transit'; eta: string; carrier: string; trackingId: string; events: string[] };
  returnRequest?: { reason: string; method: string; reference: string };
}
const demoDate = (offset: number) => { const date = new Date(); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); };
function recentDemoOrders(): DemoOrder[] {
  return [
    { id: 'DEMO-JACKET', items: { jacket: 1 }, itemNames: { jacket: 'Everyday lightweight jacket · Navy · Size M' }, total: 59.99, payment: 'Demo card •••• 4242', status: 'paid', placedAt: demoDate(-7),
      delivery: { status: 'delivered', eta: demoDate(-4), carrier: 'Demo Parcel', trackingId: 'DEMO-TRACK-JACKET', events: ['Order confirmed', 'Shipped from Demo City', 'Delivered to front door'] } },
    { id: 'DEMO-COFFEE', items: { coffee: 1 }, total: 8.99, payment: 'Demo card •••• 4242', status: 'paid', placedAt: demoDate(-2),
      delivery: { status: 'in-transit', eta: demoDate(2), carrier: 'Demo Parcel', trackingId: 'DEMO-TRACK-COFFEE', events: ['Order confirmed', 'Package shipped', 'In transit at Demo City sorting center'] } },
  ];
}
export interface DemoNotification { id: string; kind: 'answer' | 'comment' | 'upvote' | 'space'; text: string; time: string; read: boolean; postId?: string }
export const NOTIFICATION_FILTERS = { all: 'All Notifications', content: 'Your content', comments: 'Comments and mentions', upvotes: 'Upvotes', spaces: 'Spaces' } as const;
export type NotificationFilter = keyof typeof NOTIFICATION_FILTERS;
const demoBusinessPost = (): Post => ({ id: 'my-business-question', title: 'How can a small business find its first customers?', topic: 'Business', space: 'Business', author: 'You (demo)', body: 'I am starting a fictional small business. Which practical steps help attract the first customers?', answers: [
  { id: 'business-first-customers', author: 'Maya Chen', credential: 'Small business owner · fictional demo profile', votes: 8, text: 'Talk to potential customers, test a small offer, and ask early customers for referrals.', comments: [{ id: 'business-comment', author: 'Alex Morgan', text: 'Testing a small offer helped me understand what customers needed.' }] },
] });
const demoNotifications = (): DemoNotification[] => [
  { id: 'answer-business', kind: 'answer', text: 'Maya Chen answered your question about finding your first customers.', time: '2 hours ago', read: false, postId: 'my-business-question' },
  { id: 'comment-business', kind: 'comment', text: 'Alex Morgan commented on the discussion on your business question.', time: '5 hours ago', read: false, postId: 'my-business-question' },
  { id: 'upvote-business', kind: 'upvote', text: 'Nora Patel upvoted your question about finding your first customers.', time: 'Yesterday', read: false, postId: 'my-business-question' },
  { id: 'space-business', kind: 'space', text: 'Welcome to Business Space. You can post questions to this demo community.', time: 'Yesterday', read: true },
];
export interface SandboxState {
  site: SandboxSite;
  view: 'home' | 'cart' | 'product' | 'settings' | 'post' | 'checkout' | 'orders' | 'returns' | 'tracking' | 'wishlist' | 'ask' | 'bookmarks' | 'spaces' | 'space' | 'notifications' | 'library' | 'account' | 'plans' | 'preferences' | 'jam' | 'discord' | 'map';
  query: string; selected: string; cart: Record<string, number>; wishlist: string[];
  language: string; draftLanguage: string; liked: string[]; notice: string; revision: number;
  shipping: Record<'name' | 'address' | 'city' | 'postcode', string>;
  checkoutStage: 'shipping' | 'review' | 'confirmation'; payment: 'Demo card •••• 4242' | 'Demo wallet'; orders: DemoOrder[];
  questionSpace?: string; notifications?: DemoNotification[]; notificationFilter?: NotificationFilter;
  returnStage?: 'reason' | 'method' | 'review' | 'confirmation'; returnReason?: string; returnMethod?: string;
  userPosts: Post[]; addedAnswers: Record<string, Answer[]>; addedComments: Record<string, Comment[]>;
  answerDraft: string; commentDrafts: Record<string, string>; questionDraft: { title: string; body: string; topic: string };
  answerVotes: string[]; followedTopics: string[]; bookmarks: string[];
  mapFloor: 1 | 2;
  mapZoom?: number; mapAmenity?: string; mapRouting?: boolean; mapPlace?: string;
  soundPlaying?: boolean;
  spotifyPlan?: 'Free' | 'Premium'; premiumStage?: 'select' | 'review';
  hiddenTracks?: string[]; hiddenArtists?: string[]; visibilityHistory?: string[];
  discordConnected?: boolean; jamStarted?: boolean; jamShared?: boolean; discordInvited?: boolean; friendJoined?: boolean;
}
export interface BrowserAction { type: string; id?: string; url?: string; value?: string }
export const LANGUAGES = ['English', 'Spanish', 'French', 'Vietnamese'];
// Keep the legacy session key so existing demo sessions and audio assets remain compatible.
export const sandboxUrl = (site: SandboxSite) => `https://${site === 'soundcloud' ? 'spotify' : site}.pageguide.test/`;
export function sandboxSite(url: string): SandboxSite | null {
  try { const u = new URL(url); return (u.origin === 'https://soundcloud.pageguide.test' ? 'soundcloud' : null) || (['amazon', 'quora', 'soundcloud', 'met-map'] as const).find((site) => u.origin === new URL(sandboxUrl(site)).origin) || null; } catch { return null; }
}
export function initialSandbox(site: SandboxSite, preferredLanguage = 'English'): SandboxState {
  const language = LANGUAGES.includes(preferredLanguage) ? preferredLanguage : 'English';
  return { site, view: 'home', query: '', selected: '', cart: {}, wishlist: [], language, draftLanguage: language, liked: [], notice: '', revision: 0,
    shipping: { name: '', address: '', city: '', postcode: '' }, checkoutStage: 'shipping', payment: 'Demo card •••• 4242', orders: site === 'amazon' ? recentDemoOrders() : [],
    questionSpace: '', notifications: site === 'quora' ? demoNotifications() : [], notificationFilter: 'all',
    userPosts: site === 'quora' ? [demoBusinessPost()] : [], addedAnswers: {}, addedComments: {}, answerDraft: '', commentDrafts: {}, questionDraft: { title: '', body: '', topic: 'Everyday life' },
    answerVotes: [], followedTopics: [], bookmarks: [], mapFloor: 1,
    spotifyPlan: 'Free', premiumStage: 'select', hiddenTracks: [], hiddenArtists: [], visibilityHistory: [], discordConnected: false, jamStarted: false, jamShared: false, discordInvited: false, friendJoined: false,
  };
}
export const allPosts = (s: SandboxState, lib: Library): Post[] => [...s.userPosts, ...lib.posts];
const answersFor = (s: SandboxState, p: Post): Answer[] => [...(p.answers || []), ...(s.addedAnswers[p.id] || [])];
const shippingValid = (s: SandboxState) => Object.values(s.shipping).every((v) => v.trim().length >= 2);
const itemCount = (s: SandboxState) => Object.values(s.cart).reduce((a, b) => a + b, 0);
const total = (s: SandboxState, lib: Library) => Math.round(lib.products.reduce((sum, p) => sum + p.price * (s.cart[p.id] || 0), 0) * 100) / 100;
export function stateUrl(s: SandboxState): string {
  const path = s.view === 'home' ? '' : ['product', 'post', 'returns', 'tracking', 'space'].includes(s.view) ? `${s.view}/${s.selected}` : s.view;
  const params = new URLSearchParams();
  if (s.query) params.set('q', s.query);
  if (s.view === 'checkout') params.set('stage', s.checkoutStage);
  if (s.view === 'ask' && s.questionSpace) params.set('space', s.questionSpace);
  if (s.view === 'notifications') params.set('filter', s.notificationFilter || 'all');
  // These sites don't carry the selection in the path, so encode it (and floor) for refresh/back-forward.
  if (s.site === 'met-map') { if (s.mapFloor === 2) params.set('floor', '2'); if (s.selected) params.set('room', s.selected); }
  if (s.site === 'soundcloud' && s.selected) params.set('track', s.selected);
  return `${sandboxUrl(s.site)}${path}${params.size ? `?${params}` : ''}`;
}
export function routeSandbox(s: SandboxState, url: string, lib: Library): SandboxState {
  const u = new URL(url), [path, pathSelected = ''] = u.pathname.split('/').filter(Boolean);
  const allowed = s.site === 'amazon' ? ['cart', 'checkout', 'orders', 'wishlist'] : s.site === 'quora' ? ['settings', 'ask', 'bookmarks', 'spaces', 'notifications'] : s.site === 'soundcloud' ? ['library', 'account', 'plans', 'preferences', 'jam', 'discord'] : ['map'];
  const view = allowed.includes(path) ? path as SandboxState['view']
    : path === 'product' && s.site === 'amazon' && lib.products.some((p) => p.id === pathSelected) ? 'product'
    : ['returns', 'tracking'].includes(path) && s.site === 'amazon' && s.orders.some(o => o.id === pathSelected && o.status === 'paid' && (path !== 'returns' || o.delivery?.status === 'delivered')) ? path as 'returns' | 'tracking'
    : path === 'space' && s.site === 'quora' && pathSelected === 'Business' ? 'space'
    : path === 'post' && s.site === 'quora' && allPosts(s, lib).some((p) => p.id === pathSelected) ? 'post' : 'home';
  const stage = u.searchParams.get('stage');
  const checkoutStage = stage === 'confirmation' && s.orders.length ? 'confirmation' : stage === 'review' && shippingValid(s) ? 'review' : 'shipping';
  // Restore the query-serialized selection for sites that don't carry it in the path.
  let mapFloor = s.mapFloor;
  let selected = pathSelected;
  if (s.site === 'met-map') {
    mapFloor = u.searchParams.get('floor') === '2' ? 2 : 1;
    const room = u.searchParams.get('room') || '';
    const match = ROOMS.find((r) => r.id === room);
    selected = match && match.floor === mapFloor ? room : '';
  } else if (s.site === 'soundcloud') {
    const track = u.searchParams.get('track') || '';
    selected = TRACKS.some((t) => t.id === track) ? track : '';
  }
  return { ...s, view, selected, mapFloor, checkoutStage,
    ...(s.site === 'quora' ? { questionSpace: view === 'ask' && u.searchParams.get('space') === 'Business' ? 'Business' : '', notificationFilter: (Object.hasOwn(NOTIFICATION_FILTERS, u.searchParams.get('filter') || '') ? u.searchParams.get('filter') : 'all') as NotificationFilter } : {}),
    ...(view === 'returns' ? { returnStage: s.orders.find(o => o.id === selected)?.returnRequest ? 'confirmation' as const : 'reason' as const, returnReason: '', returnMethod: '' } : {}), query: (u.searchParams.get('q') || '').slice(0, 200), notice: '', revision: s.revision + 1 };
}
const heading = (id: string, text: string, group?: string): Block => ({ id, type: 'heading', text, level: group ? 2 : 1, group });
const paragraph = (id: string, text: string, group?: string): Block => ({ id, type: 'paragraph', text, group });
const button = (id: string, text: string, group?: string): Block => ({ id, type: 'button', text, control: true, group });
const input = (id: string, text: string, value: string, group?: string, multiline = false): Block => ({ id, type: 'input', text, value, control: true, group, multiline });
const toggle = (items: string[], id: string) => items.includes(id) ? items.filter((x) => x !== id) : [...items, id];
const topicId = (topic: string) => topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export function sandboxDoc(s: SandboxState, lib: Library): PageDoc {
  if (s.site === 'soundcloud') return soundcloudDoc(s);
  if (s.site === 'met-map') return metMapDoc(s);
  const amazon = s.site === 'amazon', posts = allPosts(s, lib).map(p => amazon ? p : localizeQuoraPost(p, s.language));
  const blocks: Block[] = [
    paragraph('sandbox-label', `${amazon ? 'Amazon-style market' : 'Quora-style community'} · fictional isolated demo. No real accounts, purchases, or payments.`),
    button('home', amazon ? 'Shop all' : 'Home feed', 'navigation'),
    button(amazon ? 'cart' : 'settings', amazon ? `Cart (${itemCount(s)})` : 'Settings', 'navigation'),
    ...(amazon ? [button('orders', 'Your orders', 'navigation'), button('wishlist', `Wishlist (${s.wishlist.length})`, 'navigation')] : [button('ask-question', 'Ask a question', 'navigation'), button('bookmarks', 'Saved posts', 'navigation'), button('spaces', 'Spaces', 'navigation'), button('space-business', 'Open Business Space', 'navigation'), button('notifications', 'Notifications', 'navigation')]),
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
  } else if (amazon && (s.view === 'returns' || s.view === 'tracking')) {
    const order = s.orders.find(o => o.id === s.selected && o.status === 'paid');
    blocks.push(heading('page-title', s.view === 'tracking' ? 'Track your package' : 'Return your jacket'), button('orders', 'Back to your orders'));
    if (!order) blocks.push(paragraph('empty', 'This order is not available. Open Your orders to choose another order.'));
    else {
      blocks.push(paragraph('selected-order', `Order ${order.id} · Placed ${order.placedAt || 'today'} · ${Object.entries(order.items).map(([id, quantity]) => `${order.itemNames?.[id] || lib.products.find(p => p.id === id)?.name || id} × ${quantity}`).join(', ')}`));
      if (s.view === 'tracking') {
        blocks.push(paragraph('tracking-status', order.delivery?.status === 'delivered' ? 'Delivered' : 'Package in transit', 'tracking'),
          paragraph('tracking-arrival', `${order.delivery?.status === 'delivered' ? 'Delivered on' : 'Estimated arrival'}: ${order.delivery?.eta || demoDate(2)}${order.delivery?.status === 'delivered' ? '' : ' · by 8 PM (demo estimate)'}`, 'tracking'),
          paragraph('tracking-number', `${order.delivery?.carrier || 'Demo Parcel'} · Tracking number: ${order.delivery?.trackingId || `DEMO-TRACK-${order.id}`}`, 'tracking'),
          paragraph('tracking-destination', 'Destination: Alex Demo, Demo City 10001 · Fictional address', 'tracking'));
        for (const [index, event] of (order.delivery?.events || ['Order confirmed', 'Preparing for shipment']).entries()) blocks.push(paragraph(`tracking-event-${index}`, `✓ ${event}`, 'tracking'));
        blocks.push(paragraph('tracking-demo', 'Simulated tracking only. No live carrier connection or real shipment.', 'tracking'));
      } else if (order.returnRequest) {
        blocks.push(paragraph('return-confirmation', `Return requested · ${order.returnRequest.reference}. Reason: ${order.returnRequest.reason}. Method: ${order.returnRequest.method}.`, 'return-confirmation'),
          paragraph('return-instructions', `Demo return QR code: ${order.returnRequest.reference}. Pack the jacket and bring it to Demo Parcel drop-off within 14 days. No printer needed.`, 'return-confirmation'),
          paragraph('return-refund', `Estimated refund: $${order.total.toFixed(2)} to ${order.payment} within 5–7 business days after the demo item is received. No real refund is issued.`, 'return-confirmation'));
      } else {
        blocks.push(paragraph('return-policy', 'Delivered jacket · Eligible for a demo return within 30 days. No real return or refund will be created.'));
        if (!s.returnStage || s.returnStage === 'reason') {
          blocks.push(heading('return-step', '1 · Choose a return reason', 'return-form'), button('return-reason-fit', 'Does not fit', 'return-form'), button('return-reason-damaged', 'Item arrived damaged', 'return-form'), button('return-reason-other', 'No longer needed', 'return-form'));
        } else if (s.returnStage === 'method') {
          blocks.push(heading('return-step', '2 · Choose a return method', 'return-form'), paragraph('return-reason-summary', `Reason: ${s.returnReason}`, 'return-form'), button('return-method-dropoff', 'Free Demo Parcel drop-off · QR code, no printer needed', 'return-form'));
        } else {
          blocks.push(heading('return-step', '3 · Review your return', 'return-form'), paragraph('return-review', `Reason: ${s.returnReason}. Method: ${s.returnMethod}. Estimated refund: $${order.total.toFixed(2)} to ${order.payment}.`, 'return-form'), button('return-edit', 'Change return reason', 'return-form'), button('submit-return', 'Confirm demo return', 'return-form'));
        }
      }
    }
  } else if (amazon && s.view === 'orders') {
    blocks.push(heading('page-title', 'Your demo orders'));
    if (!s.orders.length) blocks.push(paragraph('empty', 'You have not placed any demo orders yet.'));
    for (const order of [...s.orders].reverse()) {
      const group = `order-${order.id}`;
      blocks.push(heading(`order-title-${order.id}`, order.id, group), paragraph(`order-status-${order.id}`, `${order.status === 'cancelled' ? 'Cancelled · demo refund recorded' : order.returnRequest ? 'Return requested' : order.delivery?.status === 'delivered' ? 'Delivered · eligible for return' : 'Paid · in transit / preparing for demo delivery'} · Ordered ${order.placedAt || 'today'} · Total $${order.total.toFixed(2)} · ${order.payment}`, group));
      for (const [id, quantity] of Object.entries(order.items)) if (quantity > 0) blocks.push(paragraph(`order-item-${order.id}-${id}`, `${order.itemNames?.[id] || lib.products.find((p) => p.id === id)?.name || id} · Quantity ${quantity}`, group));
      if (order.status === 'paid') {
        blocks.push(button(`track-${order.id}`, `Track package ${order.id}${order.delivery?.status === 'in-transit' ? ' · Arriving soon' : ''}`, group));
        if (order.delivery?.status === 'delivered') blocks.push(button(`return-${order.id}`, order.returnRequest ? `View return instructions ${order.id}` : `Return jacket ${order.id}`, group));
        else blocks.push(button(`cancel-${order.id}`, `Cancel demo order ${order.id}`, group));
      }
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
  } else if (s.view === 'notifications') {
    const filter = s.notificationFilter || 'all';
    const notifications = (s.notifications || []).filter(item => filter === 'all' || (filter === 'content' ? Boolean(item.postId) : filter === 'comments' ? item.kind === 'comment' : filter === 'upvotes' ? item.kind === 'upvote' : item.kind === 'space'));
    blocks.push(heading('page-title', NOTIFICATION_FILTERS[filter]), paragraph('notifications-info', 'Activity from the last 30 days · Fictional demo notifications', 'notification-summary'), button('notifications-mark-read', 'Mark all as read', 'notification-summary'));
    for (const [key, label] of Object.entries(NOTIFICATION_FILTERS)) blocks.push(button(`notifications-filter-${key}`, label, 'notification-filters'));
    for (const item of notifications) {
      const group = `notification-card-${item.id}`;
      blocks.push(paragraph(`notification-text-${item.id}`, `${item.read ? 'Read' : 'Unread'} · ${item.text}`, group), paragraph(`notification-time-${item.id}`, item.time, group), button(`notification-open-${item.id}`, 'View activity', group));
    }
    if (!notifications.length) blocks.push(paragraph('empty', 'No New Notifications. Notifications you received in the last 30 days will show up here.'));
  } else if (s.view === 'spaces' || s.view === 'space') {
    blocks.push(heading('page-title', s.view === 'spaces' ? 'Your spaces' : 'Business Space'));
    if (s.view === 'spaces') blocks.push(paragraph('spaces-info', 'Explore communities and choose where to post a question.', 'space-directory'), button('space-business', 'Open Business Space', 'space-directory'));
    else {
      blocks.push(paragraph('space-description', 'Business Space · A fictional community for entrepreneurship, customers, and growing a business.', 'space-header'), paragraph('space-membership', 'You are a member · Questions can be published to Business Space.', 'space-header'), button('ask-business', 'Ask a question in Business Space', 'space-header'));
      for (const post of posts.filter(p => p.space === 'Business')) blocks.push(heading(`space-title-${post.id}`, post.title, `space-post-${post.id}`), paragraph(`space-author-${post.id}`, `${post.author} · Business Space`, `space-post-${post.id}`), button(`post-${post.id}`, `Read post: ${post.title}`, `space-post-${post.id}`));
    }
  } else if (s.view === 'ask') {
    blocks.push(heading('page-title', 'Ask the community'), paragraph('fiction-note', 'All questions, answers, and profiles are fictional demo content.'),
      paragraph('question-audience', s.questionSpace === 'Business' ? 'Posting to: Business Space' : 'Posting to: Public community', 'question-form'),
      button(s.questionSpace === 'Business' ? 'audience-public' : 'audience-business', s.questionSpace === 'Business' ? 'Switch to public community' : 'Post to Business Space instead', 'question-form'),
      input('question-title', 'Question title', s.questionDraft.title, 'question-form'), input('question-topic', 'Question topic', s.questionDraft.topic, 'question-form'),
      input('question-body', 'Question details', s.questionDraft.body, 'question-form', true), button('post-question', 'Publish demo question', 'question-form'));
  } else {
    blocks.push(heading('page-title', s.view === 'post' ? 'Community discussion' : s.view === 'bookmarks' ? 'Your saved posts' : 'Questions worth exploring'));
    const visible = posts.filter((p) => s.view === 'post' ? p.id === s.selected : s.view === 'bookmarks' ? s.bookmarks.includes(p.id) : `${p.title} ${p.topic} ${qt(s.language, p.topic)} ${p.body}`.toLowerCase().includes(canonicalQuoraTopic(s.query).toLowerCase()) || (s.view === 'home' && `${allPosts(s, lib).find(original => original.id === p.id)?.title || ''} ${allPosts(s, lib).find(original => original.id === p.id)?.body || ''}`.toLowerCase().includes(s.query.toLowerCase())));
    for (const p of visible) {
      const group = `post-${p.id}`, answers = answersFor(s, p);
      blocks.push(heading(`title-${p.id}`, p.title, group), paragraph(`author-${p.id}`, `${p.author} · ${p.topic} · ${answers.length} answers`, group), paragraph(`body-${p.id}`, s.view === 'post' ? p.body : `${p.body.slice(0, 100)}…`, group));
      if (s.view !== 'post') blocks.push(button(`post-${p.id}`, `Read post: ${p.title}`, group));
      else {
        if (p.space) blocks.push(paragraph(`published-space-${p.id}`, `Published in ${p.space} Space`, group));
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
  return { url: stateUrl(s), title: `${amazon ? 'Amazon' : 'Quora'} sandbox`, siteName: amazon ? 'Amazon-style demo' : 'Quora-style demo', sandbox: s.site, blocks: amazon ? blocks : blocks.map(b => localizeQuoraBlock(b, s.language, s.draftLanguage)) };
}

function soundcloudDoc(s: SandboxState): PageDoc {
  const blocks: Block[] = [
    paragraph('sandbox-label', 'Spotify-style local demo · Fictional account and artists. Original 32-second audio previews. No real subscriptions, charges, or Discord connection.'),
    button('home', 'Home', 'navigation'), button('library', 'Your Library', 'navigation'), button('account', 'Account', 'navigation'), button('plans', 'Explore Premium', 'navigation'), button('preferences', 'Content preferences', 'navigation'), button('jam', 'Listen with friends', 'navigation'),
    input('search', 'What do you want to play?', s.query, 'navigation'), button('search-submit', 'Search', 'navigation'),
    paragraph('current-state', `Playback: ${s.selected && s.soundPlaying !== false ? 'playing' : 'paused'}. Selected track: ${s.selected || 'nothing'}. Plan: ${s.spotifyPlan || 'Free'}. Hidden songs: ${(s.hiddenTracks || []).join(', ') || 'none'}. Blocked artists: ${(s.hiddenArtists || []).join(', ') || 'none'}. Discord: ${s.discordConnected ? 'demo connected' : 'not connected'}. Jam: ${s.friendJoined ? 'Alex Demo joined' : s.jamStarted ? 'started' : 'not started'}.`),
    heading('page-title', ({ home: 'Trending songs', library: 'Your Library', account: 'Account overview', plans: 'Choose your Premium plan', preferences: 'Content preferences', jam: 'Listen with friends', discord: 'Discord · Demo Friends' } as Record<string, string>)[s.view] || 'Spotify'),
  ];
  if (s.notice) blocks.push(paragraph('notice', s.notice));
  if (s.view === 'account') {
    blocks.push(heading('account-name', 'Alex Demo', 'account'), paragraph('account-plan', `Your plan: Spotify ${s.spotifyPlan || 'Free'}`, 'account'), paragraph('account-info', 'Fictional test account · No real billing information is stored.', 'account'));
    if (s.spotifyPlan === 'Premium') blocks.push(paragraph('premium-confirmation', 'Premium active · Demo upgrade confirmed. No real subscription or charge.', 'account'));
  } else if (s.view === 'plans') {
    blocks.push(paragraph('premium-disclaimer', 'Demo pricing only: $12.99/month. No trial, subscription, payment details, or real charge.', 'premium'));
    if (s.spotifyPlan === 'Premium') blocks.push(paragraph('premium-active', 'Your demo Premium plan is already active.', 'premium'));
    else if (s.premiumStage === 'review') blocks.push(heading('premium-review-title', 'Review demo Premium Individual', 'premium'), paragraph('premium-review', 'Alex Demo · Premium Individual · $12.99/month simulated. Confirming only updates this local demo account.', 'premium'), button('confirm-premium', 'Confirm demo Premium upgrade', 'premium'));
    else blocks.push(heading('premium-plan-title', 'Premium Individual', 'premium'), paragraph('premium-benefits', 'Explore a demo Premium account, your library, and listening with friends. Audio remains the same local previews.', 'premium'), button('select-premium', 'Select Premium Individual', 'premium'));
  } else if (s.view === 'preferences') {
    blocks.push(paragraph('preferences-info', 'Hide a song or block an artist to remove them from playback in this demo. Restore them here at any time. These are demo controls, not a claim that every Spotify client supports the same options.', 'preferences-info'));
    for (const track of TRACKS) blocks.push(heading(`preference-track-${track.id}`, track.title, 'hidden-songs'), paragraph(`visibility-${track.id}`, `Song: ${(s.hiddenTracks || []).includes(track.id) ? 'Hidden' : 'Visible'}`, 'hidden-songs'), button(`${(s.hiddenTracks || []).includes(track.id) ? 'unhide' : 'hide'}-track-${track.id}`, `${(s.hiddenTracks || []).includes(track.id) ? 'Unhide' : 'Hide'} ${track.title}`, 'hidden-songs'));
    for (const track of TRACKS) blocks.push(heading(`preference-artist-${track.artistId}`, track.artist, 'blocked-artists'), paragraph(`visibility-artist-${track.artistId}`, `Artist: ${(s.hiddenArtists || []).includes(track.artistId) ? 'Blocked' : 'Allowed'}`, 'blocked-artists'), button(`${(s.hiddenArtists || []).includes(track.artistId) ? 'unhide' : 'hide'}-artist-${track.artistId}`, `${(s.hiddenArtists || []).includes(track.artistId) ? 'Unblock' : 'Block'} ${track.artist}`, 'blocked-artists'));
  } else if (s.view === 'jam' || s.view === 'discord') {
    blocks.push(paragraph('jam-disclaimer', 'Local simulation only. No live Discord messages, OAuth, or synchronized audio. Real Spotify/Discord features may require eligible plans and supported clients.', 'jam'));
    if (s.view === 'discord') {
      blocks.push(heading('discord-channel', 'Demo Friends / #listening-room', 'discord'));
      if (!s.jamStarted || !s.jamShared) blocks.push(paragraph('discord-no-invite', 'Start a Jam and create its demo share link from Listen with friends first.', 'discord'));
      else if (!s.discordConnected) blocks.push(button('discord-connect', 'Connect demo Discord account', 'discord'));
      else {
        blocks.push(paragraph('discord-account', 'Connected: Alex Demo (fictional Discord account)', 'discord'));
        if (!s.discordInvited) blocks.push(button('discord-send-invite', 'Send demo invite to #listening-room', 'discord'));
        else {
          blocks.push(paragraph('discord-invite', `Listening invite shared with Demo Friends · ${TRACKS.find(track => track.id === s.selected)?.title || 'Local preview'}.`, 'discord'));
          if (!s.friendJoined) blocks.push(button('simulate-friend-join', 'Simulate Alex Demo joining', 'discord'));
        }
      }
    } else if (s.selected && s.soundPlaying !== false) {
      if (!s.jamStarted) blocks.push(button('start-jam', 'Start a demo Jam', 'jam'));
      else if (!s.jamShared) blocks.push(button('share-jam', 'Create demo share link', 'jam'));
      else blocks.push(paragraph('jam-link', 'Demo invite: https://spotify.pageguide.test/jam/demo-session · Not a live invite', 'jam'), button('open-discord', 'Open demo Discord', 'jam'));
    } else blocks.push(paragraph('jam-play-first', 'Play a song below before starting or sharing your Jam.', 'jam'));
    if (s.friendJoined) blocks.push(paragraph('jam-confirmation', `Alex Demo joined · ${TRACKS.find(track => track.id === s.selected)?.title || 'No song selected'} · ${s.soundPlaying !== false ? 'Playing together in this local simulation' : 'Playback paused'}. No real Discord connection.`, 'jam'));
  }
  // Keep playback available across pages, but never expose play controls for hidden content.
  for (const track of TRACKS) {
    const browsing = s.view === 'home' || s.view === 'library';
    const matches = `${track.title} ${track.artist} ${track.genre}`.toLowerCase().includes(s.query.toLowerCase()) && (s.view !== 'library' || s.liked.includes(track.id));
    if (track.id !== s.selected && (browsing ? !matches : !['jam', 'discord'].includes(s.view))) continue;
    if ((s.hiddenTracks || []).includes(track.id) || (s.hiddenArtists || []).includes(track.artistId)) continue;
    const playing = s.selected === track.id && s.soundPlaying !== false;
    const group = `track-${track.id}`;
    blocks.push(heading(`title-${track.id}`, track.title, group), paragraph(`artist-${track.id}`, `${track.artist} · ${track.genre} · Original 0:32 preview`, group), button(`play-${track.id}`, playing ? `Pause ${track.title}` : `Play ${track.title}`, group), button(`like-${track.id}`, `${s.liked.includes(track.id) ? 'Unlike' : 'Like'} ${track.title}`, group), button(`follow-${track.artistId}`, `${s.followedTopics.includes(track.artist) ? 'Following' : 'Follow'} ${track.artist}`, group));
  }
  return { url: stateUrl(s), title: 'Spotify sandbox', siteName: 'Spotify-style demo', sandbox: 'soundcloud', blocks };
}

function metMapDoc(s: SandboxState): PageDoc {
  // Search results across floors must be visible to both the agent and the UI.
  const rooms = ROOMS.filter(r => r.floor === s.mapFloor || (!s.mapAmenity && s.query && `${r.title} ${r.gallery} ${r.detail}`.toLowerCase().includes(s.query.toLowerCase())))
    .map(r => [r.id, r.title, `Gallery ${r.gallery} · Floor ${r.floor} · ${r.detail}`]);
  const blocks: Block[] = [
    paragraph('sandbox-label', 'The Met Museum map demo · fictional indoor navigation. No live location data.'),
    button('home', 'Museum map', 'navigation'), button('floor-1', 'Floor 1', 'navigation'), button('floor-2', 'Floor 2', 'navigation'), input('search', 'Search The Met', s.query, 'navigation'), button('search-submit', 'Search', 'navigation'),
    paragraph('current-state', `Viewing Floor ${s.mapFloor}. Selected gallery: ${s.selected || 'none'}. Selected service: ${MET_PLACES.find(p => p.id === s.mapPlace)?.name || 'none'}. Amenity filter: ${s.mapAmenity || 'none'}. Zoom: ${s.mapZoom || 1}. Route displayed: ${Boolean(s.mapRouting)}. Search: ${s.query || '(empty)'}.`),
    heading('page-title', `The Met · Floor ${s.mapFloor}`), paragraph('map-overview', 'Central Park entrance · use a labeled gallery to view details and route guidance.'),
  ];
  for (const [id, title, detail] of rooms) {
    const group = `room-${id}`;
    blocks.push(heading(`room-title-${id}`, title, group), paragraph(`room-detail-${id}`, detail, group), button(`room-${id}`, `Open ${title}`, group));
  }
  blocks.push(button('zoom-in', 'Zoom in', 'map-controls'), button('zoom-out', 'Zoom out', 'map-controls'), button('reset-map', 'Reset map view', 'map-controls'), button('close-room', 'Close gallery details', 'map-controls'));
  for (const amenity of AMENITIES) blocks.push(button(`amenity-${amenity.toLowerCase().replaceAll(' ', '-')}`, amenity, 'amenities'));
  blocks.push(button('clear-map-search', 'Clear map search', 'map-controls'));
  const places = s.mapAmenity ? placesForAmenity(s.mapAmenity) : s.query ? MET_PLACES.filter(p => `${p.name} ${p.category} ${p.detail}`.toLowerCase().includes(s.query.toLowerCase())) : [];
  for (const place of places) blocks.push(button(`place-${place.id}`, `Show ${place.name}`, 'places'), paragraph(`place-detail-${place.id}`, `${place.name} · ${floorLabel(place.floor)} · ${place.detail}`, 'places'));
  if (s.mapPlace) blocks.push(button('directions', 'Get directions', 'route'), paragraph('route-guidance', `${s.mapRouting ? 'Route displayed' : 'Selected service'}: ${MET_PLACES.find(p => p.id === s.mapPlace)?.name}. Illustrative route starts at the 82nd Street entrance. Check the service level and follow museum signs.`, 'route'));
  if (s.selected) blocks.push(button('directions', 'Get directions', 'route'), paragraph('route-guidance', `${s.mapRouting ? 'Walking route from the 82nd Street entrance' : 'Selected gallery'}: ${rooms.find(([id]) => id === s.selected)?.[1] || s.selected}. Indoor routes are illustrative, not live navigation.`, 'route'));
  return { url: stateUrl(s), title: 'The Met Map sandbox', siteName: 'Met Museum map demo', sandbox: 'met-map', blocks };
}

// Irreversible / consequential sandbox actions the agent must get user approval for
// before performing them: checkout/payment, publishing content, and cancellation/delete.
export function actionRisk(action: BrowserAction): { kind: 'buy' | 'post' | 'delete'; label: string; title: string; detail: string } | null {
  if (action.type !== 'click' || !action.id) return null;
  const id = action.id;
  if (id === 'pay-demo') return { kind: 'buy', label: 'payment', title: 'Confirm demo checkout', detail: 'The agent wants to place the order and run the simulated payment. No real money is charged, but this completes checkout.' };
  if (id === 'confirm-premium') return { kind: 'buy', label: 'demo subscription', title: 'Confirm demo Premium upgrade', detail: 'Switch this local test account to Premium. No real subscription, payment details, or charges.' };
  if (id === 'discord-connect') return { kind: 'post', label: 'demo account connection', title: 'Connect demo Discord account', detail: 'Simulate connecting the fictional Demo Friends account. No real Spotify or Discord permissions are requested.' };
  if (id === 'discord-send-invite') return { kind: 'post', label: 'demo listening invite', title: 'Share demo listening invite', detail: 'Send an invite to the simulated Demo Friends channel only. Nothing is sent to real people.' };
  if (id === 'submit-return') return { kind: 'delete', label: 'return request', title: 'Confirm demo return', detail: 'The agent wants to submit a simulated return request. No real shipment or refund is created.' };
  if (id.startsWith('cancel-')) return { kind: 'delete', label: 'order cancellation', title: 'Confirm cancellation', detail: 'The agent wants to cancel a demo order, which changes its status.' };
  if (id === 'post-question') return { kind: 'post', label: 'question', title: 'Confirm posting', detail: 'The agent wants to publish a demo question to the community.' };
  if (id === 'submit-answer') return { kind: 'post', label: 'answer', title: 'Confirm posting', detail: 'The agent wants to publish a demo answer.' };
  if (id.startsWith('submit-comment-')) return { kind: 'post', label: 'comment', title: 'Confirm posting', detail: 'The agent wants to publish a demo comment.' };
  return null;
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
    if (id === 'search') { n.query = value.slice(0, 200); if (n.site === 'met-map') { n.mapAmenity = ''; n.mapPlace = ''; n.mapRouting = false; } }
    else if (id.startsWith('shipping-')) n.shipping[id.slice(9) as keyof typeof n.shipping] = value;
    else if (id.startsWith('question-')) n.questionDraft[id.slice(9) as keyof typeof n.questionDraft] = value;
    else if (id === 'answer-draft') n.answerDraft = value;
    else if (id.startsWith('comment-input-')) n.commentDrafts[id.slice(14)] = value;
  } else {
    if (target.type !== 'button') throw new Error('That target is not a clickable button.');
    if (id === 'home') { n.view = 'home'; n.query = ''; if (n.site !== 'soundcloud') n.selected = ''; }
    else if (n.site === 'soundcloud' && id === 'library') n.view = 'library';
    else if (n.site === 'soundcloud' && ['account', 'plans', 'preferences', 'jam'].includes(id)) { n.view = id as SandboxState['view']; if (id === 'plans') n.premiumStage = 'select'; }
    else if (id === 'select-premium') { n.view = 'plans'; n.premiumStage = 'review'; }
    else if (id === 'confirm-premium') { n.spotifyPlan = 'Premium'; n.view = 'account'; n.notice = 'Demo Premium activated. No real subscription or charge.'; }
    else if (id.startsWith('hide-track-') || id.startsWith('unhide-track-') || id.startsWith('hide-artist-') || id.startsWith('unhide-artist-')) {
      const match = /^(unhide|hide)-(track|artist)-(.+)$/.exec(id)!;
      const [, operation, kind, item] = match;
      const key = kind === 'track' ? 'hiddenTracks' : 'hiddenArtists';
      n[key] = operation === 'hide' ? [...(s[key] || []), item] : (s[key] || []).filter(value => value !== item);
      n.visibilityHistory = [...(s.visibilityHistory || []), id];
      const selected = TRACKS.find(track => track.id === s.selected);
      if (selected && ((n.hiddenTracks || []).includes(selected.id) || (n.hiddenArtists || []).includes(selected.artistId))) n.soundPlaying = false;
      n.notice = `${kind === 'track' ? 'Song' : 'Artist'} ${operation === 'hide' ? 'hidden / blocked' : 'restored'} in this demo account.`;
    }
    else if (id === 'start-jam') { n.jamStarted = true; n.jamShared = false; n.discordInvited = false; n.friendJoined = false; n.view = 'jam'; }
    else if (id === 'share-jam') { n.jamShared = true; n.notice = 'Demo Jam invite is ready to share.'; }
    else if (id === 'open-discord') n.view = 'discord';
    else if (id === 'discord-connect') { n.discordConnected = true; n.notice = 'Demo Discord account connected. No real account access.'; }
    else if (id === 'discord-send-invite') { n.discordInvited = true; n.notice = 'Demo invite sent to #listening-room in Demo Friends.'; }
    else if (id === 'simulate-friend-join') { n.friendJoined = true; n.notice = 'Alex Demo joined your listening session (simulation).'; }
    else if (n.site === 'soundcloud' && id.startsWith('play-')) { n.soundPlaying = n.selected !== id.slice(5) || s.soundPlaying === false; n.selected = id.slice(5); n.notice = n.soundPlaying ? 'Original instrumental preview playing.' : 'Preview paused.'; }
    else if (n.site === 'soundcloud' && id.startsWith('like-')) { n.liked = toggle(s.liked, id.slice(5)); n.notice = 'Track like updated.'; }
    else if (n.site === 'soundcloud' && id.startsWith('follow-')) { const artist = TRACKS.find(t => t.artistId === id.slice(7))?.artist || 'Nova Vale'; n.followedTopics = toggle(s.followedTopics, artist); n.notice = `Follow status updated for ${artist}.`; }
    else if (n.site === 'met-map' && id === 'floor-1') { n.mapFloor = 1; n.view = 'map'; n.selected = ''; n.mapRouting = false; n.mapPlace = ''; }
    else if (n.site === 'met-map' && id === 'floor-2') { n.mapFloor = 2; n.view = 'map'; n.selected = ''; n.mapRouting = false; n.mapPlace = ''; }
    else if (n.site === 'met-map' && id === 'zoom-in') n.mapZoom = Math.min(3, (s.mapZoom || 1) + .25);
    else if (n.site === 'met-map' && id === 'zoom-out') n.mapZoom = Math.max(.75, (s.mapZoom || 1) - .25);
    else if (n.site === 'met-map' && id === 'reset-map') n.mapZoom = 1;
    else if (n.site === 'met-map' && id === 'close-room') { n.selected = ''; n.mapPlace = ''; n.mapRouting = false; }
    else if (n.site === 'met-map' && id === 'directions') { n.view = 'map'; n.mapRouting = !s.mapRouting; }
    else if (n.site === 'met-map' && id === 'clear-map-search') { n.query = ''; n.mapAmenity = ''; n.mapPlace = ''; n.mapRouting = false; }
    else if (n.site === 'met-map' && id.startsWith('amenity-')) { n.view = 'map'; n.mapAmenity = s.mapAmenity === id.slice(8) ? '' : id.slice(8); n.query = AMENITIES.find(a => amenityKey(a) === n.mapAmenity) || ''; n.selected = ''; n.mapPlace = ''; n.mapRouting = false; }
    else if (n.site === 'met-map' && id.startsWith('place-')) { const place = MET_PLACES.find(p => p.id === id.slice(6))!; n.view = 'map'; n.mapPlace = place.id; n.selected = ''; n.mapRouting = false; if (place.floor === 1 || place.floor === 2) n.mapFloor = place.floor; n.mapZoom = Math.max(1.25, s.mapZoom || 1); }
    else if (n.site === 'met-map' && id.startsWith('room-')) { n.selected = id.slice(5); n.mapFloor = ROOMS.find(r => r.id === n.selected)!.floor as 1 | 2; n.mapPlace = ''; n.view = 'map'; n.mapRouting = false; n.notice = 'Gallery selected on the museum map.'; }
    else if (['cart', 'orders', 'wishlist', 'bookmarks'].includes(id)) n.view = id as SandboxState['view'];
    else if (id.startsWith('track-')) { n.view = 'tracking'; n.selected = id.slice(6); }
    else if (/^return-(?!reason-|method-)/.test(id) && s.orders.some(o => o.id === id.slice(7))) { n.view = 'returns'; n.selected = id.slice(7); n.returnStage = s.orders.find(o => o.id === n.selected)?.returnRequest ? 'confirmation' : 'reason'; n.returnReason = ''; n.returnMethod = ''; }
    else if (id.startsWith('return-reason-')) {
      n.returnReason = id === 'return-reason-fit' ? 'Does not fit' : id === 'return-reason-damaged' ? 'Item arrived damaged' : 'No longer needed'; n.returnStage = 'method';
    }
    else if (id === 'return-method-dropoff') { n.returnMethod = 'Free Demo Parcel drop-off'; n.returnStage = 'review'; }
    else if (id === 'return-edit') { n.returnStage = 'reason'; n.returnReason = ''; n.returnMethod = ''; }
    else if (id === 'submit-return') {
      const order = s.orders.find(o => o.id === s.selected);
      if (!order || order.status !== 'paid' || order.delivery?.status !== 'delivered' || order.returnRequest || s.returnStage !== 'review' || !s.returnReason || !s.returnMethod) throw new Error('Review an eligible delivered order and choose a return reason and method first.');
      n.orders = s.orders.map(o => o.id === order.id ? { ...o, returnRequest: { reason: s.returnReason!, method: s.returnMethod!, reference: `RETURN-${o.id}` } } : o);
      n.returnStage = 'confirmation'; n.notice = 'Demo return requested. No real refund or shipment was created.';
    }
    else if (id === 'settings') { n.view = 'settings'; n.draftLanguage = s.language; }
    else if (id === 'ask-question') { n.view = 'ask'; n.questionSpace = ''; }
    else if (id === 'spaces') { n.view = 'spaces'; n.selected = ''; }
    else if (id === 'space-business') { n.view = 'space'; n.selected = 'Business'; }
    else if (id === 'ask-business' || id === 'audience-business') { n.view = 'ask'; n.questionSpace = 'Business'; n.questionDraft = { ...n.questionDraft, topic: 'Business' }; }
    else if (id === 'audience-public') n.questionSpace = '';
    else if (id === 'notifications') { n.view = 'notifications'; n.notificationFilter = 'all'; }
    else if (id.startsWith('notifications-filter-')) n.notificationFilter = id.slice(21) as NotificationFilter;
    else if (id === 'notifications-mark-read') n.notifications = (s.notifications || []).map(item => ({ ...item, read: true }));
    else if (id.startsWith('notification-open-')) {
      const item = (s.notifications || []).find(item => item.id === id.slice(18))!;
      n.notifications = (s.notifications || []).map(entry => entry.id === item.id ? { ...entry, read: true } : entry);
      if (item.postId) { n.view = 'post'; n.selected = item.postId; } else { n.view = 'space'; n.selected = 'Business'; }
    }
    else if (id === 'search-submit') { n.view = 'home'; n.notice = `Search results for “${n.query || 'all'}”.`; }
    else if (id === 'checkout') { n.view = 'checkout'; n.checkoutStage = 'shipping'; }
    else if (id === 'use-demo-address') n.shipping = { name: 'Alex Demo', address: '123 Example Lane', city: 'Demo City', postcode: '10001' };
    else if (id === 'review-order') { if (!shippingValid(n)) n.notice = 'Enter a name, street address, city, and postal code, or use the sample address.'; else n.checkoutStage = 'review'; }
    else if (id === 'edit-shipping') n.checkoutStage = 'shipping';
    else if (id === 'payment-card') n.payment = 'Demo card •••• 4242';
    else if (id === 'payment-wallet') n.payment = 'Demo wallet';
    else if (id === 'pay-demo') {
      if (!itemCount(n) || !shippingValid(n) || n.checkoutStage !== 'review') throw new Error('A non-empty cart and reviewed shipping address are required.');
      const order: DemoOrder = { id: `DEMO-${String(s.orders.filter(o => /^DEMO-\d+$/.test(o.id)).length + 1).padStart(3, '0')}`, items: { ...n.cart }, total: total(n, lib), payment: n.payment, status: 'paid', placedAt: demoDate(0),
        delivery: { status: 'in-transit', eta: demoDate(2), carrier: 'Demo Parcel', trackingId: `DEMO-TRACK-${s.orders.length + 1}`, events: ['Order confirmed', 'Preparing for shipment'] } };
      n.orders = [...s.orders, order]; n.cart = {}; n.checkoutStage = 'confirmation'; n.notice = `Demo payment approved. Order ${order.id} confirmed. No real money was charged.`;
    } else if (id.startsWith('cancel-')) { n.orders = s.orders.map((o) => o.id === id.slice(7) ? { ...o, status: 'cancelled' } : o); n.notice = 'Order cancelled and demo refund recorded. No real payment was involved.'; }
    else if (id.startsWith('language-')) n.draftLanguage = LANGUAGES.find((l) => id === `language-${l.toLowerCase()}`)!;
    else if (id === 'save-language') { n.language = n.draftLanguage; n.notice = `Language saved: ${n.language}.`; }
    else if (id === 'post-question') {
      if (n.questionDraft.title.trim().length < 8 || n.questionDraft.body.trim().length < 10 || !n.questionDraft.topic.trim()) n.notice = 'Add a question title (8+ characters), details (10+ characters), and a topic.';
      else { const post: Post = { id: `user-question-${n.revision}`, title: n.questionDraft.title.trim(), body: n.questionDraft.body.trim(), topic: canonicalQuoraTopic(n.questionDraft.topic.trim()), author: 'You (demo)', answers: [], ...(s.questionSpace === 'Business' ? { space: 'Business' } : {}) }; n.userPosts = [post, ...s.userPosts]; n.selected = post.id; n.view = 'post'; n.questionDraft = { title: '', body: '', topic: 'Everyday life' }; n.notice = 'Your demo question was published.'; }
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
      if (id.startsWith('topic-')) { n.query = qt(n.language, topic); n.view = 'home'; } else { n.followedTopics = toggle(s.followedTopics, topic); n.notice = 'Followed topics updated.'; }
    } else if (id.startsWith('product-')) { n.view = 'product'; n.selected = id.slice(8); }
    else if (id.startsWith('wish-')) {
      const pid = id.slice(5), adding = !s.wishlist.includes(pid), name = lib.products.find((p) => p.id === pid)?.name || pid;
      n.wishlist = toggle(s.wishlist, pid);
      // On add, open the wishlist so the result is visible (and screenshottable as evidence).
      if (adding) { n.view = 'wishlist'; n.selected = ''; n.query = ''; n.notice = `${name} saved to your wishlist.`; }
      else n.notice = `${name} removed from your wishlist.`;
    }
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

const MET_AMENITY_TERMS: [RegExp, string][] = [
  [/\b(restrooms?|bathrooms?|toilets?)\b/i, 'restrooms'], [/\bcoffee\b/i, 'coffee-shops'], [/\b(dining|restaurants?|caf[eé]s?|somewhere to eat)\b/i, 'dining'],
  [/\binfo(rmation)? desk\b/i, 'information-desk'], [/\b(lactation|nursing) room\b/i, 'lactation-room'], [/\b(retail|gift shops?|museum stores?)\b/i, 'retail'], [/\b(water fountains?|drinking water)\b/i, 'water-fountains'],
];

export function verifySandboxTask(task: string, s: SandboxState, lib: Library, initial?: SandboxState): { supported: boolean; completed: boolean; answer: string; reason: string } {
  const checks: { passed: boolean; result: string; missing: string }[] = [];
  const mentioned = lib.products.filter((p) => new RegExp(`\\b${p.id.replace(/s$/, '')}s?\\b`, 'i').test(task));
  const paying = /\b(buy|purchase|pay|place an order|complete.{0,15}checkout|check out)\b/i.test(task);
  const quantityFor = (id: string) => Math.max(1, Number(task.match(new RegExp(`\\b(\\d+)\\s+(?:fresh\\s+|organic\\s+|crisp\\s+)?${id.replace(/s$/, '')}s?\\b`, 'i'))?.[1] || 1));
  const quoted = task.match(/["“]([^"”]+)["”]/)?.[1]?.toLowerCase();
  const topicRequested = [...new Set(allPosts(s, lib).map((p) => p.topic))].find((t) => task.toLowerCase().includes(t.toLowerCase()));
  if (s.site === 'amazon') {
    if (/\breturn\b/i.test(task) && /\bjacket\b/i.test(task)) {
      const returned = s.orders.find(o => o.items.jacket && o.returnRequest && !initial?.orders.find(before => before.id === o.id)?.returnRequest);
      checks.push({ passed: Boolean(returned), result: `Jacket demo return requested: ${returned?.returnRequest?.reference}. Drop-off instructions and refund estimate are available.`, missing: 'The jacket return has not been confirmed. Choose a reason and return method, review, then confirm the demo return.' });
    }
    if (/\b(track|tracking|arrive)\b/i.test(task)) {
      const tracked = s.orders.find(o => o.id === s.selected && o.status === 'paid');
      checks.push({ passed: s.view === 'tracking' && Boolean(tracked), result: `Tracking is open for ${tracked?.id}. ${tracked?.delivery?.status === 'delivered' ? 'Delivered' : 'Estimated arrival'}: ${tracked?.delivery?.eta || demoDate(2)}.`, missing: 'Open Track package for a recent order to show its tracking timeline and arrival estimate.' });
    }
    const order = s.orders.slice(initial?.orders.length || 0).find((o) => o.status === 'paid' && mentioned.every((p) => (o.items[p.id] || 0) >= quantityFor(p.id)) && (!/\bwallet\b/i.test(task) || o.payment === 'Demo wallet'));
    if (paying) checks.push({ passed: Boolean(order), result: `Demo payment approved for order ${order?.id}. No real money was charged.`, missing: 'A new paid demo order containing the requested items has not been confirmed.' });
    else if (/\b(add|put)\b/i.test(task) && /\bcart\b/i.test(task)) for (const p of mentioned) {
      const count = quantityFor(p.id);
      checks.push({ passed: (s.cart[p.id] || 0) >= (initial?.cart[p.id] || 0) + count, result: `${p.name} are in your cart (quantity: ${s.cart[p.id]}). No real order was placed.`, missing: `Expected ${count} additional ${p.id}; cart changed from ${initial?.cart[p.id] || 0} to ${s.cart[p.id] || 0}.` });
    }
    if (/\bwishlist\b/i.test(task)) for (const p of mentioned) checks.push({ passed: s.wishlist.includes(p.id), result: `${p.name} are saved to your wishlist.`, missing: `${p.name} are not in your wishlist.` });
    if (/\bcancel\b/i.test(task) && /\border\b/i.test(task)) checks.push({ passed: s.orders.some((o) => o.status === 'cancelled' && initial?.orders.some((before) => before.id === o.id && before.status === 'paid')), result: 'The demo order was cancelled and a simulated refund recorded.', missing: 'No previously paid demo order was cancelled during this run.' });
    if (!paying && /\b(open|go to|proceed to|start)\b.{0,30}\bcheckout\b/i.test(task)) checks.push({ passed: s.view === 'checkout' && itemCount(s) > 0, result: 'Demo checkout is open with items ready to review.', missing: 'Checkout must be open with a non-empty cart.' });
  } else if (s.site === 'quora') {
    if (/\bnotifications?\b/i.test(task)) checks.push({ passed: s.view === 'notifications' && s.notificationFilter === 'content', result: 'Notifications → Your content is open, showing activity on your questions and posts.', missing: 'Open Notifications and select Your content; the general notifications feed is not enough.' });
    if (/language/i.test(task)) { const language = LANGUAGES.find((l) => task.toLowerCase().includes(l.toLowerCase())); checks.push({ passed: Boolean(language && s.language === language), result: `Your demo language preference is saved as ${s.language}.`, missing: language ? `Expected saved language ${language}; it is still ${s.language}. Selecting without saving is not enough.` : 'No supported target language was specified.' }); }
    if (/\b(find|browse|read|open)\b/i.test(task) && /\b(post|posts|gardening|programming|cooking|travel)\b/i.test(task)) { const p = allPosts(s, lib).find((p) => p.id === s.selected), topic = ['gardening', 'programming', 'cooking', 'travel'].find((t) => task.toLowerCase().includes(t)); checks.push({ passed: s.view === 'post' && Boolean(p && (!topic || p.topic.toLowerCase() === topic)), result: `Opened “${p?.title}” for reading.`, missing: `A ${topic || 'matching'} post must be opened, not just listed in search results.` }); }
    if (/\bupvote\b/i.test(task)) checks.push({ passed: /\banswer\b/i.test(task) ? s.answerVotes.some((id) => !initial?.answerVotes.includes(id)) : Boolean(s.selected && s.liked.includes(s.selected)), result: 'The requested vote is recorded.', missing: 'The requested upvote was not recorded.' });
    if (/\b(ask|publish|post|create)\b.{0,30}\bquestion\b/i.test(task)) checks.push({ passed: s.userPosts.slice(0, s.userPosts.length - (initial?.userPosts.length || 0)).some((p) => (!topicRequested || p.topic === topicRequested || `${p.title} ${p.body}`.toLowerCase().includes(topicRequested.toLowerCase())) && (!quoted || p.title.toLowerCase().includes(quoted)) && (!/\bbusiness\s+space\b/i.test(task) || p.space === 'Business')), result: 'Your demo question was published.', missing: 'No new question was published.' });
    if (/\b(write|publish|post|add)\b.{0,30}\banswer\b/i.test(task)) checks.push({ passed: Object.entries(s.addedAnswers).some(([id, answers]) => answers.slice(initial?.addedAnswers[id]?.length || 0).some((a) => !quoted || a.text.toLowerCase().includes(quoted))), result: 'Your demo answer was published.', missing: 'No new answer was published; a draft alone does not count.' });
    if (/\b(write|publish|post|add|leave)\b.{0,30}\bcomment\b/i.test(task)) checks.push({ passed: Object.entries(s.addedComments).some(([id, comments]) => comments.slice(initial?.addedComments[id]?.length || 0).some((c) => !quoted || c.text.toLowerCase().includes(quoted))), result: 'Your demo comment was posted.', missing: 'No new comment was posted; a draft alone does not count.' });
    if (/\bfollow\b/i.test(task)) { const topic = allPosts(s, lib).map((p) => p.topic).find((t) => task.toLowerCase().includes(t.toLowerCase())); checks.push({ passed: Boolean(topic && s.followedTopics.includes(topic)), result: `You are following ${topic}.`, missing: 'The requested topic is not followed.' }); }
    if (/\b(save|bookmark)\b.{0,20}\bpost\b/i.test(task)) checks.push({ passed: Boolean(s.selected && s.bookmarks.includes(s.selected)), result: 'The opened post is saved.', missing: 'The opened post has not been saved.' });
  } else if (s.site === 'soundcloud') {
    if (/\b(upgrade|premium)\b/i.test(task)) checks.push({ passed: s.spotifyPlan === 'Premium', result: 'The demo account is now on Spotify Premium. No real subscription or charge.', missing: 'Select Premium, review the demo plan, and confirm the upgrade.' });
    if (/hide midnight signals/i.test(task) && /block nova vale/i.test(task) && !/\b(unhide|unblock)\b/i.test(task)) {
      checks.push({ passed: Boolean(s.hiddenTracks?.includes('midnight') && s.hiddenArtists?.includes('nova')), result: 'Midnight Signals is hidden and Nova Vale is blocked in Content preferences.', missing: 'Hide Midnight Signals and block Nova Vale. Leave both preferences enabled.' });
    } else if (/\b(hide|unhide)\b/i.test(task)) {
      const changes = (s.visibilityHistory || []).slice(initial?.visibilityHistory?.length || 0);
      const restored = (kind: string) => changes.some(change => change.startsWith(`hide-${kind}-`) && changes.slice(changes.indexOf(change) + 1).includes(`un${change}`));
      checks.push({ passed: restored('track') && restored('artist'), result: 'A song and an artist were hidden and restored in Content preferences.', missing: 'Use Content preferences to hide and then unhide both a song and an artist.' });
    }
    if (/\bdiscord\b/i.test(task)) checks.push({ passed: Boolean(s.discordConnected && s.jamStarted && s.jamShared && s.discordInvited && s.friendJoined && s.selected && s.soundPlaying !== false), result: 'A local track is playing and Alex Demo joined the simulated Discord listening session. No real Discord messages or live sync.', missing: 'Play a track, start a Jam, share the demo invite, connect demo Discord, send it to Demo Friends, and simulate a friend joining.' });
    if (/\bplay\b/i.test(task)) {
      const track = /midnight/i.test(task) ? 'midnight' : /summer/i.test(task) ? 'summer' : /green room/i.test(task) ? 'greenroom' : '';
      checks.push({ passed: Boolean(track && s.selected === track && s.soundPlaying !== false), result: 'The requested fictional track preview is playing.', missing: 'The requested track preview is not playing.' });
    }
    if (/\blike\b/i.test(task)) {
      const track = /midnight/i.test(task) ? 'midnight' : /summer/i.test(task) ? 'summer' : /green room/i.test(task) ? 'greenroom' : '';
      checks.push({ passed: Boolean(track && s.liked.includes(track)), result: 'The requested track is liked.', missing: 'The requested track is not liked.' });
    }
    if (/\bfollow\b/i.test(task)) {
      const artist = /nova/i.test(task) ? 'Nova Vale' : /lena/i.test(task) ? 'Lena Parks' : /coastline|green room/i.test(task) ? 'The Coastline' : '';
      checks.push({ passed: Boolean(artist && s.followedTopics.includes(artist)), result: `You are following ${artist}.`, missing: 'The requested artist is not followed.' });
    }
  } else if (s.site === 'met-map') {
    // Accept any gallery that legitimately matches the task name (two galleries are "European Paintings").
    const rooms = /temple/i.test(task) ? ['temple'] : /european paintings|impressionists/i.test(task) ? ['impressionists', 'european-old-masters']
      : ROOMS.filter(room => task.toLowerCase().includes(room.title.toLowerCase()) || new RegExp(`\\b${room.gallery}\\b`).test(task)).map(room => room.id);
    // The last floor named is the destination: "go from Floor 2 to Floor 1" ends on Floor 1.
    const floor = Number(Array.from(task.matchAll(/\bfloor\s*([12])\b/gi)).pop()?.[1] || 0);
    if (floor) checks.push({ passed: s.mapFloor === floor, result: `Floor ${floor} is open on the map.`, missing: `Floor ${floor} is not open.` });
    const place = MET_PLACES.find(p => task.toLowerCase().includes(p.name.toLowerCase()));
    const amenity = MET_AMENITY_TERMS.find(([pattern]) => pattern.test(task))?.[1];
    if (place) checks.push({ passed: s.mapPlace === place.id, result: `${place.name} is selected on the museum map.`, missing: `${place.name} is not selected on the map.` });
    else if (amenity) {
      const shown = new Set(sandboxDoc(s, lib).blocks.map(b => b.id));
      checks.push({ passed: placesForAmenity(amenity).some(p => p.id === s.mapPlace || shown.has(`place-${p.id}`)), result: 'The requested museum services are shown on the map.', missing: 'The requested museum services are not shown on the map.' });
    } else if (rooms.length && /\b(open|find|locate|show|go to|navigate|take me|directions?|route)\b/i.test(task)) checks.push({ passed: rooms.includes(s.selected), result: 'The requested gallery is selected on the museum map.', missing: 'The requested gallery is not selected on the map.' });
    if (/\b(directions?|route)\b/i.test(task) && !/\b(hide|clear|remove|close)\b/i.test(task)) checks.push({ passed: Boolean(s.mapRouting), result: 'The walking route is displayed.', missing: 'The walking route is not displayed. Select the destination, then use Get directions.' });
    const startZoom = initial?.mapZoom || 1, zoom = s.mapZoom || 1;
    if (/\bzoom(ed|ing)?\s+in\b/i.test(task)) checks.push({ passed: zoom > startZoom, result: `The map zoomed in to ${zoom}.`, missing: 'The map has not zoomed in.' });
    if (/\bzoom(ed|ing)?\s+out\b/i.test(task)) checks.push({ passed: zoom < startZoom, result: `The map zoomed out to ${zoom}.`, missing: 'The map has not zoomed out.' });
  }
  if (!checks.length) return { supported: false, completed: false, answer: 'This task needs page-evidence verification.', reason: 'No deterministic state check applies to this task.' };
  const completed = checks.every((c) => c.passed), reason = completed ? 'All requested state changes were checked against the actual sandbox state.' : checks.filter((c) => !c.passed).map((c) => c.missing).join(' ');
  return { supported: true, completed, answer: completed ? checks.map((c) => c.result).join(' ') : reason, reason };
}
