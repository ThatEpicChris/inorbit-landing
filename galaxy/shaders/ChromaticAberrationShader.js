/**
 * Chromatic Aberration Shader
 * Adds subtle color separation for a more realistic star appearance
 */

export class ChromaticAberrationShader {

    static fragment = `
        uniform sampler2D tDiffuse;
        uniform float offset;
        uniform float intensity;
        
        varying vec2 vUv;

        void main() {
            vec2 uv = vUv;
            
            // Sample the texture with slight offsets for red and blue channels
            float r = texture2D(tDiffuse, uv + vec2(offset * intensity, 0.0)).r;
            float g = texture2D(tDiffuse, uv).g;
            float b = texture2D(tDiffuse, uv - vec2(offset * intensity, 0.0)).b;
            float a = texture2D(tDiffuse, uv).a;
            
            gl_FragColor = vec4(r, g, b, a);
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
