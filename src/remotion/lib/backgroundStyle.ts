import type { CSSProperties } from 'react'
import type { PatternType } from '../../store/useFeatureGraphicStore'

export const patternDataUrls: Record<PatternType, string> = {
    dots: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='rgba(255,255,255,0.1)'/%3E%3C/svg%3E")`,
    grid: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none' stroke='rgba(255,255,255,0.08)' stroke-width='1'/%3E%3C/svg%3E")`,
    waves: `url("data:image/svg+xml,%3Csvg width='100' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q25 0 50 10 T100 10' fill='none' stroke='rgba(255,255,255,0.08)' stroke-width='2'/%3E%3C/svg%3E")`,
    circles: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='20' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='1'/%3E%3C/svg%3E")`,
}

export type BackgroundConfig = {
    backgroundType: 'gradient' | 'solid' | 'pattern' | 'image'
    backgroundColor: string
    backgroundGradient: string
    backgroundPattern: PatternType
    backgroundImage: string | null
}

export function getBackgroundStyle(config: BackgroundConfig): CSSProperties {
    switch (config.backgroundType) {
        case 'gradient':
            return { background: config.backgroundGradient }
        case 'solid':
            return { background: config.backgroundColor }
        case 'pattern':
            return {
                background: config.backgroundColor,
                backgroundImage: patternDataUrls[config.backgroundPattern],
            }
        case 'image':
            return config.backgroundImage
                ? {
                      backgroundImage: `url(${config.backgroundImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                  }
                : { background: config.backgroundColor }
        default:
            return { background: config.backgroundGradient }
    }
}
