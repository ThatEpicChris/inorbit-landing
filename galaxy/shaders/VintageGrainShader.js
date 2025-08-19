/**
 * Vintage Grain Shader
 * Mimics 70s sci-fi art with film grain, color shifts, and vintage aesthetics
 */

export class VintageGrainShader {

    static fragment = `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform float grainIntensity;
        uniform float colorShift;
        
        varying vec2 vUv;

        // Pseudo-random function for grain
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        // Noise function for grain texture
        float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            
            vec2 u = f * f * (3.0 - 2.0 * f);
            
            return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        void main() {
            vec2 uv = vUv;
            vec4 texColor = texture2D(tDiffuse, uv);
            
            // Generate grain based on position and time
            vec2 grainPos = uv * 300.0 + time * 0.1;
            float grain = noise(grainPos) * 2.0 - 1.0;
            grain *= grainIntensity;
            
            // Add subtle color shift for vintage feel
            float shift = colorShift * 0.01;
            vec4 shiftedColor = vec4(
                texture2D(tDiffuse, uv + vec2(shift, 0.0)).r,
                texColor.g,
                texture2D(tDiffuse, uv - vec2(shift, 0.0)).b,
                texColor.a
            );
            
            // Apply grain to each channel with slight variation
            vec4 grainColor = shiftedColor + vec4(
                grain * 0.1,
                grain * 0.08,
                grain * 0.12,
                0.0
            );
            
            // Add subtle vintage color grading
            vec3 vintage = grainColor.rgb;
            vintage.r *= 1.05; // Slight red boost
            vintage.g *= 0.98; // Slight green reduction
            vintage.b *= 1.02; // Slight blue boost
            
            // Add subtle vignette effect
            float vignette = 1.0 - length(uv - 0.5) * 0.3;
            vignette = clamp(vignette, 0.7, 1.0);
            
            gl_FragColor = vec4(vintage * vignette, grainColor.a);
        }
    `

    static vertex = `
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `
}
