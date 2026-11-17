export const accountMessages = {
  fields: 'Поштаны (немесе логинді) және құпиясөзді тексеріңіз. Тіркелгенде құпиясөз кемінде 8 таңба болуы керек.',
  credentials: 'Логин (пошта) немесе құпиясөз сәйкес келмеді.',
  email_taken: 'Бұл пошта тіркелген. «Кіру» арқылы жалғастырыңыз.',
  wait: 'Әрекет саны көбейді. 15 минуттан кейін қайталап көріңіз.',
  network: 'Байланыс үзілді. Қайта әрекет етіңіз.'
};

/** @param {object} [payload] */
export async function learnerAccount(path = '', payload) {
  try {
    const response = await fetch('/api/account' + path, payload ? {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    } : { cache: 'no-store' });
    return await response.json();
  } catch {
    return { ok: false, error: 'network' };
  }
}

/** @param {{ allowRegistration?: boolean, onSuccess: (result: any, mode: string, context: string) => void }} options */
export function createLearnerAuth({ allowRegistration = true, onSuccess }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'learner-dialog';
  dialog.setAttribute('aria-labelledby', 'accountTitle');
  dialog.innerHTML = `
    <div class="learner-dialog-head">
      <div><h2 id="accountTitle"></h2><p id="accountIntro"></p></div>
      <button type="button" class="lr-icon-button" id="accountClose" aria-label="Жабу">×</button>
    </div>
    <form id="accountForm">
      ${allowRegistration ? '<label id="accountNameRow">Аты-жөніңіз<input name="name" autocomplete="name" minlength="2" maxlength="80" required></label>' : ''}
      <label><span id="accountIdLabel">Электрондық пошта</span><input name="email" type="email" autocomplete="username" maxlength="254" required></label>
      <label>Құпиясөз<input name="password" type="password" minlength="8" maxlength="128" required></label>
      ${allowRegistration ? '<p id="accountPasswordHint" class="learner-dialog-note">Кемінде 8 таңба.</p>' : ''}
      <p id="accountError" class="learner-error" role="alert" hidden></p>
      <button class="lr-btn lr-primary" id="accountSubmit" type="submit"></button>
    </form>
    ${allowRegistration ? '<div class="learner-dialog-switch"><span id="accountSwitchHint"></span><button type="button" class="lr-text-link" id="accountSwitch"></button></div>' : ''}`;
  const byId = id => dialog.querySelector('#' + id);
  const form = /** @type {HTMLFormElement} */ (byId('accountForm'));
  const submit = /** @type {HTMLButtonElement} */ (byId('accountSubmit'));
  const nameRow = byId('accountNameRow');
  const errorBox = byId('accountError');
  let mode = 'login';
  let context = '';
  let pending = false;

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }
  function setMode(next) {
    mode = allowRegistration && next === 'register' ? 'register' : 'login';
    const creating = mode === 'register';
    byId('accountTitle').textContent = creating ? 'Жеке кабинет ашу' : 'Жеке кабинетке кіру';
    form.elements.password.autocomplete = creating ? 'new-password' : 'current-password';
    // Кіргенде оқытушы берген логин де жарайды; тіркелгенде тек пошта және 8+ таңба.
    form.elements.email.type = creating ? 'email' : 'text';
    form.elements.password.minLength = creating ? 8 : 1;
    byId('accountIdLabel').textContent = creating ? 'Электрондық пошта' : 'Логин немесе пошта';
    submit.textContent = creating ? 'Тіркелу' : 'Кіру';
    if (nameRow) {
      nameRow.hidden = !creating;
      nameRow.querySelector('input').disabled = !creating;
      byId('accountPasswordHint').hidden = !creating;
      byId('accountSwitchHint').textContent = creating ? 'Аккаунтыңыз бар ма?' : 'Жеке кабинет әлі ашылмаған ба?';
      byId('accountSwitch').textContent = creating ? 'Кіру' : 'Тіркелу';
    }
    showError('');
  }
  byId('accountClose').onclick = () => { if (!pending) dialog.close(); };
  if (allowRegistration) byId('accountSwitch').onclick = () => {
    if (!pending) setMode(mode === 'register' ? 'login' : 'register');
  };
  dialog.addEventListener('cancel', event => { if (pending) event.preventDefault(); });
  dialog.addEventListener('close', () => { if (!dialog.open) form.reset(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending) return;
    pending = true;
    submit.disabled = true;
    submit.textContent = 'Тексерілуде…';
    showError('');
    const result = await learnerAccount('/' + mode, Object.fromEntries(new FormData(form)));
    if (!dialog.isConnected) return;
    pending = false;
    submit.disabled = false;
    setMode(mode);
    if (!result.ok) {
      showError(accountMessages[result.error] || 'Әрекет аяқталмады. Қайта көріңіз.');
      return;
    }
    dialog.close();
    onSuccess(result, mode, context);
  });

  return {
    open(next = 'login', { intro = 'Оқу кеңістігінің аккаунтын пайдаланыңыз.', context: source = '' } = {}) {
      if (pending) return;
      context = source;
      byId('accountIntro').textContent = intro;
      form.reset();
      setMode(next);
      if (!dialog.isConnected) document.body.append(dialog);
      if (!dialog.open) dialog.showModal();
      (mode === 'register' ? nameRow.querySelector('input') : form.elements.email).focus();
    },
    destroy() { dialog.remove(); }
  };
}
