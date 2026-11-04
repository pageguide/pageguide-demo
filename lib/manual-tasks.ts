import type { SandboxSite, SandboxState } from './sandboxes';
import type { Library } from './library';

export interface ManualTask {
  id: string;
  site: SandboxSite;
  title: string;
  shortLabel: string;
  kind: 'Review before action' | 'Personal judgment' | 'Learn the controls';
  goal: string;
  whyManual: string;
  prompt: string;
}

export const MANUAL_QUESTION = {
  title: 'Which herbs grow well on a sunny balcony?',
  body: 'My balcony gets four hours of sunlight. Which beginner-friendly herbs should I try?',
  topic: 'Gardening',
};

// Recommendations, not a claim that every task technically requires manual execution.
// Research and the distinction between review and mandatory confirmation: docs/manual-mode-tasks.md.
export const MANUAL_TASKS: ManualTask[] = [
  {
    id: 'amazon-review', site: 'amazon', title: 'Review checkout without paying', shortLabel: 'Review checkout', kind: 'Review before action',
    goal: 'Add two bags of oranges and one coffee; stop at the order review.',
    whyManual: 'Check quantities, prices, and the sample delivery address before any commitment.',
    prompt: 'Guide me in Manual mode. Keep anything already in my demo cart and add 2 more bags of oranges and 1 more ground coffee. Open checkout, use the sample address, and stop on the order review screen so I can inspect every item, quantity, address, and total. Do not submit a payment or create an order. Finish on the unpaid order review page.',
  },
  {
    id: 'amazon-payment', site: 'amazon', title: 'Review and approve a demo payment', shortLabel: 'Approve payment', kind: 'Review before action',
    goal: 'Add oranges, inspect checkout, and explicitly approve a simulated wallet payment.',
    whyManual: 'Financial commitments deserve a clear review point and an intentional final click.',
    prompt: 'Guide me in Manual mode. Keep anything already in my demo cart and add 1 more bag of oranges. Open checkout, use the sample address, review all items and the total with me, select Demo wallet, then highlight the demo payment button and wait for my click. After I approve it, pay with Demo wallet and show the order confirmation. This is a simulation; never ask for real address or payment details.',
  },
  {
    id: 'quora-publish', site: 'quora', title: 'Review a question before publishing', shortLabel: 'Review & post', kind: 'Review before action',
    goal: 'Prepare a fictional Gardening question, inspect it, and approve publication.',
    whyManual: 'Posting speaks on your behalf; you should review the exact text and topic first.',
    prompt: `Guide me in Manual mode to publish a fictional demo question. Open Ask a question. Set the title to "${MANUAL_QUESTION.title}", the details to "${MANUAL_QUESTION.body}", and the topic to ${MANUAL_QUESTION.topic}. Let me inspect those fields before I click the highlighted Publish demo question button. Publish only after my approval and finish with that new question open. Do not use personal information.`,
  },
  {
    id: 'quora-language', site: 'quora', title: 'Learn to change the interface language', shortLabel: 'Change language', kind: 'Learn the controls',
    goal: 'Save Spanish as the interface language and inspect the translated home feed.',
    whyManual: 'Learn a reversible preference change and verify the whole interface, not just a notice.',
    prompt: 'Guide me in Manual mode to change the Quora interface language to Spanish. Open Settings, select Spanish, save the language settings, then return to the Home feed so I can inspect the translated questions and navigation. Wait for my click at every step; merely selecting a language without saving is not enough.',
  },
  {
    id: 'soundcloud-listen', site: 'soundcloud', title: 'Listen, decide, and save', shortLabel: 'Listen & save', kind: 'Personal judgment',
    goal: 'Audition Midnight Signals, approve a like and a follow, then inspect your Library.',
    whyManual: 'An agent cannot decide your musical taste. Listen before choosing whether to continue.',
    prompt: 'Guide me in Manual mode. Start the original preview of Midnight Signals so I can listen. Then show me how to like Midnight Signals and follow Nova Vale, pausing before each action so I can choose to continue or stop. If a like or follow is already saved, keep it saved rather than toggling it off. Finish in my Library with Midnight Signals liked and Nova Vale followed. Do not claim that you judged the music or that I listened for any particular duration.',
  },
  {
    id: 'soundcloud-undo', site: 'soundcloud', title: 'Change your mind about a saved artist', shortLabel: 'Undo like & follow', kind: 'Personal judgment',
    goal: 'Undo the Midnight Signals like and the Nova Vale follow, then check your Library.',
    whyManual: 'Practice correcting a recommendation and keeping your collection under your control.',
    prompt: 'Guide me in Manual mode to undo my saved preferences: unlike Midnight Signals and unfollow Nova Vale. Highlight each control and wait for my click rather than making that personal choice for me. Finish in my Library with Midnight Signals not liked and Nova Vale not followed.',
  },
  {
    id: 'met-dining', site: 'met-map', title: 'Review a dining stop and its floor', shortLabel: 'Choose dining', kind: 'Personal judgment',
    goal: 'Review Dining results, select The Balcony Lounge, and inspect its Floor 2 route.',
    whyManual: 'Check the venue and service level yourself; museum hours and access are not live here.',
    prompt: 'Guide me in Manual mode on the museum map. Show the Dining amenity results so I can review the choices. Use The Balcony Lounge as the sample destination: select it, verify Floor 2, and show its illustrative directions. Wait for me to click each highlighted control and finish with the Dining filter active, The Balcony Lounge selected, Floor 2 visible, and its route displayed. Do not claim live opening hours, live positioning, or a verified accessible route.',
  },
  {
    id: 'met-restrooms', site: 'met-map', title: 'Learn to find a Floor 2 restroom', shortLabel: 'Find restroom', kind: 'Learn the controls',
    goal: 'Use Restrooms, select Balcony Restrooms, and inspect the illustrative route.',
    whyManual: 'Learn the service filter and check the floor before relying on a location.',
    prompt: 'Guide me in Manual mode to find Balcony Restrooms on Floor 2. Open the Restrooms amenity results, select Balcony Restrooms, and display its illustrative directions. Wait for my click at each step. Finish with the Restrooms filter active, Balcony Restrooms selected, Floor 2 visible, and its route displayed. This is practice with a simplified local map, not live navigation or an accessibility guarantee.',
  },
];

export const manualTasksFor = (site: SandboxSite) => MANUAL_TASKS.filter(task => task.site === site);

/** Explicit prerequisites: starting a lesson never silently resets an existing session. */
export function manualTaskUnavailableReason(task: ManualTask, state: SandboxState, library: Library): string | null {
  if (task.site !== state.site) return 'Open the matching sandbox first.';
  if (task.site === 'amazon') {
    if (!library.products.some(p => p.id === 'oranges')) return 'This lesson needs oranges in the demo catalog.';
    if (task.id === 'amazon-review' && !library.products.some(p => p.id === 'coffee')) return 'This lesson needs coffee in the demo catalog.';
    if ((state.cart.oranges || 0) > (task.id === 'amazon-review' ? 97 : 98) || (task.id === 'amazon-review' && (state.cart.coffee || 0) > 98)) return 'Reduce the cart quantities or reset this sandbox before this lesson; an item cannot exceed 99.';
  }
  if (task.id === 'soundcloud-undo' && (!state.liked.includes('midnight') || !state.followedTopics.includes('Nova Vale'))) return 'First complete “Listen, decide, and save” so there is a saved like and follow to undo.';
  return null;
}
