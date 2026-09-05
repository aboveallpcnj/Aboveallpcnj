import test from 'node:test';
import assert from 'node:assert/strict';
import { initContactForm } from '../assets/contact-form.js';

function fixture(fetcher, timeoutMs = 200) {
  const button = { disabled: false, textContent: 'Request a free callback' };
  const status = { textContent: '', dataset: {} };
  const success = { hidden: true, focused: false, focus() { this.focused = true; } };
  const fields = { firstName: 'Test', phone: '555-0100', town: 'West Milford', message: 'Test only', _gotcha: '' };
  const form = {
    action: 'https://formspree.io/f/xgopwvey', hidden: false, attributes: {}, fields,
    valid: true, reportValidity() { return this.valid; }, querySelector() { return button; },
    setAttribute(key, value) { this.attributes[key] = value; }, addEventListener() {},
  };
  const submit = initContactForm(form, status, success, { fetcher, timeoutMs, makeData: () => new Map(Object.entries(fields)) });
  return { form, status, success, button, submit: () => submit({ preventDefault() {} }) };
}

test('success appears only after acceptance; pending submissions cannot be duplicated', async () => {
  let resolveResponse, request, calls = 0;
  const f = fixture((url, options) => { calls++; request = { url, options }; return new Promise(resolve => { resolveResponse = resolve; }); });
  const pending = f.submit();
  assert.equal(f.button.disabled, true);
  assert.equal(f.success.hidden, true);
  assert.equal(f.form.attributes['aria-busy'], 'true');
  assert.equal(request.url, 'https://formspree.io/f/xgopwvey');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.body.get('town'), 'West Milford');
  await f.submit();
  assert.equal(calls, 1);
  resolveResponse({ ok: true, status: 200 });
  await pending;
  assert.equal(f.form.hidden, true);
  assert.equal(f.success.hidden, false);
  assert.equal(f.success.focused, true);
  assert.equal(f.button.disabled, false);
});

for (const statusCode of [422, 429, 500]) {
  test(`${statusCode} preserves details and permits a successful retry`, async () => {
    let calls = 0;
    const f = fixture(async () => (++calls === 1 ? { ok: false, status: statusCode } : { ok: true, status: 200 }));
    await f.submit();
    assert.equal(f.form.hidden, false);
    assert.equal(f.success.hidden, true);
    assert.equal(f.status.dataset.state, 'error');
    assert.match(f.status.textContent, /973-728-4455/);
    assert.equal(f.form.fields.message, 'Test only');
    assert.equal(f.button.disabled, false);
    await f.submit();
    assert.equal(calls, 2);
    assert.equal(f.success.hidden, false);
  });
}

test('network failure gives feedback and keeps the form usable', async () => {
  const f = fixture(async () => { throw new TypeError('Failed to fetch'); });
  await f.submit();
  assert.equal(f.status.dataset.state, 'error');
  assert.equal(f.form.hidden, false);
  assert.equal(f.button.disabled, false);
  assert.equal(f.form.attributes['aria-busy'], 'false');
});

test('timeout gives an uncertain-delivery message without claiming success', async () => {
  const f = fixture((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })), { once: true });
  }), 5);
  await f.submit();
  assert.match(f.status.textContent, /couldn’t confirm/);
  assert.match(f.status.textContent, /timed out/);
  assert.equal(f.success.hidden, true);
  assert.equal(f.button.disabled, false);
});

test('invalid fields and honeypot entries do not reach the provider', async () => {
  let calls = 0;
  const f = fixture(async () => { calls++; return { ok: true }; });
  f.form.valid = false;
  await f.submit();
  f.form.valid = true;
  f.form.fields._gotcha = 'spam';
  await f.submit();
  assert.equal(calls, 0);
});
