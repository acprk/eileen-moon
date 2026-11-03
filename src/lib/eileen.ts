/**
 * 张爱玲 figure library — one consistent heroine across the whole film.
 *
 * eileen(ctx, pose, o) draws a hand-drawn figure with the pen engine, anchored at its BOTTOM-CENTRE (x, y),
 * scaled so the drawing is `h` px tall. `progress` 0..1 draws it stroke by stroke (1 = finished drawing),
 * `fill` 0..1 fades in the watercolour washes (qipao colour, hair), `t` drives line boil.
 *
 * Poses (owner of each implementation in brackets):
 *   [H1 eileen_young.ts]
 *   'iconic'       waist-up, the 1954 Hong Kong portrait: high-collar qipao, left hand on hip, chin raised,
 *                  eyes looking down at the viewer, short wavy 1940s hair.
 *   'youngStand'   full body standing, 1940s, short-sleeved high-collar qipao, contrapposto, a book in hand.
 *   'lookBack'     full body, back view, turning her head over the right shoulder.
 *   'walkUmbrella' full body walking in rain under an oil-paper umbrella, 3/4 back view.
 *   'writing'      seated at a small desk in profile, writing with a pen; desk lamp and chair included.
 *   [H2 eileen_other.ts]
 *   'child'        ~4-year-old girl, full body, bob with a straight fringe, padded jacket, standing.
 *   'girlWindow'   17-year-old seated on the floor, knees drawn up, arms round knees, face turned up-right
 *                  (toward a window / the moon).
 *   'shipRail'     full body from behind at a ship's rail (1955): coat, scarf, hair in wind, looking at sea.
 *   'oldProfile'   elderly woman (1990s), bust in right-facing profile: short hair, large glasses.
 *   'oldAtDesk'    elderly woman seated at a desk, 3/4 view, by a window; letters and pages on the desk.
 */
import type { Ctx } from './texture'
import { drawYoung } from './eileen_young'
import { drawOther } from './eileen_other'

export type EileenPose = 'iconic' | 'youngStand' | 'lookBack' | 'walkUmbrella' | 'writing' | 'child' | 'girlWindow' | 'shipRail' | 'oldProfile' | 'oldAtDesk'

export type EileenOpts = {
  x: number
  y: number
  /** drawing height in px */
  h: number
  progress?: number
  fill?: number
  t?: number
  /** line colour; default sepia ink on paper scenes. Use C.lineNight on night scenes. */
  color?: string
  /** qipao / clothing wash colour */
  dress?: string
  alpha?: number
  /** mirror horizontally */
  flip?: boolean
  /** line boil fps (default 8; 0 = still) */
  boil?: number
  /** overall line width multiplier */
  weight?: number
  /** monochrome silver-gelatin print rendering (greys, studio background) — used for the 1954 portrait */
  mono?: boolean
}

const YOUNG = new Set<EileenPose>(['iconic', 'youngStand', 'lookBack', 'walkUmbrella', 'writing'])

export function eileen(ctx: Ctx, pose: EileenPose, o: EileenOpts) {
  if ((o.alpha ?? 1) <= 0 || (o.progress ?? 1) <= 0) return
  ctx.save()
  ctx.globalAlpha *= o.alpha ?? 1
  if (YOUNG.has(pose)) drawYoung(ctx, pose, o)
  else drawOther(ctx, pose, o)
  ctx.restore()
}
