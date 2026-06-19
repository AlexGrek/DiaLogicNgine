import { useCallback, useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'

/**
 * Reveals `fullText` character by character using a framer-motion value tween.
 * Unlike a setInterval typewriter this is frame-driven (smooth, refresh-rate
 * independent) and the whole reveal is finished in `fullText.length * speedMs`.
 *
 * The returned `displayText` is the revealed prefix; callers render the full
 * text with the unrevealed tail kept transparent so layout never reflows.
 */
export function useTypewriterText(
    fullText: string,
    enabled: boolean,
    speedMs: number,
    resetKey: string,
) {
    const [count, setCount] = useState<number>(enabled ? 0 : fullText.length)
    const [isComplete, setIsComplete] = useState<boolean>(!enabled)
    const stopRef = useRef<(() => void) | null>(null)

    const stop = useCallback(() => {
        if (stopRef.current) {
            stopRef.current()
            stopRef.current = null
        }
    }, [])

    useEffect(() => {
        stop()
        if (!enabled || !fullText) {
            setCount(fullText.length)
            setIsComplete(true)
            return
        }
        setCount(0)
        setIsComplete(false)
        const duration = Math.max(0.05, (fullText.length * speedMs) / 1000)
        const controls = animate(0, fullText.length, {
            duration,
            ease: 'linear',
            onUpdate: (value) => setCount(Math.min(fullText.length, Math.floor(value))),
            onComplete: () => {
                setCount(fullText.length)
                setIsComplete(true)
            },
        })
        stopRef.current = () => controls.stop()
        return stop
    }, [fullText, enabled, speedMs, resetKey, stop])

    const skip = useCallback(() => {
        if (count >= fullText.length) {
            return false
        }
        stop()
        setCount(fullText.length)
        setIsComplete(true)
        return true
    }, [count, fullText.length, stop])

    return { displayText: fullText.slice(0, count), isComplete, skip }
}
