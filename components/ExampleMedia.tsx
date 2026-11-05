'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { parseDemoCaptions, type DemoCaption } from '@/lib/demo-captions';

interface Props {
  mode: 'Find' | 'Guide'; src: string; alt: string; width: number; height: number;
  type?: 'image' | 'video'; poster?: string; captionsSrc?: string; gifSrc?: string;
  gifSeekSrc?: string; gifPlaybackRate?: number; query?: string;
}

export default function ExampleMedia({ mode, src, alt, width, height, type = 'image', poster, captionsSrc, gifSrc, gifSeekSrc, gifPlaybackRate = 1.5, query }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [useGif, setUseGif] = useState(Boolean(gifSrc));
  const [captions, setCaptions] = useState<DemoCaption[]>([]);
  const [time, setTime] = useState(0);
  const isVideo = type === 'video' && !useGif;
  const seekableGif = Boolean(useGif && gifSeekSrc);
  const displayedSrc = useGif && gifSrc ? gifSrc : src;
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const pendingSeek = useRef<number | null>(null);
  // The silent GIF preview is encoded at its faster speed; convert its clock
  // back to the source video's timeline so both formats share exact scenes.
  const timelineScale = seekableGif ? gifPlaybackRate : 1;
  const enlarge = () => { setTime(0); pendingSeek.current = null; setExpanded(true); };
  const seekToStep = (start: number) => {
    const video = player.current;
    if (!video) return;
    setTime(start);
    const target = start / timelineScale;
    if (video.readyState < 1) { pendingSeek.current = target; return; }
    video.currentTime = target;
    void video.play().catch(() => {});
  };

  useEffect(() => {
    if (!captionsSrc) return;
    const controller = new AbortController();
    setCaptions([]);
    fetch(captionsSrc, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Captions unavailable');
      return response.text();
    }).then(text => { if (!controller.signal.aborted) setCaptions(parseDemoCaptions(text)); }).catch(() => {});
    return () => controller.abort();
  }, [captionsSrc]);

  useEffect(() => {
    if (!expanded) return;
    const popup = dialog.current;
    preview.current?.pause();
    popup?.showModal();
    return () => { popup?.close(); trigger.current?.focus(); };
  }, [expanded]);

  return (
    <figure className={`mt-3 flex min-w-0 flex-col justify-start gap-2 rounded-xl border border-orange-ring bg-orange-soft dark:border-night-line dark:bg-night-panel ${mode === 'Find' ? 'h-full overflow-hidden' : 'p-2'}`}>
      <figcaption className="sr-only">{mode} example</figcaption>
      {query && <p className="rounded-lg bg-white/80 px-3 py-2 text-sm leading-relaxed text-ink dark:bg-white/5 dark:text-night-ink"><span className="font-semibold text-orange">Query:</span>{' '}<span className="whitespace-pre-line">{query}</span></p>}
      {gifSrc && <div role="group" aria-label={`${mode} example format`} className="flex w-full items-center gap-1 text-xs">
        <button type="button" aria-pressed={useGif} onClick={() => { preview.current?.pause(); setUseGif(true); }} className={`rounded-md px-3 py-1.5 font-medium ${useGif ? 'bg-orange text-white' : 'text-muted hover:bg-white/60 dark:text-night-muted'}`}>GIF</button>
        <button type="button" aria-pressed={!useGif} onClick={() => setUseGif(false)} className={`rounded-md px-3 py-1.5 font-medium ${!useGif ? 'bg-orange text-white' : 'text-muted hover:bg-white/60 dark:text-night-muted'}`}>Video</button>
        <span className="ml-auto text-muted dark:text-night-muted">{useGif ? `${gifPlaybackRate}× · ${width} × ${height}` : 'Sound'} · Enlarge for steps</span>
      </div>}
      {isVideo ? <div className={`relative min-w-0 ${mode === 'Guide' ? 'mx-auto aspect-[4/3] w-full max-w-[48dvh]' : ''}`}>
        <video ref={preview} poster={poster} aria-label={alt} width={width} height={height} controls muted playsInline preload="metadata" className={`block w-full rounded-lg bg-black object-contain ${mode === 'Guide' ? 'h-full' : 'h-auto'}`}>
          <VideoSources src={src} />Your browser does not support video playback.
        </video>
        <button ref={trigger} type="button" aria-label={`Enlarge ${mode} example`} aria-haspopup="dialog" onClick={enlarge} className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange">Enlarge ↗</button>
      </div> : <button ref={trigger} type="button" aria-label={`Enlarge ${mode} example`} aria-haspopup="dialog" onClick={enlarge} className={`block min-w-0 w-full overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange ${mode === 'Guide' ? 'mx-auto aspect-[4/3] max-w-[48dvh]' : ''}`}>
        <img src={displayedSrc} alt={alt} width={width} height={height} loading="lazy" decoding="async" className={`block w-full object-contain ${mode === 'Guide' ? 'h-full' : 'h-auto'}`} />
      </button>}
      {expanded && createPortal(
        <dialog ref={dialog} aria-label={`${mode} example`} onClose={() => setExpanded(false)} onCancel={() => setExpanded(false)} onClick={event => { if (event.target === event.currentTarget) setExpanded(false); }}
          className="fixed inset-0 m-auto max-h-[95dvh] w-[calc(100%_-_2rem)] max-w-7xl overflow-auto rounded-2xl border border-line bg-white p-4 text-ink shadow-xl backdrop:bg-black/60 dark:border-night-line dark:bg-night-panel dark:text-night-ink">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold">{mode} example{seekableGif && ` · Seekable GIF preview · ${gifPlaybackRate}×`}</h2>
            <button type="button" autoFocus aria-label="Close example" onClick={() => setExpanded(false)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-orange-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange">✕</button>
          </div>
          {query && <p className="mb-4 rounded-lg bg-orange-soft px-4 py-3 text-base leading-relaxed dark:bg-white/5"><span className="font-semibold text-orange">Query:</span>{' '}<span className="whitespace-pre-line">{query}</span></p>}
          <div className={captionsSrc ? 'grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_18rem]' : ''}>
            {isVideo || seekableGif
              ? <video ref={player} poster={poster} aria-label={alt} width={width} height={height} controls autoPlay muted={seekableGif} loop={seekableGif} playsInline preload="metadata"
                  onLoadedMetadata={event => {
                    if (pendingSeek.current === null) return;
                    event.currentTarget.currentTime = pendingSeek.current;
                    pendingSeek.current = null;
                    void event.currentTarget.play().catch(() => {});
                  }}
                  onTimeUpdate={event => setTime(event.currentTarget.currentTime * timelineScale)} onSeeked={event => setTime(event.currentTarget.currentTime * timelineScale)}
                  className="block h-auto max-h-[78dvh] w-full rounded-lg bg-black object-contain"><VideoSources src={seekableGif ? gifSeekSrc! : src} silent={seekableGif} /></video>
              : <img src={displayedSrc} alt={alt} width={width} height={height} className="block h-auto max-h-[78dvh] w-full rounded-lg object-contain" />}
            {captionsSrc && <SideCaptions captions={captions} time={time} playingVideo={isVideo} onNavigate={seekToStep} />}
          </div>
        </dialog>, document.body)}
    </figure>
  );
}

