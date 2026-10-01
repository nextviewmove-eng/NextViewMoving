import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"

/**
 * Phase 6 signature pad.
 *
 * No project dependency provides signature drawing, so this is a small
 * canvas + Pointer Events implementation. Pointer events give mouse, touch and
 * pen support through one code path, `touch-action: none` stops the page
 * scrolling while signing, and `toPngDataUrl` returns the exact
 * `data:image/png;base64,...` string that the backend signing endpoint
 * requires (see signDocumentValidation in
 * backend/src/middleware/leadDocumentValidation.middleware.js).
 */

const STROKE_COLOR = "#0C2340"
const STROKE_WIDTH = 2.25
/** Transparent padding kept around the ink when the PNG is cropped. */
const CROP_PADDING = 12
/** Alpha above this counts as ink when finding the signature bounds. */
const INK_THRESHOLD = 8

export type AdminSignaturePadHandle = {
  isEmpty: () => boolean
  toPngDataUrl: () => string
  clear: () => void
}

type AdminSignaturePadProps = {
  padRef: React.Ref<AdminSignaturePadHandle>
  onChange: (isEmpty: boolean) => void
  disabled?: boolean
}

type Point = { x: number; y: number }

/**
 * Trims the transparent margins so the signature fills the area the backend
 * reserves for it in the signed PDF. The backend only ever scales a PNG down,
 * so a full-canvas export would render very small.
 */
function cropToInk(canvas: HTMLCanvasElement): HTMLCanvasElement | null {
  const context = canvas.getContext("2d")
  if (!context) return null

  const { width, height } = canvas
  const pixels = context.getImageData(0, 0, width, height).data
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] > INK_THRESHOLD) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null

  const padding = Math.round(CROP_PADDING * (window.devicePixelRatio || 1))
  const left = Math.max(0, minX - padding)
  const top = Math.max(0, minY - padding)
  const right = Math.min(width, maxX + padding)
  const bottom = Math.min(height, maxY + padding)

  const cropped = document.createElement("canvas")
  cropped.width = right - left
  cropped.height = bottom - top
  cropped
    .getContext("2d")
    ?.drawImage(
      canvas,
      left,
      top,
      right - left,
      bottom - top,
      0,
      0,
      right - left,
      bottom - top,
    )
  return cropped
}

export default function AdminSignaturePad({
  padRef,
  onChange,
  disabled = false,
}: AdminSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const hasInkRef = useRef(false)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<Point | null>(null)
  const notifyRef = useRef(onChange)
  const [empty, setEmpty] = useState(true)
  notifyRef.current = onChange

  const syncSize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return

    const ratio = window.devicePixelRatio || 1
    const width = Math.round(rect.width * ratio)
    const height = Math.round(rect.height * ratio)
    if (canvas.width === width && canvas.height === height) return

    // Keep what has been drawn so far when the viewport or layout resizes.
    let snapshot: HTMLCanvasElement | null = null
    if (canvas.width > 0 && canvas.height > 0 && hasInkRef.current) {
      snapshot = document.createElement("canvas")
      snapshot.width = canvas.width
      snapshot.height = canvas.height
      snapshot.getContext("2d")?.drawImage(canvas, 0, 0)
    }

    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")
    if (!context) return
    context.setTransform(1, 0, 0, 1, 0, 0)
    if (snapshot) context.drawImage(snapshot, 0, 0, width, height)
    // Draw in CSS pixels from here on.
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.lineCap = "round"
    context.lineJoin = "round"
    context.lineWidth = STROKE_WIDTH
    context.strokeStyle = STROKE_COLOR
    contextRef.current = context
  }, [])

  useEffect(() => {
    syncSize()
    const canvas = canvasRef.current
    if (!canvas || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => syncSize())
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [syncSize])

  /** `hasInk` is the ink flag; `empty` and `onChange` both report the inverse. */
  const setInk = useCallback((hasInk: boolean) => {
    if (hasInkRef.current === hasInk) return
    hasInkRef.current = hasInk
    setEmpty(!hasInk)
    notifyRef.current(!hasInk)
  }, [])

  const toLocal = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return
    event.preventDefault()
    syncSize()
    const context = contextRef.current
    if (!context) return

    event.currentTarget.setPointerCapture(event.pointerId)
    const point = toLocal(event)
    drawingRef.current = true
    lastPointRef.current = point

    // A tap without movement still counts as a signature.
    context.beginPath()
    context.moveTo(point.x, point.y)
    context.lineTo(point.x + 0.01, point.y)
    context.stroke()
    setInk(true)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return
    event.preventDefault()
    const context = contextRef.current
    const last = lastPointRef.current
    if (!context || !last) return

    const point = toLocal(event)
    // Curving through the midpoint of the last two points keeps lines smooth.
    context.beginPath()
    context.moveTo(last.x, last.y)
    context.quadraticCurveTo(
      last.x,
      last.y,
      (last.x + point.x) / 2,
      (last.y + point.y) / 2,
    )
    context.stroke()
    lastPointRef.current = point
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    event.preventDefault()
    drawingRef.current = false
    lastPointRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    const context = contextRef.current
    if (canvas && context) {
      context.save()
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.restore()
    }
    drawingRef.current = false
    lastPointRef.current = null
    setInk(false)
  }, [setInk])

  const isEmpty = useCallback(() => !hasInkRef.current, [])

  const toPngDataUrl = useCallback((): string => {
    const canvas = canvasRef.current
    if (!canvas || !hasInkRef.current) return ""
    const cropped = cropToInk(canvas)
    return (cropped ?? canvas).toDataURL("image/png")
  }, [])

  useImperativeHandle(
    padRef,
    () => ({ isEmpty, toPngDataUrl, clear }),
    [isEmpty, toPngDataUrl, clear],
  )

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label="Signature pad. Draw the customer signature using a mouse, finger or stylus."
        className={`block h-40 w-full touch-none rounded-lg border-2 border-dashed border-slate-300 bg-white ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-crosshair"
        }`}
      />
      {empty ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold uppercase tracking-widest text-slate-300">
          Sign here
        </span>
      ) : null}
    </div>
  )
}
