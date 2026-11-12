import { useEffect, useRef, useState, type FormEvent } from 'react';
import { accountRequest, type Account } from '../services/account';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (account: Account) => void;
}

export default function AuthModal({ isOpen, onClose, onLogin }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const panel = dialog.current;
    if (isOpen && panel && !panel.open) { setError(''); panel.showModal(); }
    if (!isOpen && panel?.open) panel.close();
  }, [isOpen]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError('');
    setBusy(true);
    try {
      const { account } = await accountRequest<{ account: Account }>(register ? '/register' : '/login', Object.fromEntries(new FormData(form)));
      form.reset();
      onLogin(account);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Кіру мүмкін болмады.');
    } finally { setBusy(false); }
  }

  return (
    <dialog ref={dialog} aria-labelledby="ustazai-auth-heading" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
      className="m-auto w-[min(27rem,calc(100%-2rem))] rounded-3xl p-6 shadow-xl backdrop:bg-emerald-950/60">
      <h2 className="text-2xl font-bold" id="ustazai-auth-heading">{register ? 'Тіркелу' : 'Аккаунтқа кіру'}</h2>
      <p className="mt-2 text-sm text-zinc-600">Оқу кеңістігінің аккаунтын пайдаланыңыз.</p>
      <form onSubmit={submit} className="mt-4 grid gap-3">
        {register && <label className="grid gap-1">Аты-жөні<input className="rounded-xl border border-zinc-300 px-3 py-2" name="name" autoComplete="name" required minLength={2} maxLength={80} /></label>}
        <label className="grid gap-1">Электрондық пошта<input className="rounded-xl border border-zinc-300 px-3 py-2" name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label className="grid gap-1">Құпиясөз<input className="rounded-xl border border-zinc-300 px-3 py-2" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={8} maxLength={128} /></label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" className="btn-primary disabled:opacity-60" disabled={busy}>{busy ? 'Тексерілуде…' : register ? 'Тіркелу' : 'Кіру'}</button>
        <div className="flex justify-between gap-3 text-sm">
          <button type="button" className="font-semibold text-emerald-800" disabled={busy} onClick={() => { setRegister(!register); setError(''); }}>{register ? 'Аккаунтқа кіру' : 'Жаңа аккаунт ашу'}</button>
          <button type="button" disabled={busy} onClick={onClose}>Жабу</button>
        </div>
      </form>
    </dialog>
  );
}