function SideCaptions({ captions, time, playingVideo, onNavigate }: { captions: DemoCaption[]; time: number; playingVideo: boolean; onNavigate: (start: number) => void }) {
  const steps = [
    { start: 0, title: 'Open the museum map', description: 'PageGuide navigates to the Met’s interactive map.' },
    { start: 6, title: 'Search nearby cafés', description: 'Find dining options near the American Wing on Floor 1.' },
    { start: 10.3, title: 'Show the café and evidence', description: 'Highlight the closest café and answer with an annotated screenshot.' },
  ];
  const activeStep = time + .01 >= steps[2].start ? 2 : time + .01 >= steps[1].start ? 1 : 0;
  const narration = captions.find(caption => time >= caption.start && time < caption.end);
  return <aside aria-label="Side captions" className="max-h-[75dvh] min-w-0 overflow-auto rounded-xl border border-orange-ring bg-[#fffaf6] p-4 text-ink dark:border-night-line dark:bg-night-panel dark:text-night-ink">
    <h3 className="text-xs font-semibold uppercase tracking-wide text-orange">Step by step</h3>
    <p className="mb-4 mt-2 text-sm text-muted dark:text-night-muted">Click a step to jump to its scene.</p>
    <ol className="space-y-3">
      {steps.map((step, index) => <li key={step.start}>
        <button type="button" aria-label={`Go to step ${index + 1}: ${step.title}`} aria-current={activeStep === index ? 'step' : undefined} onClick={() => onNavigate(step.start)} className={`flex w-full gap-3 rounded-lg border p-3 text-left transition-colors hover:border-orange-ring focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange ${activeStep === index ? 'border-orange-ring bg-orange-soft dark:bg-orange/15' : 'border-transparent hover:bg-orange-soft/50'}`}>
          <span aria-hidden="true" className="text-lg font-bold text-orange">{index + 1}.</span>
          <span><span className="block text-base font-semibold leading-snug">{step.title}</span><span className="mt-2 block text-sm leading-relaxed">{step.description}</span></span>
        </button>
      </li>)}
    </ol>
    {playingVideo && narration && <div className="mt-4 border-t border-orange-ring pt-4 dark:border-night-line">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted dark:text-night-muted">Narration</h3>
      <p aria-live="polite" aria-atomic="true" className="text-base leading-relaxed">{narration.text}</p>
    </div>}
  </aside>;
}

function VideoSources({ src, silent = false }: { src: string; silent?: boolean }) {
  return <>
    <source src={src} type={silent ? 'video/mp4; codecs="avc1.640028"' : 'video/mp4; codecs="avc1.640028, mp4a.40.2"'} />
    <source src={src.replace(/\.mp4(?=\?|$)/, '.webm')} type={silent ? 'video/webm; codecs="vp9"' : 'video/webm; codecs="vp9, opus"'} />
  </>;
}
