import { useCallback, useEffect, useRef, useState } from 'react'

export function useTypewriterText(
    fullText: string,
    enabled: boolean,
    speedMs: number,
    resetKey: string,
) {
    const [displayText, setDisplayText] = useState(enabled ? '' : fullText)
    const [isComplete, setIsComplete] = useState(!enabled)
    const indexRef = useRef(0)
    const timerRef = useRef<number | null>(null)

    const clearTimer = useCallback(() => {
        if (timerRef.current != null) {
            window.clearInterval(timerRef.current)
            timerRef.current = null
        }
    }, [])

    useEffect(() => {
        clearTimer()
        if (!enabled || !fullText) {
            setDisplayText(fullText)
            setIsComplete(true)
            indexRef.current = fullText.length
            return clearTimer
        }
        indexRef.current = 0
        setDisplayText('')
        setIsComplete(false)
        timerRef.current = window.setInterval(() => {
            indexRef.current += 1
            if (indexRef.current >= fullText.length) {
                setDisplayText(fullText)
                setIsComplete(true)
                clearTimer()
            } else {
                setDisplayText(fullText.slice(0, indexRef.current))
            }
        }, speedMs)
        return clearTimer
    }, [fullText, enabled, speedMs, resetKey, clearTimer])

    const skip = useCallback(() => {
        if (indexRef.current >= fullText.length) {
            return false
        }
        clearTimer()
        setDisplayText(fullText)
        setIsComplete(true)
        indexRef.current = fullText.length
        return true
    }, [fullText, clearTimer])

    return { displayText, isComplete, skip }
}
