const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('anonymous simulation makes no external requests and Find highlights source', async ({ page }) => {
  const external = [];
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:8080')) external.push(request.url()); });
  await page.reload();
  await page.getByRole('button', { name: 'When is the best time to visit?' }).click();
  await expect(page.locator('#season-evidence')).toHaveClass(/evidence-highlight/);
  await expect(page.locator('.response')).toContainText('April to June');
  await page.locator('#prompt').fill('What should I pack?');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('#packing-evidence')).toHaveClass(/evidence-highlight/);
  await page.locator('#prompt').fill('Tell me a secret');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('.response').last()).toContainText('scripted demo');
  expect(external).toEqual([]);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie }))).toEqual({local:0,session:0,cookies:''});
});

test('Guide walks through the actual interactive controls', async ({ page }) => {
  await page.locator('#tab-guide').click();
  await page.getByRole('button', { name: 'Help me turn off the weekly email digest' }).click();
  await expect(page.locator('#notifications-tab')).toHaveClass(/guide-target/);
  await page.locator('#notifications-tab').click();
  await expect(page.locator('#digest-toggle')).toHaveClass(/guide-target/);
  await page.locator('#digest-toggle').click();
  await expect(page.locator('#digest-toggle')).toHaveAttribute('aria-checked','false');
  await expect(page.locator('#save-settings')).toHaveClass(/guide-target/);
  await page.locator('#save-settings').click();
  await expect(page.locator('#save-status')).toContainText('Saved');
  await expect(page.locator('.response').last()).toContainText('Walkthrough complete');
  await page.getByRole('button', { name: 'Reset this demo' }).click();
  await expect(page.locator('#general-tab')).toHaveAttribute('aria-selected','true');
});

test('Hide is reversible and previews work', async ({ page }) => {
  await page.locator('#tab-hide').click();
  await expect(page.locator('[data-noise]:visible')).toHaveCount(2);
  await page.getByRole('button', {name:'Hide the ads and newsletter signup'}).click();
  await expect(page.locator('[data-noise]:visible')).toHaveCount(0);
  await page.getByRole('button', {name:'Undo hiding'}).click();
  await expect(page.locator('[data-noise]:visible')).toHaveCount(2);
  await page.locator('#tab-more').click();
  await page.getByRole('button', {name:'Find the bottle in this sample image'}).click();
  await expect(page.locator('#product-sage')).toHaveClass(/evidence-highlight/);
  await page.getByRole('button', {name:'PDF',exact:true}).click();
  await page.getByRole('button', {name:'What does the guide say about leaving no trace?'}).click();
  await expect(page.locator('#pdf-evidence')).toHaveClass(/evidence-highlight/);
  await page.getByRole('button', {name:'Answer',exact:true}).click();
  await expect(page.locator('#context-label')).toContainText('off');
  await page.getByRole('button', {name:'Why is the sky blue?'}).click();
  await expect(page.locator('.response').last()).toContainText('Rayleigh');
});

async function connect(page) {
  await page.locator('#live-settings summary').click();
  await page.locator('#api-key').fill('sk-test-not-real');
  await page.locator('#api-consent').check();
  await page.getByRole('button', {name:'Enable live mode'}).click();
  await expect(page.locator('#api-key')).toHaveValue('');
}
function completion(result) { return { choices: [{ finish_reason:'stop',message:{content:JSON.stringify(result)} }] }; }

test('live OpenAI Find sends sandbox context and renders model text safely', async ({ page }) => {
  let body;
  await page.route('https://api.openai.com/v1/chat/completions', async route => {
    body = route.request().postDataJSON();
    expect(route.request().headers().authorization).toBe('Bearer sk-test-not-real');
    await route.fulfill({json:completion({answer:'<img src=x onerror=alert(1)> April to June',evidenceId:'season-evidence',steps:[]})});
  });
  await connect(page);
  await page.getByRole('button', {name:'When is the best time to visit?'}).click();
  await expect(page.locator('#season-evidence')).toHaveClass(/evidence-highlight/);
  await expect(page.locator('.response').last()).toContainText('<img src=x onerror=alert(1)>');
  expect(body.model).toBe('gpt-4.1-mini');
  expect(body.messages[1].content).toContain('season-evidence');
  expect(body.messages[1].content).not.toContain('sk-test');
  expect(body.messages[1].content).not.toContain('api-key');
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.reload();
  await expect(page.locator('.scripted')).toHaveText('Scripted demo');
});

