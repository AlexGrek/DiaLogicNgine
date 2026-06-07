import Phaser from 'phaser'
import { loadPlayerSettings } from '../PlayerSettings'

export class DialogTypewriter {
    private timer: Phaser.Time.TimerEvent | null = null
    private index = 0
    private complete = true
    private fullText: string

    constructor(
        scene: Phaser.Scene,
        private textObj: Phaser.GameObjects.Text,
        fullText: string,
        private onComplete?: () => void,
    ) {
        this.fullText = fullText
        const settings = loadPlayerSettings()
        if (!settings.letterByLetter || !fullText) {
            textObj.setText(fullText)
            this.complete = true
            this.onComplete?.()
            this.onComplete = undefined
            return
        }
        this.complete = false
        textObj.setText('')
        this.timer = scene.time.addEvent({
            delay: settings.letterByLetterSpeedMs,
            callback: () => {
                this.index += 1
                textObj.setText(fullText.slice(0, this.index))
                if (this.index >= fullText.length) {
                    this.finish()
                }
            },
            loop: true,
        })
    }

    private finish() {
        if (this.complete) {
            return
        }
        this.timer?.remove(false)
        this.timer = null
        this.textObj.setText(this.fullText)
        this.complete = true
        this.onComplete?.()
        this.onComplete = undefined
    }

    /** Instantly reveal all text. Returns true if a skip occurred. */
    skip(): boolean {
        if (this.complete) {
            return false
        }
        this.finish()
        return true
    }

    isComplete(): boolean {
        return this.complete
    }

    destroy() {
        this.timer?.remove(false)
        this.timer = null
    }
}
