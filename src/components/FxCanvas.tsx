import { useLayoutEffect, useRef } from 'react'
import { H, W } from '../config'

/** A full-frame canvas redrawn synchronously every frame (deterministic, so Remotion can render frames in any order). */
export const FxCanvas: React.FC<{ draw: (ctx: CanvasRenderingContext2D) => void; style?: React.CSSProperties }> = ({ draw, style }) => {
  const ref = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, W, H)
    draw(ctx)
  })
  return <canvas ref={ref} width={W} height={H} style={{ position: 'absolute', inset: 0, width: W, height: H, ...style }} />
}
