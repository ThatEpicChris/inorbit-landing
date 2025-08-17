/**
 * Shader used for combining the multiple render passes
 * 
 * Basically we set render target screen to false for our effects passes, so they render to a texture. Then for each pixel
 * we blend the layers together.
 */

export class CompositionShader {

    static fragment = `
        uniform sampler2D baseTexture;
        uniform sampler2D bloomTexture;
        uniform sampler2D overlayTexture;

        varying vec2 vUv;

        void main() {
            vec4 base = texture2D(baseTexture, vUv);
            vec4 bloom = texture2D(bloomTexture, vUv);
            
            // Preserve alpha channel through the composition
            vec4 final = base + bloom;
            final.a = max(base.a, bloom.a);
            
            gl_FragColor = final;
        }
`

    static vertex = `
        varying vec2 vUv;

        void main() {

            vUv = uv;

            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

        }
`
}