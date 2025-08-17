import * as THREE from 'three'
import { Star } from './star.js';
import { ARMS, ARM_X_DIST, ARM_X_MEAN, ARM_Y_DIST, ARM_Y_MEAN, CORE_X_DIST, CORE_Y_DIST, GALAXY_THICKNESS, HAZE_RATIO, NUM_STARS, OUTER_CORE_X_DIST, OUTER_CORE_Y_DIST } from '../config/galaxyConfig.js';
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
        
        // Apply rotations in order: Z, X, Y (in radians)
        this.container.rotation.z = Math.PI / 2;  // -45 degrees clockwise around Z
        this.container.rotation.x = (Math.PI / 8) * 1;   // 45 degrees clockwise around X
        this.container.rotation.y = (Math.PI / 7) * 1;  // -30 degrees (counterclockwise) around Y
        
        scene.add(this.container);

        // Add window resize listener for responsive positioning
        window.addEventListener('resize', () => this.updatePosition());

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

    updateScale(camera) {
        this.stars.forEach((star) => {
            star.updateScale(camera)
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

        return objects
    }

    updatePosition() {
        if (window.innerWidth <= 700) {
            // Mobile positioning: centered horizontally, at top third vertically
            const topThirdOffset = -(window.innerHeight / 3);  // Negative to move up
            this.container.position.set(0, topThirdOffset, 0);
        } else {
            // Desktop positioning: right side
            this.container.position.set(-250, 0, 0);
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