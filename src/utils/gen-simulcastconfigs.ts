import { SimulcastConfig } from '@/typings/data';

// Math.round(width * height * frameRate * 0.000078125)
export function generateSimulcastConfigs(width: number, height: number, frameRate: number): SimulcastConfig[] {
    const configs: SimulcastConfig[] = [];
    // Origin
    configs.push({
        rid: 'origin',
        scaleResolutionDownBy: 1,
        bitrate: Math.round(width * height * frameRate * 0.000078125),
    });
    // Low
    configs.push({
        rid: 'low',
        scaleResolutionDownBy: 4,
        bitrate: Math.round((width / 4) * (height / 4) * frameRate * 0.000078125),
    })
    return configs;
}
