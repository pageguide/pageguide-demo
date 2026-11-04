import { MANUAL_TASKS, MANUAL_QUESTION } from './manual-tasks';
import type { SandboxState } from './sandboxes';
import type { Library } from './library';

type Verdict = { supported: boolean; completed: boolean; answer: string; reason: string };

/** Named lessons have explicit postconditions; a model's success claim is not proof. */
export function verifyManualTask(task: string, s: SandboxState, lib: Library, initial?: SandboxState): Verdict | null {
  const preset = MANUAL_TASKS.find(t => t.prompt === task.trim());
  if (!preset) return null;
  const checks: { passed: boolean; missing: string }[] = [];
  const check = (passed: boolean, missing: string) => checks.push({ passed, missing });
  check(preset.site === s.site, 'The lesson must finish in its matching sandbox.');
  let answer = '';
  const baseOrders = initial?.orders || [];
  const newOrders = s.orders.slice(baseOrders.length);
  const sampleAddress = s.shipping.name === 'Alex Demo' && s.shipping.address === '123 Example Lane' && s.shipping.city === 'Demo City' && s.shipping.postcode === '10001';
  const existingOrdersUnchanged = baseOrders.every((order, i) => JSON.stringify(order) === JSON.stringify(s.orders[i]));

  switch (preset.id) {
    case 'amazon-review':
      check(s.view === 'checkout' && s.checkoutStage === 'review', 'Open the order review, not just the shipping form.');
      check((s.cart.oranges || 0) >= (initial?.cart.oranges || 0) + 2 && (s.cart.coffee || 0) >= (initial?.cart.coffee || 0) + 1, 'The cart must contain two additional bags of oranges and one additional coffee.');
      check(Object.entries(initial?.cart || {}).every(([id, n]) => (s.cart[id] || 0) >= n), 'Keep the items that were already in the cart.');
      check(sampleAddress, 'Use the sample delivery address, not real personal details.');
      check(newOrders.length === 0 && s.orders.length === baseOrders.length && existingOrdersUnchanged, 'This lesson must stop before payment without creating or changing any order.');
      answer = 'The additional oranges and coffee are ready on the order review page with the sample address. No order was submitted and no payment was made.';
      break;
    case 'amazon-payment': {
      const order = newOrders.find(o => o.status === 'paid' && o.payment === 'Demo wallet' && (o.items.oranges || 0) >= (initial?.cart.oranges || 0) + 1 && Object.entries(initial?.cart || {}).every(([id, n]) => (o.items[id] || 0) >= n));
      check(Boolean(order), 'A new paid demo-wallet order containing the additional oranges and the original cart items is required.');
      check(sampleAddress, 'Use the sample delivery address.');
      check(s.view === 'checkout' && s.checkoutStage === 'confirmation', 'Show the order confirmation.');
      check(existingOrdersUnchanged, 'Do not modify previous orders.');
      const calculated = order && Math.round(lib.products.reduce((sum, p) => sum + p.price * (order.items[p.id] || 0), 0) * 100) / 100;
      check(Boolean(order && order.total === calculated), 'The confirmed order total must match its actual items.');
      answer = `Demo-wallet order ${order?.id || ''} is confirmed using the sample address. No real money was charged.`;
      break;
    }
    case 'quora-publish': {
      const newPosts = s.userPosts.filter(p => !initial?.userPosts.some(before => before.id === p.id));
      const post = newPosts.find(p => p.title === MANUAL_QUESTION.title && p.body === MANUAL_QUESTION.body && p.topic === MANUAL_QUESTION.topic);
      check(Boolean(post), 'Publish a new question with the exact sample title, details, and Gardening topic; a draft is not enough.');
      check(Boolean(post && s.view === 'post' && s.selected === post.id), 'Finish with the newly published question open.');
      answer = 'Your fictional Gardening question was published with the reviewed sample text and is open for inspection.';
      break;
    }
    case 'quora-language':
      check(s.language === 'Spanish' && s.draftLanguage === 'Spanish', 'Save Spanish, rather than only selecting it.');
      check(s.view === 'home', 'Return to the translated home feed after saving.');
      answer = 'Spanish is saved and the translated Quora home feed is open.';
      break;
    case 'soundcloud-listen':
      check(s.selected === 'midnight', 'Choose the Midnight Signals preview first.');
      check(s.liked.includes('midnight'), 'Midnight Signals must be liked.');
      check(s.followedTopics.includes('Nova Vale'), 'Nova Vale must be followed.');
      check(s.view === 'library', 'Finish in your Library.');
      answer = 'Midnight Signals is saved in your Library and Nova Vale is followed. The decision to save and follow remained yours.';
      break;
    case 'soundcloud-undo':
      check(Boolean(initial?.liked.includes('midnight') && initial.followedTopics.includes('Nova Vale')), 'Start with a saved Midnight Signals like and a Nova Vale follow so there is something to undo.');
      check(!s.liked.includes('midnight') && !s.followedTopics.includes('Nova Vale'), 'Remove both the Midnight Signals like and the Nova Vale follow.');
      check(s.view === 'library', 'Finish in your Library to inspect the change.');
      answer = 'The previous Midnight Signals like and Nova Vale follow were removed; your Library is open.';
      break;
    case 'met-dining':
    case 'met-restrooms': {
      const dining = preset.id === 'met-dining';
      check(s.mapAmenity === (dining ? 'dining' : 'restrooms'), `Keep the ${dining ? 'Dining' : 'Restrooms'} filter active.`);
      check(s.mapPlace === (dining ? 'balcony-lounge' : 'restroom-balcony-2'), `Select ${dining ? 'The Balcony Lounge' : 'Balcony Restrooms'}, not just a gallery or the results list.`);
      check(s.mapFloor === 2 && s.view === 'map', 'The Floor 2 map must be visible.');
      check(s.mapRouting === true, 'Display the selected destination’s illustrative route.');
      answer = `${dining ? 'The Balcony Lounge' : 'Balcony Restrooms'} is selected on Floor 2 with its service filter and illustrative route displayed. This is not live navigation or an accessibility guarantee.`;
      break;
    }
    default: return null;
  }
  const completed = checks.every(c => c.passed);
  const reason = completed ? 'All lesson postconditions were checked against the actual sandbox state.' : checks.filter(c => !c.passed).map(c => c.missing).join(' ');
  return { supported: true, completed, answer: completed ? answer : reason, reason };
}
