import * as THREE from 'three'
import { BASE_LAYER, BLOOM_LAYER } from '../config/renderConfig.js'

class Sun {
    constructor() {
        // Create container for the binary system
        this.container = new THREE.Object3D();
        
        // Mobile-only orientation: rotate 15° counterclockwise
        if (window.innerWidth <= 700) {
            this.container.rotation.z += THREE.MathUtils.degToRad(15);
        }
        
        // Parameters for the binary system
        this.orbitRadius = 25; // Increased distance between suns
        this.rotationSpeed = 0.001; // Speed of orbit
        
        // Create the first sun (intense white-hot core)
        const geometry1 = new THREE.SphereGeometry(8, 32, 32);
        const material1 = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffaa,
            emissiveIntensity: 8,
            transparent: true,
            opacity: 1
        });
        this.sun1 = new THREE.Mesh(geometry1, material1);
        this.sun1.position.x = this.orbitRadius;
        
        // Create multi-layered glow effects for first sun
        // Inner intense yellow glow
        const coreGlowGeometry1 = new THREE.SphereGeometry(8.5, 32, 32);
        const coreGlowMaterial1 = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        const coreGlow1 = new THREE.Mesh(coreGlowGeometry1, coreGlowMaterial1);
        this.sun1.add(coreGlow1);

        // Middle orange-yellow glow
        const innerGlowGeometry1 = new THREE.SphereGeometry(9.5, 32, 32);
        const innerGlowMaterial1 = new THREE.MeshBasicMaterial({
            color: 0xff7700,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        const innerGlow1 = new THREE.Mesh(innerGlowGeometry1, innerGlowMaterial1);
        this.sun1.add(innerGlow1);

        // Outer dramatic red glow
        const outerGlowGeometry1 = new THREE.SphereGeometry(12, 32, 32);
        const outerGlowMaterial1 = new THREE.MeshBasicMaterial({
            color: 0xff1100,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        const outerGlow1 = new THREE.Mesh(outerGlowGeometry1, outerGlowMaterial1);
        this.sun1.add(outerGlow1);
        
        // Enhanced point lights for the first sun
        const coreLight1 = new THREE.PointLight(0xffffaa, 3, 100);
        const innerLight1 = new THREE.PointLight(0xff8800, 2, 150);
        const outerLight1 = new THREE.PointLight(0xff2200, 1, 200);
        this.sun1.add(coreLight1);
        this.sun1.add(innerLight1);
        this.sun1.add(outerLight1);
        
        // Create the second sun (blue-white giant with dramatic orange corona)
        const geometry2 = new THREE.SphereGeometry(6, 32, 32);
        const material2 = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x40a0ff,
            emissiveIntensity: 7,
            transparent: true,
            opacity: 1
        });
        this.sun2 = new THREE.Mesh(geometry2, material2);
        this.sun2.position.x = -this.orbitRadius;
        
        // Create multi-layered glow effects for second sun
        // Inner intense blue-white glow
        const coreGlowGeometry2 = new THREE.SphereGeometry(6.5, 32, 32);
        const coreGlowMaterial2 = new THREE.MeshBasicMaterial({
            color: 0x80ffff,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        const coreGlow2 = new THREE.Mesh(coreGlowGeometry2, coreGlowMaterial2);
        this.sun2.add(coreGlow2);

        // Middle intense orange corona
        const middleGlowGeometry2 = new THREE.SphereGeometry(8, 32, 32);
        const middleGlowMaterial2 = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });
        const middleGlow2 = new THREE.Mesh(middleGlowGeometry2, middleGlowMaterial2);
        this.sun2.add(middleGlow2);

        // Outer dramatic red corona
        const outerGlowGeometry2 = new THREE.SphereGeometry(10, 32, 32);
        const outerGlowMaterial2 = new THREE.MeshBasicMaterial({
            color: 0xff2200,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        const outerGlow2 = new THREE.Mesh(outerGlowGeometry2, outerGlowMaterial2);
        this.sun2.add(outerGlow2);
        
        // Enhanced point lights for second sun
        const coreLight2 = new THREE.PointLight(0x80ffff, 3, 100);
        const coronaLight2 = new THREE.PointLight(0xff6600, 2, 150);
        const outerLight2 = new THREE.PointLight(0xff2200, 1, 200);
        this.sun2.add(coreLight2);
        this.sun2.add(coronaLight2);
        this.sun2.add(outerLight2);
        
        // Make both suns visible in base and bloom layers
        this.sun1.layers.enable(BASE_LAYER);
        this.sun1.layers.enable(BLOOM_LAYER);
        this.sun2.layers.enable(BASE_LAYER);
        this.sun2.layers.enable(BLOOM_LAYER);
        
        // Add suns to container
        this.container.add(this.sun1);
        this.container.add(this.sun2);
    }

    toThreeObject(parent) {
        parent.add(this.container);
    }

    updateScale(camera) {
        // Update the binary system rotation
        this.container.rotation.z += this.rotationSpeed;
    }
}

export { Sun };
