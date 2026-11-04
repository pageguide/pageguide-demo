# When Manual mode is useful

## Research and limits

Manual mode is a recommendation for these practice tasks, **not a technical necessity for every click**. The strongest reason to keep a human involved is a consequential commitment, an uncertain/personal choice, or a deliberate learning goal. Routine navigation and repeatable low-risk work are usually good Auto candidates. Auto still retains the existing payment/post/cancellation confirmation gates.

Primary sources reviewed:

1. [W3C: Understanding WCAG 2.2 SC 3.3.4, Error Prevention (Legal, Financial, Data)](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html). The guidance describes important submissions being reversible, checked, or confirmed, including a mechanism for “reviewing, confirming, and correcting information before finalizing the submission.” Its order-confirmation example explicitly includes items, quantities, shipping address, and payment method. It **does not prescribe a Manual mode or require confirmation for every save or simple creation/editing action**. The published document was retrieved over HTTPS; the same passages were checked in the rendered [official editor’s mirror](https://w3c.github.io/wcag/understanding/error-prevention-legal-financial-data.html), which identifies itself as an unpublished draft. The direct published page presented a browser security check; that challenge is not evidence for its content.
2. [Microsoft Research: Guidelines for human–AI interaction design](https://www.microsoft.com/en-us/research/blog/guidelines-for-human-ai-interaction-design/), with the associated [CHI 2019 publication](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/). Relevant guidelines include efficient dismissal (8), correction/recovery (9), disambiguation when goals are uncertain (10), granular preference feedback (15), conveying action consequences (16), and global controls (17). These support stopping, inspecting, choosing, correcting, and explicitly controlling automation. They do not prove that step-by-step manual execution is always faster or better.

The task selection below is an engineering application of these principles, not a claim that either source mandates these particular demos. Google PAIR was attempted but did not render usable text in the research session and is not used as evidence.

## Added lessons

Each sandbox’s existing task bar contains two compact **Manual:** buttons beside the Guide buttons—for example, **Manual: Review checkout** and **Manual: Approve payment**. There is no separate section, picker, or modal. The full goal, “Why Manual?” explanation, and prerequisite are in the hover title and accessible description. Clicking a Manual button sets Manual mode before the full request reaches the agent. Every executable action uses the existing user-approval/arrow flow. A shortcut never resets existing work.

| Sandbox | Lesson | Why a person should remain involved | Verified finish |
| --- | --- | --- | --- |
| Amazon | Review checkout without paying | Inspect quantities, total, and the sample address before commitment. | Original cart retained, two additional oranges and one additional coffee, sample shipping, review stage, no new or modified order. |
| Amazon | Review and approve a demo payment | Deliberately approve a financial-like commitment after review. | Additional oranges, original cart items retained in a new paid Demo wallet order, correct total, sample address, confirmation displayed; no real charge. |
| Quora | Review a question before publishing | Check text and topic before the system speaks on the user’s behalf. This is a design recommendation, not a WCAG requirement for every post. | A newly published question has the exact sample title, details, and topic and is open. A draft is not completion. |
| Quora | Learn to change the interface language | Learn a reversible preference change and inspect its actual effect. | Spanish saved and translated home feed open; selection alone fails. |
| SoundCloud | Listen, decide, and save | Musical preference is the user’s judgment, not something a model should claim to have decided for them. | Midnight Signals preview chosen, track liked, Nova Vale followed, Library open. No claim that the user listened for a specific duration or liked the sound. |
| SoundCloud | Change your mind about a saved artist | Practice correcting/reversing saved preferences. | A previously existing Midnight Signals like and Nova Vale follow are removed; Library open. Disabled until both preferences exist. |
| Met map | Review a dining stop and its floor | Check the sample venue and service level before relying on a location. | Dining filter, Balcony Lounge selected, Floor 2 visible, illustrative route displayed. |
| Met map | Learn to find a Floor 2 restroom | Learn service filters and inspect the correct floor. | Restrooms filter, Balcony Restrooms selected, Floor 2 visible, illustrative route displayed. |

## Implementation boundaries

- These use actual reducer-backed sandbox controls, not scripted success messages. The model still proposes the next action from the live page; no task shortcut silently performs the transaction.
- Exact lesson prompts get dedicated state postconditions before generic natural-language verification. A model’s `finish` action alone cannot mark the lesson complete. Verification remains internal, represented by the existing status badge.
- Cart lessons preserve existing items. Capacity limits and missing demo products are explained before a lesson starts; no automatic reset occurs.
- Posting and payment remain gated by explicit approval. Stop/Deny remains available.
- SoundCloud’s artist controls remain reachable in narrow layouts. Listening is an original local preview, not a real artist account.
- Museum service points and routes are illustrative. The lessons make no live-hours, live-positioning, step-free-route, or accessibility guarantee. A physical navigation/accessibility decision needs authoritative museum information beyond this sandbox.
- Tasks use sample addresses and fictional content only. The research does not justify asking for private account credentials or real payment information.

## Main code

- `lib/manual-tasks.ts`: catalog, prompts, prerequisites.
- `lib/manual-task-verification.ts`: explicit lesson postconditions.
- `components/SandboxTaskBar.tsx`: compact inline shortcuts and Manual-mode launch.
- `components/surfaces/ExtensionSurface.tsx`: sandbox toolbar integration.
- `e2e/manual-task-presets.spec.ts`: state checks, incomplete-state rejection, inline shortcut behavior, and real Manual-mode task flows with mocked model responses.
