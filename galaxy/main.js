import * as THREE from 'three'

// Data and visualization
import { CompositionShader} from './shaders/CompositionShader.js'
import { BASE_LAYER, BLOOM_LAYER, BLOOM_PARAMS, OVERLAY_LAYER } from "./config/renderConfig.js";

// Rendering
import { MapControls } from 'three/addons/controls/OrbitControls.js'

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Galaxy } from './objects/galaxy.js';

let canvas, renderer, camera, scene, orbit, baseComposer, bloomComposer, overlayComposer

function initThree() {

    // grab canvas
    canvas = document.querySelector('#canvas');

    // scene
    scene = new THREE.Scene();
    scene.background = null;  // Transparent background
    scene.fog = null;  // Remove fog for cleaner transparency

    // camera
    camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 0.1, 5000000 );
    
    // Set camera position based on viewport
    if (window.innerWidth <= 700) {
        const topThirdOffset = -(window.innerHeight / 3);
        camera.position.set(0, topThirdOffset + 850, 850);  // Position above the galaxy
        camera.lookAt(0, topThirdOffset, 0);  // Look at the galaxy in top third
    } else {
        camera.position.set(375, 750, 750);  // Desktop position
        camera.lookAt(400, 0, 0);  // Look at offset galaxy
    }
    
    camera.up.set(0, 0, 1);

    // map orbit
    orbit = new MapControls(camera, canvas)
    orbit.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    orbit.dampingFactor = 0.1;
    orbit.target.set(0, 0, 0);  // Set orbit controls target to galaxy center
    
    orbit.screenSpacePanning = false;
    orbit.minDistance = 1;
    orbit.maxDistance = 16384;
    orbit.maxPolarAngle = (Math.PI / 2) - (Math.PI / 360)

    initRenderPipeline()

}

function handleResize() {
    // Update camera aspect ratio and projection matrix
    camera.aspect = window.innerWidth / window.innerHeight;
    
    // Adjust camera position for mobile/desktop
    if (window.innerWidth <= 700) {
        const topThirdOffset = -(window.innerHeight / 3);
        camera.position.set(0, topThirdOffset + 850, 850);  // Position above the galaxy
        camera.lookAt(0, topThirdOffset, 0);  // Look at the galaxy's new position
    } else {
        camera.position.set(375, 750, 750);
        camera.lookAt(400, 0, 0);
    }
    
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update composer sizes
    baseComposer.setSize(window.innerWidth, window.innerHeight);
    bloomComposer.setSize(window.innerWidth, window.innerHeight);
    overlayComposer.setSize(window.innerWidth, window.innerHeight);

    // Set canvas size explicitly
    canvas.style.width = '100%';
    canvas.style.height = '100%';
}

function initRenderPipeline() {
    // Assign Renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas,
        logarithmicDepthBuffer: true
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputEncoding = THREE.sRGBEncoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.5
    renderer.setClearColor(0x06080A, 1)
    renderer.autoClear = true

    // General-use rendering pass for chaining
    const renderScene = new RenderPass( scene, camera )

    // Rendering pass for bloom
    const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 )
    bloomPass.threshold = BLOOM_PARAMS.bloomThreshold
    bloomPass.strength = BLOOM_PARAMS.bloomStrength
    bloomPass.radius = BLOOM_PARAMS.bloomRadius

    // bloom composer
    bloomComposer = new EffectComposer(renderer)
    bloomComposer.renderToScreen = false
    bloomComposer.addPass(renderScene)
    bloomComposer.addPass(bloomPass)

    // overlay composer
    overlayComposer = new EffectComposer(renderer)
    overlayComposer.renderToScreen = false
    overlayComposer.addPass(renderScene)

    // Shader pass to combine base layer, bloom, and overlay layers
    const finalPass = new ShaderPass(
        new THREE.ShaderMaterial( {
            uniforms: {
                baseTexture: { value: null },
                bloomTexture: { value: bloomComposer.renderTarget2.texture },
                overlayTexture: { value: overlayComposer.renderTarget2.texture }
            },
            vertexShader: CompositionShader.vertex,
            fragmentShader: CompositionShader.fragment,
            defines: {},
            transparent: true
        } ), 'baseTexture'
    );
    finalPass.needsSwap = true;

    // base layer composer
    baseComposer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(
        window.innerWidth,
        window.innerHeight,
        {
            alpha: true,
            format: THREE.RGBAFormat,
            transparent: true
        }
    ));
    baseComposer.addPass(renderScene)
    baseComposer.addPass(finalPass)
}

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
}

async function render() {

    orbit.update();

    // Rotate the entire galaxy container
    galaxy.container.rotation.z -= 0.001; // Reversed direction and doubled speed

    // fix buffer size
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }
        /*
    // fix buffer size
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }
        */

    // fix aspect ratio
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();

    galaxy.updateScale(camera)

    // Run each pass of the render pipeline
    renderPipeline()

    requestAnimationFrame(render)

}

function renderPipeline() {
    // Clear the render target and depth buffer
    renderer.clear();
    
    // Save current renderer state
    const currentAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    // Render bloom pass
    camera.layers.set(BLOOM_LAYER);
    bloomComposer.render();
    
    // Render overlays
    camera.layers.set(OVERLAY_LAYER);
    overlayComposer.render();

    // Render base scene with composition
    camera.layers.set(BASE_LAYER);
    baseComposer.render();

    // Restore renderer state
    renderer.autoClear = currentAutoClear;
}

// Initial setup
initThree()

let galaxy = new Galaxy(scene)

// Set initial canvas style
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';

// Add window resize listener
window.addEventListener('resize', handleResize, false);

// Start render loop
requestAnimationFrame(render)