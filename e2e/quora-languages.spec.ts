import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';
import { initialSandbox, applySandboxAction, sandboxDoc } from '../lib/sandboxes';
import { QUORA_CONTENT } from '../lib/quora-translations';

const locales = [
  { name: 'Spanish', code: 'es', settings: 'Configuración', ask: 'Hacer una pregunta', save: 'Guardar configuración de idioma', home: 'Preguntas que vale la pena explorar', title: '¿Cómo puedo cultivar un naranjo en casa?' },
  { name: 'French', code: 'fr', settings: 'Paramètres', ask: 'Poser une question', save: 'Enregistrer la langue', home: 'Des questions à découvrir', title: 'Comment faire pousser un oranger chez soi ?' },
  { name: 'Vietnamese', code: 'vi', settings: 'Cài đặt', ask: 'Đặt câu hỏi', save: 'Lưu cài đặt ngôn ngữ', home: 'Những câu hỏi đáng khám phá', title: 'Làm thế nào để trồng cây cam tại nhà?' },
  { name: 'English', code: 'en', settings: 'Settings', ask: 'Ask a question', save: 'Save language settings', home: 'Questions worth exploring', title: 'How do I grow an orange tree at home?' },
];

test('saving each language translates the entire Quora UI and built-in discussions, and preserves working controls', async ({ page }) => {
  test.setTimeout(90000);
  await page.route('**/api/library', r => r.fulfill({ json: { library } }));
  await page.goto('/');
  await page.getByRole('button', { name: /Quora sandbox/ }).click();
  const site = page.locator('[data-sandbox-root]');
  for (const locale of locales) {
    await site.locator('[data-node-id="settings"]').click();
    await site.locator(`[data-node-id="language-${locale.name.toLowerCase()}"]`).click();
    // Selection alone does not change the interface; Save is the committing action.
    await site.locator('[data-node-id="save-language"]').click();
    await expect(site).toHaveAttribute('lang', locale.code);
    await expect(site.locator('[data-node-id="settings"]')).toHaveText(locale.settings);
    await expect(site.locator('[data-node-id="ask-question"]')).toHaveText(locale.ask);
    await expect(site.locator('[data-node-id="save-language"]')).toHaveText(locale.save);
    await site.locator('[data-node-id="ask-question"]').click();
    await expect(site.locator('input[data-node-id="question-title"]')).toBeVisible();
    // Navigating away and back keeps the saved language.
    await site.locator('[data-node-id="home"]').click();
    await expect(site.locator('[data-node-id="page-title"]')).toHaveText(locale.home);
    await expect(site.locator('[data-node-id="title-growing-oranges"]')).toHaveText(locale.title);
    await site.locator('[data-node-id="post-growing-oranges"]').click();
    const translated = QUORA_CONTENT[locale.name]?.['growing-oranges'];
    await expect(site.locator('[data-node-id="answer-text-citrus-care"]')).toHaveText(translated?.[2] || library.posts[0].answers[0].text);
    await expect(site.locator('[data-node-id="comment-c1"]')).toContainText(translated?.[4] || library.posts[0].answers[0].comments[0].text);
    if (locale.name === 'Spanish') await page.screenshot({ path: '/tmp/quora-spanish.png' });
    if (locale.name === 'French') {
      await page.reload();
      await page.getByRole('button', { name: /Quora sandbox/ }).click();
      await expect(site).toHaveAttribute('lang', 'fr');
    }
  }
});

test('localized topics are searchable; stable action IDs and user-authored content survive language changes', () => {
  let s = initialSandbox('quora');
  const act = (id: string, value?: string) => { s = applySandboxAction(s, { type: value === undefined ? 'click' : 'fill', id, value }, library).state; };
  act('settings'); act('language-spanish'); act('save-language'); act('home');
  act('search', 'jardinería');
  expect(sandboxDoc(s, library).blocks.filter(b => b.id.startsWith('title-'))).toHaveLength(2);
  act('ask-question');
  act('question-title', 'My own custom question'); act('question-body', 'My original words should not be translated.'); act('question-topic', 'Jardinería'); act('post-question');
  expect(s.userPosts[0].topic).toBe('Gardening');
  expect(sandboxDoc(s, library).blocks.find(b => b.id === `body-${s.selected}`)?.text).toBe('My original words should not be translated.');
  for (const language of ['French', 'Vietnamese', 'English']) {
    act('settings'); act(`language-${language.toLowerCase()}`); act('save-language');
    expect(s.language).toBe(language);
    expect(s.userPosts[0].body).toBe('My original words should not be translated.');
  }
});
