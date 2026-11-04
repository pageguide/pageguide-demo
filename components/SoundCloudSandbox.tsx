'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { TRACKS } from '@/lib/sandbox-media';
import type { PageDoc } from '@/lib/types';
import { useSandboxControls } from './sandbox-controls';

export default function SoundCloudSandbox({ doc }: { doc: PageDoc }) {
  const s = useStore(st => st.sandboxSessions.soundcloud)!;
  const { control, node, act } = useSandboxControls(doc);
  const audio = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(32);
  const [volume, setVolume] = useState(.55);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState(true);
  const [station, setStation] = useState('');
  const current = TRACKS.find(t => t.id === s.selected) || TRACKS[0];
  const playing = Boolean(s.selected && s.soundPlaying !== false);
  useEffect(() => {
    if (!audio.current) return;
    if (playing) audio.current.play().then(() => setError('')).catch(() => setError('Press play to enable audio in this browser.'));
    else audio.current.pause();
  }, [s.selected, playing]);
  useEffect(() => { if (audio.current) audio.current.volume = volume; }, [volume]);
  const visible = TRACKS.filter(t => `${t.title} ${t.artist} ${t.genre}`.toLowerCase().includes(s.query.toLowerCase()) && (s.view !== 'library' || s.liked.includes(t.id)));
  const format = (n: number) => `0:${Math.floor(n).toString().padStart(2, '0')}`;
  return <div className="sc-app">
    <header className="sc-header"><div className="sc-cloud" aria-label="SoundCloud"><svg width="54" height="28" viewBox="0 0 70 34" aria-hidden="true"><g fill="currentColor">{[10, 16, 22, 26, 29, 32, 34].map((h, i) => <rect key={i} x={i * 4} y={34 - h} width="2" height={h} rx="1" />)}<path d="M29 34V6a16 16 0 0 1 28 8 10 10 0 1 1 3 20Z" /></g></svg></div>
      {control('home', 'Home', s.view === 'home' ? 'active' : '')}{control('library', 'Library', s.view === 'library' ? 'active' : '')}
      <form className="sc-search" onSubmit={e => { e.preventDefault(); act('search-submit'); }}><input {...node('search')} aria-label="Search artists, tracks, and playlists" placeholder="Search" value={s.query} onChange={e => act('search', e.target.value)} /><button {...node('search-submit')} aria-label="Search">⌕</button></form>
      <span className="sc-premium">Discover independent music</span><span className="sc-avatar">N</span>
    </header>
    <div className="sc-content">
      {banner && <div className="sc-banner"><span>ϟ</span><p><b>Discover your next favorite.</b> Independent artists. Original sounds. Endless inspiration.</p><button aria-label="Dismiss announcement" onClick={() => setBanner(false)}>×</button></div>}
      <div className="sc-layout"><main>
        <h1>{s.query ? `Search results for “${s.query}”` : s.view === 'library' ? 'Your liked tracks' : 'More of what you like'}</h1>
        {visible.length ? <div className="sc-mix" style={{ background: `linear-gradient(115deg, ${visible[0].color}, #a29f85)` }}>
          <div className="sc-mix-art"><img src={`/sandbox/${visible[0].image}.jpg`} alt={`${visible[0].title} cover`} />{control(`play-${visible[0].id}`, playing && current.id === visible[0].id ? 'Ⅱ' : '▶', 'sc-big-play')}</div>
          <div className="sc-mix-tracks">{visible.map(t => <div className={`sc-mix-row ${playing && current.id === t.id ? 'is-playing' : ''}`} key={t.id}>
            {control(`play-${t.id}`, <><span>{playing && current.id === t.id ? 'Ⅱ' : '▶'}</span><b {...node(`title-${t.id}`)}>{t.artist} · {t.title}</b></>, 'sc-track-play')}
            <span className="sc-play-count">▶ {t.plays}</span>{control(`like-${t.id}`, s.liked.includes(t.id) ? '♥' : '♡', s.liked.includes(t.id) ? 'sc-liked' : '')}
          </div>)}<p className="sc-mix-caption">YOUR DAILY MIX · ORIGINAL INSTRUMENTAL PREVIEWS</p></div>
        </div> : <div className="sc-empty">{s.view === 'library' ? 'Your collection starts here. Like a track to save it to your library.' : 'No tracks found. Try Nova, Summer, or Electronic.'}</div>}
        <div className="sc-section-heading"><h2>{station ? `${station} station` : 'Discover with Stations'}</h2>{station && <button onClick={() => setStation('')}>All stations</button>}</div>
        <div className="sc-stations">{[...TRACKS, TRACKS[0]].map((t, i) => <button key={`${t.id}-${i}`} className="sc-station" onClick={() => { setStation(t.artist); act(`play-${t.id}`); }} aria-label={`Play ${t.artist} station`}>
          <div className={`sc-station-art sc-station-${i}`}><div className="sc-record"><img src={`/sandbox/${t.image}.jpg`} alt="" /></div><span>STATION</span><b>{t.artist}</b><i>▶</i></div><strong>{t.artist}</strong><small>Artist station</small>
        </button>)}</div>
        <h2>Artists to watch out for</h2>
        <div className="sc-discover">{TRACKS.map(t => <article key={t.id}><img src={`/sandbox/${t.image}.jpg`} alt="" /><h3>{t.title}</h3><p>{t.genre} · {t.artist}</p>{control(`play-${t.id}`, playing && current.id === t.id ? 'Pause preview' : `Play ${t.title}`)}</article>)}</div>
      </main><aside className="sc-sidebar">
        <h3>YOUR LISTENING SPACE</h3><div className="sc-tools"><div>⌁<small>Discover</small></div><div>◈<small>Connect</small></div><div>◎<small>Collect</small></div></div>
        <div className="sc-purple">✦ Music is better when you find it yourself.</div>
        <h3>ARTISTS YOU SHOULD FOLLOW</h3>{TRACKS.map(t => <div className="sc-artist" key={t.id}><img src={`/sandbox/${t.image}.jpg`} alt="" /><div><b {...node(`artist-${t.artistId}`)}>{t.artist}</b><small>♟ {t.id === 'midnight' ? '18.4K' : '7.2K'} · ▥ 3 tracks</small></div>{control(`follow-${t.artistId}`, s.followedTopics.includes(t.artist) ? 'Following' : 'Follow', 'sc-follow')}</div>)}
        <h3>{s.liked.length} {s.liked.length === 1 ? 'LIKE' : 'LIKES'}</h3>{TRACKS.filter(t => s.liked.includes(t.id)).map(t => <div className="sc-liked-track" key={t.id}><img src={`/sandbox/${t.image}.jpg`} alt="" /><div><small>{t.artist}</small>{control(`play-${t.id}`, t.title)}<small>▶ {t.plays} · ♥ Liked</small></div></div>)}
        <p className="sc-disclaimer">Local listening sandbox. Fictional artists and original 32-second instrumental previews. No SoundCloud account required.</p>
      </aside></div>
    </div>
    <footer className="sc-player">
      {control(`play-${current.id}`, playing ? 'Ⅱ' : '▶', 'sc-player-play')}
      <button aria-label="Next track" onClick={() => act(`play-${TRACKS[(TRACKS.indexOf(current) + 1) % TRACKS.length].id}`)}>▶|</button>
      <span className="sc-time">{format(time)}</span><input aria-label="Playback position" type="range" min="0" max={duration} step=".1" value={time} onChange={e => { if (audio.current) { audio.current.currentTime = Number(e.target.value); setTime(Number(e.target.value)); } }} /><span className="sc-time">{format(duration)}</span>
      <label className="sc-volume">♪ <input aria-label="Volume" type="range" min="0" max="1" step=".01" value={volume} onChange={e => setVolume(Number(e.target.value))} /></label>
      <img src={`/sandbox/${current.image}.jpg`} alt="" /><div className="sc-player-title"><small>{current.artist}</small><b>{current.title}</b></div>{control(`like-${current.id}`, s.liked.includes(current.id) ? '♥' : '♡', s.liked.includes(current.id) ? 'sc-liked' : '')}
    </footer>
    {error && <div role="alert" className="sc-audio-error">{error}</div>}
    <audio ref={audio} src={`/sandbox/${current.id}.wav`} preload="metadata" onTimeUpdate={e => setTime(e.currentTarget.currentTime)} onLoadedMetadata={e => { setDuration(e.currentTarget.duration); setTime(0); }} onEnded={() => { if (playing) act(`play-${current.id}`); }} onError={() => setError('The audio preview could not be loaded. Please try another track.')} />
    <p {...node('current-state')} className="sr-only">{doc.blocks.find(b => b.id === 'current-state')?.text}</p>
  </div>;
}
