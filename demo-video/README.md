# Guide demo media

The playground's GIF / Video switch uses the latest demo from `main`:

- `latest.mp4`: original latest video, preserved unchanged (HEVC/AAC, 1920×1080, about 21.8 seconds).
- `latest.gif`: regenerated from `latest.mp4` at **1920×1080**, 8 fps, looping, with timed English captions burned in. This replaces the 426×240 GIF supplied by main at commit `bd3ae9e` (recoverable from Git if needed).
- `guide-demo-browser.mp4`: H.264/AAC copy of the latest video at 1920×1080. Original audio retained.
- `guide-demo-browser.webm`: VP9/Opus fallback for browsers without H.264 support.
- `../public/examples/guide-demo-poster.jpg`: latest first-frame preview.
- `../public/examples/guide-demo.en.vtt`: English captions transcribed from the latest narration.
- `legacy/0820(2).mp4`: previous original video, retained by main.

The Guide card defaults to GIF. Select Video for sound and toggleable subtitles. The inline video is muted; enlarged playback enables sound by default. GIF has no audio.

Source media in this folder uses Git LFS. Run `git lfs pull` when editing source assets.

## Deployment

The live app serves **regular Git binary copies** from `public/demo-media/`, not Git LFS files or a serverless media API. This avoids missing LFS downloads in deployment checkouts and large function-response limits:

- `/demo-media/guide-latest.gif`
- `/demo-media/guide-latest.mp4`
- `/demo-media/guide-latest.webm`

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
  "[0:v]fps=8,subtitles=filename=public/examples/guide-demo.en.vtt:force_style='FontName=DejaVu Sans,FontSize=14,Outline=1,Shadow=0,MarginV=12',split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
  -loop 0 demo-video/latest.gif
```

Verify the resulting H.264 profile/level before updating the codec string in `ExampleMedia.tsx` if conversion settings change.
