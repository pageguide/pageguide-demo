'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ExampleMedia({ mode, src, alt, width, height, type = 'image', poster, captionsSrc, gifSrc }: { mode: 'Find' | 'Guide'; src: string; alt: string; width: number; height: number; type?: 'image' | 'video'; poster?: string; captionsSrc?: string; gifSrc?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [useGif, setUseGif] = useState(Boolean(gifSrc));
  const isVideo = type === 'video' && !useGif;
  const displayedSrc = useGif && gifSrc ? gifSrc : src;
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const preview = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!expanded) return;
    const popup = dialog.current;
    preview.current?.pause();
    popup?.showModal();
    return () => { popup?.close(); trigger.current?.focus(); };
  }, [expanded]);

  return (
    <figure className="mt-3 flex min-w-0 flex-col justify-center gap-2 rounded-xl border border-orange-ring bg-orange-soft p-2 dark:border-night-line dark:bg-night-panel">
      <figcaption className="sr-only">{mode} example</figcaption>
      {gifSrc && <div role="group" aria-label={`${mode} example format`} className="flex w-full items-center gap-1 text-xs">
        <button type="button" aria-pressed={useGif} onClick={() => { preview.current?.pause(); setUseGif(true); }} className={`rounded-md px-3 py-1.5 font-medium ${useGif ? 'bg-orange text-white' : 'text-muted hover:bg-white/60 dark:text-night-muted'}`}>GIF</button>
        <button type="button" aria-pressed={!useGif} onClick={() => setUseGif(false)} className={`rounded-md px-3 py-1.5 font-medium ${!useGif ? 'bg-orange text-white' : 'text-muted hover:bg-white/60 dark:text-night-muted'}`}>Video</button>
        <span className="ml-auto text-muted dark:text-night-muted">{useGif ? '1920 × 1080 · Captions' : 'Sound + captions'}</span>
      </div>}
      {isVideo ? <div className="relative w-full">
        <video ref={preview} poster={poster} aria-label={alt} width={width} height={height} controls muted playsInline preload="metadata" className="block h-auto w-full rounded-lg bg-black">
          <VideoSources src={src} /><VideoCaptions src={captionsSrc} />Your browser does not support video playback.
        </video>
        <button ref={trigger} type="button" aria-label={`Enlarge ${mode} example`} aria-haspopup="dialog" onClick={() => setExpanded(true)} className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange">Enlarge ↗</button>
      </div> : <button ref={trigger} type="button" aria-label={`Enlarge ${mode} example`} aria-haspopup="dialog" onClick={() => setExpanded(true)} className="block w-full overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange">
        <img src={displayedSrc} alt={alt} width={width} height={height} loading="lazy" decoding="async" className="block h-auto w-full" />
      </button>}
      {expanded && createPortal(
        <dialog ref={dialog} aria-label={`${mode} example`} onClose={() => setExpanded(false)} onCancel={() => setExpanded(false)} onClick={(event) => { if (event.target === event.currentTarget) setExpanded(false); }}
          className="fixed inset-0 m-auto max-h-[95dvh] w-[calc(100%_-_2rem)] max-w-6xl overflow-auto rounded-2xl border border-line bg-white p-3 text-ink shadow-xl backdrop:bg-black/60 dark:border-night-line dark:bg-night-panel dark:text-night-ink">
          <div className="mb-2 flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold">{mode} example</h2>
            <button type="button" autoFocus aria-label="Close example" onClick={() => setExpanded(false)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-orange-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange">✕</button>
          </div>
          {isVideo
            ? <video poster={poster} aria-label={alt} width={width} height={height} controls autoPlay playsInline preload="metadata" className="block h-auto max-h-[80dvh] w-full rounded-lg bg-black object-contain"><VideoSources src={src} /><VideoCaptions src={captionsSrc} /></video>
            : <img src={displayedSrc} alt={alt} width={width} height={height} className="block h-auto max-h-[80dvh] w-full rounded-lg object-contain" />}
        </dialog>, document.body)}
    </figure>
  );
}

function VideoCaptions({ src }: { src?: string }) {
  return src ? <track kind="captions" src={src} srcLang="en" label="English" default /> : null;
}

function VideoSources({ src }: { src: string }) {
  return <>
    <source src={src} type={'video/mp4; codecs="avc1.640028, mp4a.40.2"'} />
    <source src={src.replace(/\.mp4(?=\?|$)/, '.webm')} type={'video/webm; codecs="vp9, opus"'} />
  </>;
}
