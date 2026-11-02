'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { PROVIDERS } from '@/lib/providers';
import type { Provider } from '@/lib/types';

export default function Settings({ onClose }: { onClose: () => void }) {
  const settings = useStore((s) => s.settings);
  const patch = useStore((s) => s.patchSettings);
  const serverKeys = useStore((s) => s.serverKeys);
  const [provider, setProvider] = useState<Provider>(settings.provider);
  const [openaiModel, setOpenaiModel] = useState(settings.openaiModel);
  const [openrouterModel, setOpenrouterModel] = useState(settings.openrouterModel);
  const [openaiKey, setOpenaiKey] = useState(settings.openaiKey);
  const [openrouterKey, setOpenrouterKey] = useState(settings.openrouterKey);
  const [saved, setSaved] = useState(false);

  const save = () => {
    patch({ provider, openaiModel, openrouterModel, openaiKey, openrouterKey });
    setSaved(true);
    setTimeout(onClose, 650);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-panel dark:border-night-line dark:bg-night-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink dark:text-night-ink">Settings</h2>
          <button onClick={onClose} className="text-muted hover:text-ink dark:text-night-muted" aria-label="Close">
            ✕
          </button>
        </div>

        <label className="mb-1 block text-[11px] font-medium text-muted dark:text-night-muted">Provider</label>
        <div className="mb-4 flex gap-2">
          {(Object.keys(PROVIDERS) as Provider[]).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`flex-1 rounded-lg border px-3 py-2 text-[12px] font-medium transition-colors ${
                provider === p
                  ? 'border-orange bg-orange-soft text-ink dark:bg-orange/20 dark:text-night-ink'
                  : 'border-line text-muted hover:text-ink dark:border-night-line dark:text-night-muted'
              }`}
            >
              {PROVIDERS[p].label}
            </button>
          ))}
        </div>

        {provider === 'openai' ? (
          <Field label="OpenAI model" value={openaiModel} onChange={setOpenaiModel} placeholder="gpt-4.1-mini" />
        ) : (
          <Field
            label="OpenRouter model"
            value={openrouterModel}
            onChange={setOpenrouterModel}
            placeholder="google/gemini-3-flash-preview"
          />
        )}

        {serverKeys[provider] && (
          <div className="mb-3 rounded-lg border border-sage/40 bg-sage-soft/60 px-3 py-2 text-[11px] text-sage dark:border-night-line dark:bg-night dark:text-[#a9bb95]">
            ✓ A server key is configured for {PROVIDERS[provider].label} — you can leave the key blank; the app won&apos;t
            ask visitors for one.
          </div>
        )}

        {provider === 'openai' ? (
          <Field
            label={`OpenAI API key${serverKeys.openai ? ' (optional)' : ''}`}
            value={openaiKey}
            onChange={setOpenaiKey}
            placeholder={serverKeys.openai ? 'Using server key' : 'sk-…'}
            password
          />
        ) : (
          <Field
            label={`OpenRouter API key${serverKeys.openrouter ? ' (optional)' : ''}`}
            value={openrouterKey}
            onChange={setOpenrouterKey}
            placeholder={serverKeys.openrouter ? 'Using server key' : 'sk-or-…'}
            password
          />
        )}

        <p className="mb-4 text-[10px] leading-relaxed text-muted dark:text-night-muted">
          Your key is stored only in this browser and sent to your chosen provider through this app&apos;s server, never
          logged. If the server has an operator key set, you can leave this blank. The key is verified on your first
          question.
        </p>

        <button
          onClick={save}
          className="w-full rounded-lg bg-ink py-2.5 text-[13px] font-medium text-white hover:bg-[#45503f] dark:bg-orange dark:hover:bg-orange/90"
        >
          {saved ? '✓ Saved' : 'Test & Save Connection'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  password,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  password?: boolean;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-[11px] font-medium text-muted dark:text-night-muted">{label}</label>
      <input
        type={password ? 'password' : 'text'}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-[12px] text-ink outline-none focus:border-orange dark:border-night-line dark:bg-night dark:text-night-ink"
      />
    </div>
  );
}
