import * as THREE from 'three'

// Data and visualization
import { CompositionShader} from './shaders/CompositionShader.js'
import { ChromaticAberrationShader } from './shaders/ChromaticAberrationShader.js'
import { VintageGrainShader } from './shaders/VintageGrainShader.js'
import { BASE_LAYER, BLOOM_LAYER, BLOOM_PARAMS, OVERLAY_LAYER } from "./config/renderConfig.js";

// Rendering
import { MapControls } from 'three/addons/controls/OrbitControls.js'

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Galaxy } from './objects/galaxy.js';

let canvas, renderer, camera, scene, orbit, baseComposer, bloomComposer, overlayComposer
let mouse = new THREE.Vector2()
let raycaster = new THREE.Raycaster()

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
    // Set orbit target after initialization
    if (window.innerWidth <= 700) {
        const yOffset = window.innerHeight * 0.1;
        orbit.target.set(0, yOffset, 0);
    } else {
        orbit.target.set(800, 0, 0);
    }
    
    orbit.screenSpacePanning = false;
    orbit.minDistance = 1;
    orbit.maxDistance = 16384;
    orbit.maxPolarAngle = (Math.PI / 2) - (Math.PI / 360)
    
    // Keep orbit controls enabled but handle mouse events properly
    orbit.enabled = true;

    initRenderPipeline()

}

function handleResize() {
    // Update camera aspect ratio and projection matrix
    camera.aspect = window.innerWidth / window.innerHeight;
    
    // Adjust camera position for mobile/desktop
    if (window.innerWidth <= 700) {
        const yOffset = window.innerHeight * 0.1;
        camera.position.set(0, yOffset + 850, 850);  // Position above the galaxy
        camera.lookAt(0, yOffset, 0);  // Look at the galaxy's new position
        orbit.target.set(0, yOffset, 0);
    } else {
        camera.position.set(375, 750, 750);
        camera.lookAt(800, 0, 0);
        orbit.target.set(800, 0, 0);
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
    renderer.toneMappingExposure = 1.0
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

    // Chromatic aberration pass for subtle color separation
    const chromaticPass = new ShaderPass(
        new THREE.ShaderMaterial( {
            uniforms: {
                tDiffuse: { value: null },
                offset: { value: 0.001 },
                intensity: { value: 0.5 }
            },
            vertexShader: ChromaticAberrationShader.vertex,
            fragmentShader: ChromaticAberrationShader.fragment,
            transparent: true
        } )
    );
    chromaticPass.needsSwap = true;

    // Vintage grain pass for 70s sci-fi art aesthetic
    const vintageGrainPass = new ShaderPass(
        new THREE.ShaderMaterial( {
            uniforms: {
                tDiffuse: { value: null },
                time: { value: 0.0 },
                grainIntensity: { value: 0.15 },
                colorShift: { value: 0.3 }
            },
            vertexShader: VintageGrainShader.vertex,
            fragmentShader: VintageGrainShader.fragment,
            transparent: true
        } )
    );
    vintageGrainPass.needsSwap = true;

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
    baseComposer.addPass(chromaticPass)
    baseComposer.addPass(vintageGrainPass)
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

    galaxy.updateScale(camera, mouse)

    // Update vintage grain time
    if (baseComposer && baseComposer.passes.length > 2) {
        const vintageGrainPass = baseComposer.passes[2];
        if (vintageGrainPass.material && vintageGrainPass.material.uniforms) {
            vintageGrainPass.material.uniforms.time.value = Date.now() * 0.001;
        }
    }

    // Run each pass of the render pipeline
    renderPipeline()

    requestAnimationFrame(render)

}

function onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// Alternative approach: use orbit controls' mouse position
function updateMouseFromOrbit() {
    if (orbit && orbit.mouse) {
        mouse.x = orbit.mouse.x;
        mouse.y = orbit.mouse.y;
        console.log('Mouse from orbit:', mouse.x, mouse.y);
    }
}

function onMouseLeave() {
    // Reset mouse position when cursor leaves canvas
    mouse.x = 0;
    mouse.y = 0;
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

// Add mouse event listeners for hover effects - use window instead of canvas
window.addEventListener('mousemove', onMouseMove, false);
window.addEventListener('mouseleave', onMouseLeave, false);

// Start render loop
requestAnimationFrame(render)