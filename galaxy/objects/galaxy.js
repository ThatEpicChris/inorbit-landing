import * as THREE from 'three'
import { Star } from './star.js';
import { ARMS, ARM_X_DIST, ARM_X_MEAN, ARM_Y_DIST, ARM_Y_MEAN, CORE_X_DIST, CORE_Y_DIST, GALAXY_THICKNESS, HAZE_RATIO, NUM_STARS, OUTER_CORE_X_DIST, OUTER_CORE_Y_DIST, OUTER_STAR_RATIO, OUTER_STAR_RADIUS_MIN, OUTER_STAR_RADIUS_MAX } from '../config/galaxyConfig.js';
import { gaussianRandom, spiral } from '../utils.js';
import { Haze } from './haze.js';
import { Sun } from './sun.js';

export class Galaxy {

    constructor(scene) {
        this.scene = scene
        
        // Add a container for the entire galaxy
        this.container = new THREE.Object3D();
        
        // Position based on viewport size
        this.updatePosition();
        
        // Apply rotations based on viewport size
        if (window.innerWidth <= 700) {
            // Mobile rotations
            this.container.rotation.z = Math.PI / 1;  // 90 degrees clockwise around Z
            this.container.rotation.x = (Math.PI / 25) * 1 + THREE.MathUtils.degToRad(7);   // Base + 7 degrees tilt
            this.container.rotation.y = (Math.PI / 7) * 1;  // ~25.7 degrees counterclockwise around Y
        } else {
            // Desktop rotations
            this.container.rotation.z = Math.PI / 3;  // 90 degrees clockwise around Z
            this.container.rotation.x = (Math.PI / 20) * -2 + THREE.MathUtils.degToRad(7);   // Base + 7 degrees tilt
            this.container.rotation.y = (Math.PI / 7) * 1;  // ~25.7 degrees counterclockwise around Y
        }
        
        scene.add(this.container);

        // Add window resize listener for responsive positioning and rotations
        window.addEventListener('resize', () => {
            this.updatePosition();
            this.updateRotations();
        });

        // Create and add the sun at the center
        this.sun = new Sun();
        this.sun.toThreeObject(this.container);

        this.stars = this.generateObject(NUM_STARS, (pos) => new Star(pos))
        this.haze = this.generateHaze(NUM_STARS * HAZE_RATIO)

        // Add objects to container instead of scene
        this.stars.forEach((star) => star.toThreeObject(this.container))
        this.haze.forEach((haze) => haze.toThreeObject(this.container))
    }

    /* constructor(scene) {

        this.scene = scene

        this.stars = this.generateObject(NUM_STARS, (pos) => new Star(pos))
        this.haze = this.generateObject(NUM_STARS * HAZE_RATIO, (pos) => new Haze(pos))

        this.stars.forEach((star) => star.toThreeObject(scene))
        this.haze.forEach((haze) => haze.toThreeObject(scene))
    } */

    updateScale(camera, mouse) {
        this.stars.forEach((star) => {
            star.updateScale(camera)
            star.updateHover(mouse, camera)
        })
    
        this.haze.forEach((haze) => {
            haze.updateScale(camera)
        })

        // Update sun scaling and animation
        if (this.sun) {
            this.sun.updateScale(camera)
        }
    }

    generateObject(numStars, generator) {
        let objects = []

        for ( let i = 0; i < numStars / 4; i++){
            let pos = new THREE.Vector3(gaussianRandom(0, CORE_X_DIST), gaussianRandom(0, CORE_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS))
            let obj = generator(pos)
            objects.push(obj)
        }

        for ( let i = 0; i < numStars / 4; i++){
            let pos = new THREE.Vector3(gaussianRandom(0, OUTER_CORE_X_DIST), gaussianRandom(0, OUTER_CORE_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS))
            let obj = generator(pos)
            objects.push(obj)
        }

        for (let j = 0; j < ARMS; j++) {
            for ( let i = 0; i < numStars / 4; i++){
                let pos = spiral(gaussianRandom(ARM_X_MEAN, ARM_X_DIST), gaussianRandom(ARM_Y_MEAN, ARM_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS), j * 2 * Math.PI / ARMS)
                let obj = generator(pos)
                objects.push(obj)
            }
        }

        // Add a small fraction of stars far beyond the spiral arms to fill page edges
        const outerCount = Math.floor(numStars * OUTER_STAR_RATIO)
        for (let i = 0; i < outerCount; i++) {
            const angle = Math.random() * Math.PI * 2
            const radius = OUTER_STAR_RADIUS_MIN + Math.random() * (OUTER_STAR_RADIUS_MAX - OUTER_STAR_RADIUS_MIN)
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            const z = gaussianRandom(0, GALAXY_THICKNESS * 0.5)
            let pos = new THREE.Vector3(x, y, z)
            let obj = generator(pos)
            objects.push(obj)
        }

        return objects
    }

    updatePosition() {
        if (window.innerWidth <= 700) {
            // Mobile: center horizontally, position 40% from top
            const yOffset = window.innerHeight * 0.1; // Move down from center
            this.container.position.set(0, yOffset, 0);
        } else {
            // Desktop positioning: right side
            this.container.position.set(650, -100, 0);
        }
    }

    updateRotations() {
        if (window.innerWidth <= 700) {
            // Mobile rotations
            this.container.rotation.z = Math.PI / 2;  // 90 degrees clockwise around Z
            this.container.rotation.x = (Math.PI / 25) * 1 + THREE.MathUtils.degToRad(7);   // Base + 7 degrees tilt
            this.container.rotation.y = (Math.PI / 7) * 1;  // ~25.7 degrees counterclockwise around Y
        } else {
            // Desktop rotations
            this.container.rotation.z = Math.PI / 2;  // 90 degrees clockwise around Z
            this.container.rotation.x = (Math.PI / 25) * 1 + THREE.MathUtils.degToRad(7);   // Base + 7 degrees tilt
            this.container.rotation.y = (Math.PI / 7) * 1;  // ~25.7 degrees counterclockwise around Y
        }
    }

    generateHaze(numHaze) {
        let hazeObjects = []
        
        // Reduce core haze to 10% of total
        for ( let i = 0; i < numHaze * 0.1; i++){
            let pos = new THREE.Vector3(
                gaussianRandom(0, OUTER_CORE_X_DIST * 0.7), 
                gaussianRandom(0, OUTER_CORE_Y_DIST * 0.7), 
                gaussianRandom(0, GALAXY_THICKNESS * 0.5)
            )
            hazeObjects.push(new Haze(pos))
        }

        // Distribute 90% of haze along arms with tighter clustering
        const hazePerArm = (numHaze * 0.9) / ARMS
        for (let j = 0; j < ARMS; j++) {
            for ( let i = 0; i < hazePerArm; i++){
                // Use tighter distribution along arms for haze
                let radius = gaussianRandom(ARM_X_MEAN * 0.8, ARM_X_DIST * 0.6)
                let angle = (j * 2 * Math.PI / ARMS) + gaussianRandom(0, 0.2) // Add slight random angle variation
                let pos = spiral(
                    radius,
                    gaussianRandom(ARM_Y_MEAN * 0.7, ARM_Y_DIST * 0.5),
                    gaussianRandom(0, GALAXY_THICKNESS * 0.7),
                    angle
                )
                hazeObjects.push(new Haze(pos))
            }
        }

        return hazeObjects
    }
}
