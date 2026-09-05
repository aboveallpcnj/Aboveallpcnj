// Progressive enhancement: the original Formspree POST still works without JS.
export function initContactForm(form, status, success, options = {}) {
  if (!form || !status || !success) return;
  const fetcher = options.fetcher ?? globalThis.fetch;
  const makeData = options.makeData ?? (element => new FormData(element));
  const timeoutMs = options.timeoutMs ?? 15000;
  const button = form.querySelector('button[type="submit"]');
  const idleText = button.textContent;
  let pending = false;

  const submit = async event => {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;
    const data = makeData(form);
    if (data.get('_gotcha')) return;
    pending = true;
    button.disabled = true;
    button.textContent = 'Sending your request…';
    form.setAttribute('aria-busy', 'true');
    status.dataset.state = 'pending';
    status.textContent = 'Sending your request…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(form.action, {
        method: 'POST', body: data, headers: { Accept: 'application/json' }, signal: controller.signal,
      });
      if (!response.ok) {
        const error = new Error('Request was not accepted');
        error.status = response.status;
        throw error;
      }
      status.textContent = '';
      status.dataset.state = 'success';
      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (error) {
      status.dataset.state = 'error';
      if (error.name === 'AbortError') {
        status.textContent = 'We couldn’t confirm your request because the connection timed out. Your details are still here. Please call 973-728-4455, or try again if you haven’t received confirmation.';
      } else if (error.status === 422) {
        status.textContent = 'Your request wasn’t accepted. Please check your details and try again, or call 973-728-4455.';
      } else {
        status.textContent = 'We couldn’t confirm your request. Your details are still here. Please try again or call 973-728-4455.';
      }
    } finally {
      clearTimeout(timeout);
      pending = false;
      button.disabled = false;
      button.textContent = idleText;
      form.setAttribute('aria-busy', 'false');
    }
  };
  form.addEventListener('submit', submit);
  return submit;
}
