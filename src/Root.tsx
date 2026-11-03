import { Composition } from 'remotion'
import { DUR, FPS, H, W } from './config'
import { makeFilm } from './Film'
import { ALL_SCENES } from './scenes'

const Film = makeFilm(ALL_SCENES)

export const Root: React.FC = () => (
  <Composition id="Film" component={Film} width={W} height={H} fps={FPS} durationInFrames={Math.round(DUR * FPS)}
    defaultProps={{ offset: 0, audio: true }} />
)
