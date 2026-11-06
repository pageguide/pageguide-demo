'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '@/lib/store';
import { TRACKS } from '@/lib/sandbox-media';
import type { Block, PageDoc } from '@/lib/types';
import { useSandboxControls } from './sandbox-controls';

export default function SpotifySandbox({ doc, render }: { doc: PageDoc; render: (block: Block) => ReactNode }) {
  // The session key is retained from the former SoundCloud demo; audio assets are unchanged.
  const s = useStore(state => state.sandboxSessions.soundcloud)!;
  const { control, node, act, running } = useSandboxControls(doc);
  const audio = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(32);
  const [volume, setVolume] = useState(.55);
  const [error, setError] = useState('');
  const available = TRACKS.filter(track => !(s.hiddenTracks || []).includes(track.id) && !(s.hiddenArtists || []).includes(track.artistId));
  const visible = available.filter(track => `${track.title} ${track.artist} ${track.genre}`.toLowerCase().includes(s.query.toLowerCase()) && (s.view !== 'library' || s.liked.includes(track.id)));
  const current = TRACKS.find(track => track.id === s.selected) || available[0] || TRACKS[0];
  const playing = Boolean(s.selected && s.soundPlaying !== false && available.some(track => track.id === s.selected));
  const browse = s.view === 'home' || s.view === 'library';
  const groups = [...new Set(doc.blocks.map(block => block.group).filter((group): group is string => Boolean(group && group !== 'navigation' && !group.startsWith('track-'))))];
  useEffect(() => {
    if (!audio.current) return;
    if (playing) audio.current.play().then(() => setError('')).catch(() => setError('Press play to allow audio in this browser.'));
    else audio.current.pause();
  }, [s.selected, playing]);
  useEffect(() => { if (audio.current) audio.current.volume = volume; }, [volume]);
  const format = (value: number) => `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, '0')}`;
  const next = () => {
    if (!visible.length) return;
    const track = visible[(visible.indexOf(current) + 1) % visible.length];
    act(`play-${track.id}`);
  };
  return <div className="sp-app">
    <header className="sp-header">
      <div className="sp-brand" aria-label="Spotify"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="currentColor" /><g fill="none" stroke="#000" strokeLinecap="round"><path d="M7 12c6-2 13-1 18 2" strokeWidth="2.6" /><path d="M8 17c5-2 11-1 15 1" strokeWidth="2.2" /><path d="M10 21c4-1 8-1 11 1" strokeWidth="1.8" /></g></svg><strong>Spotify</strong></div>
      {control('home', '⌂ Home')}
      <form className="sp-search" onSubmit={event => { event.preventDefault(); act('search-submit'); }}>
        <input {...node('search')} aria-label="What do you want to play?" placeholder="What do you want to play?" value={s.query} disabled={running} onChange={event => act('search', event.target.value)} />
        {control('search-submit', '⌕')}
      </form>
      {control('plans', s.spotifyPlan === 'Premium' ? 'Premium ✓' : 'Explore Premium', 'sp-pill')}
      {control('account', 'Alex Demo', 'sp-account')}
    </header>
    <div className="sp-layout">
      <aside className="sp-library" aria-label="Spotify navigation">
        <h2>Your Library</h2>{control('library', '♡ Liked songs')}
        <div className="sp-side-card"><b>Make it your music</b><p>Manage hidden songs and artists.</p>{control('preferences')}</div>
        <div className="sp-side-card"><b>Music is better together</b><p>Try a local Jam with Demo Friends.</p>{control('jam')}</div>
        <p className="sp-demo-note">Fictional account · Original local previews · No real purchases or Discord messages.</p>
      </aside>
      <main className="sp-main">
        {doc.blocks.filter(block => block.id === 'page-title' || block.id === 'notice').map(render)}
        {!browse && groups.map(group => <section className={`sp-panel ${group === 'discord' ? 'sp-discord' : ''}`} key={group} aria-label={group === 'discord' ? 'Demo Discord channel' : undefined}>{doc.blocks.filter(block => block.group === group).map(render)}</section>)}
        {(browse || s.view === 'jam' || s.view === 'discord') && <>
          {!browse && <h2>Choose a song</h2>}
          {visible.length ? <div className="sp-track-grid">{visible.map(track => <article className="sp-track-card" key={track.id}>
            <div className="sp-cover"><img src={`/sandbox/${track.image}.jpg`} alt={`${track.title} cover`} />{control(`play-${track.id}`, playing && current.id === track.id ? 'Ⅱ' : '▶', 'sp-play')}</div>
            <h3 {...node(`title-${track.id}`)}>{track.title}</h3><p {...node(`artist-${track.id}`)}>{track.artist}</p>
            {control(`like-${track.id}`, s.liked.includes(track.id) ? '♥ Liked' : '♡ Save', 'sp-save')}
          </article>)}</div> : <p className="sp-empty">{s.view === 'library' ? 'No liked songs yet. Save a song from Home to add it here.' : 'No matching songs. Check Content preferences to restore hidden songs or artists.'}</p>}
        </>}
        {browse && <><h2>Popular artists</h2><div className="sp-track-grid">{available.map(track => <article className="sp-artist-card" key={track.artistId}>
          <img src={`/sandbox/${track.image}.jpg`} alt={track.artist} /><h3>{track.artist}</h3><p>Artist · {track.genre}</p>{control(`follow-${track.artistId}`)}
        </article>)}</div><div className="sp-preview-banner"><b>Your music. Your way.</b><p>The same original 32-second previews, in a Spotify-style demo.</p>{control('plans')}</div></>}
        <p className="sp-demo-note">{doc.blocks.find(block => block.id === 'sandbox-label')?.text}</p>
        <p {...node('current-state')} className="sr-only">{doc.blocks.find(block => block.id === 'current-state')?.text}</p>
      </main>
    </div>
    <footer className="sp-player" aria-label="Music player">
      <div className="sp-now-playing"><img src={`/sandbox/${current.image}.jpg`} alt="" /><div><b>{current.title}</b><small>{current.artist}</small></div></div>
      <div className="sp-player-controls"><div>{control(`play-${current.id}`, playing ? 'Ⅱ' : '▶', 'sp-player-play')}{browse && <button type="button" aria-label="Next track" disabled={running || !visible.length} onClick={next}>▶|</button>}</div>
        <div className="sp-seek"><span>{format(time)}</span><input aria-label="Playback position" type="range" min="0" max={duration || 32} step=".1" value={time} onChange={event => { if (audio.current) { audio.current.currentTime = Number(event.target.value); setTime(Number(event.target.value)); } }} /><span>{format(duration)}</span></div>
      </div>
      <label className="sp-volume">Volume <input aria-label="Volume" type="range" min="0" max="1" step=".01" value={volume} onChange={event => setVolume(Number(event.target.value))} /></label>
    </footer>
    {error && <p role="alert" className="sp-audio-error">{error}</p>}
    <audio ref={audio} src={`/sandbox/${current.id}.wav`} preload="metadata" onTimeUpdate={event => setTime(event.currentTarget.currentTime)} onLoadedMetadata={event => { setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 32); setTime(0); }} onEnded={() => {
      const state = useStore.getState();
      const session = state.sandboxSessions.soundcloud;
      if (session?.selected === current.id && session.soundPlaying !== false) state.actOnSandbox({ type: 'click', id: `play-${current.id}` });
    }} onError={() => setError('The local audio preview could not be loaded. Try another song.')} />
  </div>;
}
