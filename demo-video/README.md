# Guide demo media

The playground's GIF / Video switch uses the latest demo from `main`:

- `latest.mp4`: original latest video, preserved unchanged (HEVC/AAC, 1920×1080, about 21.8 seconds).
- `latest.gif`: regenerated from `latest.mp4` at **1920×1080**, 12 fps, looping at **1.5× speed** (about 14.58 seconds), with no text burned into the image. A numbered 1–3 explanation appears only in the enlarged view, with the active step highlighted. This replaces the 426×240 GIF supplied by main at commit `bd3ae9e` (recoverable from Git if needed).
- `guide-demo-browser.mp4`: H.264/AAC copy of the latest video at 1920×1080. Original audio retained.
- `guide-demo-browser.webm`: VP9/Opus fallback for browsers without H.264 support.
- `guide-gif-seekable.mp4` / `.webm`: silent video encodings of the actual accelerated GIF, used only for its enlarged, seekable preview. The inline preview remains the real GIF.
- `../public/examples/guide-demo-poster.jpg`: latest first-frame preview.
- `../public/examples/guide-demo.en.vtt`: English captions transcribed from the latest narration.
- `legacy/0820(2).mp4`: previous original video, retained by main.

The Guide card defaults to GIF. Inline previews hide all narration and numbered steps. Click the GIF or Enlarge to reveal the step panel. Video step highlights follow playback/seeking (0–8 seconds: map; 8–15 seconds: search; 15+ seconds: annotated result), with the matching spoken narration beside the video. GIF highlights use the silent seekable player's actual playback clock, adjusted for 1.5× speed. Every numbered step is clickable (and keyboard accessible) to seek to its exact scene and resume playback; the active step also follows manual seeking. The GIF preview loops silently. No captions cover the bottom of the media. On narrow screens, the enlarged panel moves below the media without covering it. The inline video is muted; enlarged playback enables sound by default. GIF has no audio.

Source media in this folder uses Git LFS. Run `git lfs pull` when editing source assets.

## Deployment

The live app serves **regular Git binary copies** from `public/demo-media/`, not Git LFS files or a serverless media API. This avoids missing LFS downloads in deployment checkouts and large function-response limits:

- `/demo-media/guide-latest.gif`
- `/demo-media/guide-latest.mp4`
- `/demo-media/guide-latest.webm`
- `/demo-media/guide-gif-seekable.mp4` and `.webm`

Versioned URLs prevent stale browser caches. Old `/api/demo-video` URLs redirect to these static assets. Next.js/static hosts provide byte-range playback and CDN delivery.

After regenerating source media, run:

```bash
node scripts/prepare-demo-media.mjs
```

Commit the `public/demo-media/` copies as well as the LFS sources. The copies explicitly opt out of LFS in `.gitattributes`, so deployment does not need Git LFS for GIF/video playback.

## Regenerate with FFmpeg

Refresh `public/examples/guide-demo.en.vtt` from the latest narration first, then:

```bash
ffmpeg -i demo-video/latest.mp4 -map 0:v:0 -map '0:a:0?' \
  -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p \
  -c:a copy -movflags +faststart demo-video/guide-demo-browser.mp4
ffmpeg -i demo-video/guide-demo-browser.mp4 -c:v libvpx-vp9 -b:v 0 -crf 35 \
  -deadline realtime -cpu-used 6 -c:a libopus -b:a 64k demo-video/guide-demo-browser.webm
ffmpeg -ss 0 -i demo-video/guide-demo-browser.mp4 -frames:v 1 -q:v 3 \
  public/examples/guide-demo-poster.jpg
ffmpeg -i demo-video/latest.mp4 -filter_complex \
  "[0:v]setpts=PTS/1.5,fps=12,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
  -loop 0 demo-video/latest.gif
```

After regenerating the GIF, regenerate its seekable copies and delivery assets:

```bash
ffmpeg -i demo-video/latest.gif -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p \
  -r 12 -profile:v high -level:v 4.0 -an -movflags +faststart demo-video/guide-gif-seekable.mp4
ffmpeg -i demo-video/guide-gif-seekable.mp4 -c:v libvpx-vp9 -b:v 0 -crf 32 \
  -deadline realtime -cpu-used 6 -an demo-video/guide-gif-seekable.webm
node scripts/prepare-demo-media.mjs
```

Verify the resulting H.264 profile/level before updating the codec string in `ExampleMedia.tsx` if conversion settings change.
