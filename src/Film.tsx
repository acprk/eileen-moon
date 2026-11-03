import { useEffect, useState } from 'react'
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { FxCanvas } from './components/FxCanvas'
import { AUDIO_FILE, DUR, MUSIC_FADE } from './config'
import { registerScenes, renderFilm, type Scene } from './lib/film'

function useFonts() {
  const [ready, setReady] = useState(false)
  const [handle] = useState(() => delayRender('fonts'))
  useEffect(() => {
    Promise.all([
      document.fonts.load('400 40px "Noto Serif CJK SC"', '张爱玲月亮'),
      document.fonts.load('300 40px "Noto Serif CJK SC"', '张爱玲'),
      document.fonts.load('400 40px "AR PL UKai CN"', '张爱玲'),
      document.fonts.load('400 40px "EB Garamond"', 'Eileen'),
      document.fonts.load('italic 400 40px "EB Garamond"', 'Eileen'),
    ])
      .catch(() => undefined)
      .then(() => {
        setReady(true)
        continueRender(handle)
      })
  }, [handle])
  return ready
}

/** Build the film component for a given scene list. `offset` (s) starts mid-film; audio follows. */
export function makeFilm(scenes: Scene[]): React.FC<{ offset?: number; audio?: boolean }> {
  registerScenes(scenes)
  return ({ offset = 0, audio = true }) => {
    const frame = useCurrentFrame()
    const { fps } = useVideoConfig()
    const t = offset + frame / fps
    const fonts = useFonts()
    return (
      <AbsoluteFill style={{ background: '#0f1420' }}>
        {audio && (
          <Audio src={staticFile(AUDIO_FILE)} startFrom={Math.round(offset * fps)}
            volume={(f) => Math.min(1, Math.max(0, (DUR - (offset + f / fps)) / MUSIC_FADE))} />
        )}
        {fonts && <FxCanvas draw={(ctx) => renderFilm(ctx, t)} />}
      </AbsoluteFill>
    )
  }
}
