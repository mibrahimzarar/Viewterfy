import type { FC } from 'react'
import { Composition } from 'remotion'
import { ViewterfyComposition } from './ViewterfyComposition'
import { computeSeriesTotalFrames } from './viewterfyTimeline'
import { defaultViewterfyProps, viewterfyPropsSchema } from './viewterfyProps'

export const RemotionRoot: FC = () => {
    return (
        <>
            <Composition
                id="Viewterfy"
                component={ViewterfyComposition}
                schema={viewterfyPropsSchema}
                defaultProps={defaultViewterfyProps}
                calculateMetadata={async ({ props }) => ({
                    durationInFrames: computeSeriesTotalFrames(props),
                    fps: props.fps,
                    width: props.width,
                    height: props.height,
                })}
            />
        </>
    )
}
