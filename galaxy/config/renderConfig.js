// minimum and maximum star sizes
export const STAR_MIN = 0.1
export const STAR_MAX = 1.5

export const HAZE_MAX = 35.0  // Smaller maximum for less splotchy appearance
export const HAZE_MIN = 20.0  // Closer to max for more uniformity
export const HAZE_OPACITY = 0.15  // Lower opacity to reduce brightness

export const BASE_LAYER = 0
export const BLOOM_LAYER = 1
export const OVERLAY_LAYER = 2

export const BLOOM_PARAMS = {
    exposure: 1.1,
    bloomStrength: 1.5,
    bloomThreshold: 0.5,
    bloomRadius: 0.4
};