test('live OpenAI Guide uses only validated targets and follows user clicks', async ({ page }) => {
  await page.route('https://api.openai.com/v1/chat/completions', route => route.fulfill({json:completion({answer:'Turn off the weekly digest.',evidenceId:'',steps:[{target:'notifications-tab',instruction:'Open Notifications.'},{target:'digest-toggle',instruction:'Turn the weekly digest off.'},{target:'save-settings',instruction:'Save your changes.'}]})}));
  await connect(page);
  await page.locator('#tab-guide').click();
  await page.getByRole('button', {name:'Help me turn off the weekly email digest'}).click();
  await expect(page.locator('#notifications-tab')).toHaveClass(/guide-target/);
  await page.locator('#notifications-tab').click();
  await page.locator('#digest-toggle').click();
  await page.locator('#save-settings').click();
  await expect(page.locator('.response').last()).toContainText('Walkthrough complete');
  await page.getByRole('button', {name:'Disconnect',exact:true}).click();
  await expect(page.locator('.scripted')).toHaveText('Scripted demo');
});

test('API failures do not silently substitute scripted answers', async ({ page }) => {
  await page.route('https://api.openai.com/v1/chat/completions', route => route.fulfill({status:401,json:{error:{message:'invalid'}}}));
  await connect(page);
  await page.getByRole('button', {name:'When is the best time to visit?'}).click();
  await expect(page.getByRole('alert')).toContainText('rejected this key');
  await expect(page.locator('.evidence-highlight')).toHaveCount(0);
});

test('model cannot highlight outside sandbox or invent guide targets', async ({ page }) => {
  await page.route('https://api.openai.com/v1/chat/completions', route => route.fulfill({json:completion({answer:'Invalid target',evidenceId:'api-key',steps:[]})}));
  await connect(page);
  await page.getByRole('button', {name:'When is the best time to visit?'}).click();
  await expect(page.getByRole('alert')).toContainText('unavailable passage');
  await expect(page.locator('#api-key')).not.toHaveClass(/evidence-highlight/);
  await page.unroute('https://api.openai.com/v1/chat/completions');
  await page.route('https://api.openai.com/v1/chat/completions', route => route.fulfill({json:completion({answer:'Invalid step',evidenceId:'',steps:[{target:'disconnect',instruction:'Click here'}]})}));
  await page.locator('#tab-guide').click();
  await page.getByRole('button', {name:'Help me turn off the weekly email digest'}).click();
  await expect(page.getByRole('alert')).toContainText('unsupported controls');
  await expect(page.locator('.guide-target')).toHaveCount(0);
});

test('responsive layout stays inside viewport and nested GitHub Pages paths work', async ({ page }) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('#tab-guide').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.route('http://127.0.0.1:8080/pageguide-demo/**', async route => {
    const response = await route.fetch({url:route.request().url().replace('/pageguide-demo/', '/')});
    await route.fulfill({response});
  });
  await page.goto('/pageguide-demo/');
  await expect(page.locator('#tab-find')).toHaveAttribute('aria-selected','true');
  await page.getByRole('button', {name:'When is the best time to visit?'}).click();
  await expect(page.locator('#season-evidence')).toHaveClass(/evidence-highlight/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('keyboard tab navigation works', async ({ page }) => {
  // Keyboard interaction remains valid even on touch-sized displays.
  await page.locator('#tab-find').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tab-guide')).toHaveAttribute('aria-selected','true');
  await page.keyboard.press('End');
  await expect(page.locator('#tab-more')).toHaveAttribute('aria-selected','true');
  await page.keyboard.press('Home');
  await expect(page.locator('#tab-find')).toHaveAttribute('aria-selected','true');
});
