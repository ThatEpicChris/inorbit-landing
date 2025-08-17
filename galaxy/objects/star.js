import * as THREE from 'three'
import { BLOOM_LAYER, STAR_MAX, STAR_MIN } from '../config/renderConfig.js'
import { starTypes } from '../config/starDistributions.js'
import { clamp } from '../utils.js'

const texture = new THREE.TextureLoader().load('galaxy/resources/sprite120.png')
const materials = starTypes.color.map((color) => new THREE.SpriteMaterial({map: texture, color: color}))

export class Star {

    constructor(position) {
        this.position = position
        this.starType = this.generateStarType()
        this.obj = null
        
        // Initialize twinkle properties with more variation
        // Wider range of speeds for more varied twinkling
        this.twinkleSpeed = 0.003 + Math.random() * 0.015 // Even faster with more variation
        this.twinklePhase = Math.random() * Math.PI * 20 // Initial random phase
        this.twinkleAmount = 0.2 + Math.random() * 0.4 // Much higher intensity variation
        
        // Enhanced secondary twinkle with more dramatic changes
        this.secondarySpeed = 0.004 + Math.random() * 0.008 // Faster secondary animation
        this.secondaryPhase = Math.random() * Math.PI * 20
        this.secondaryAmount = 0.15 + Math.random() * 0.25 // More intense secondary effect
    }

    generateStarType() {
        let num = Math.random() * 100.0
        let pct = starTypes.percentage
        for (let i = 0; i < pct.length; i++) {
            num -= pct[i]
            if (num < 0) {
                return i
            }
        }
        return 0
    }

    updateScale(camera) {
        let dist = this.position.distanceTo(camera.position) / 250

        // update star size with twinkle effect
        let starSize = dist * starTypes.size[this.starType]
        starSize = clamp(starSize, STAR_MIN, STAR_MAX)
        
        // Update phases
        this.twinklePhase += this.twinkleSpeed
        this.secondaryPhase += this.secondarySpeed

        // Combine two different sine waves for more complex twinkling
        const primaryTwinkle = Math.sin(this.twinklePhase) * this.twinkleAmount
        const secondaryTwinkle = Math.sin(this.secondaryPhase) * this.secondaryAmount
        const twinkleFactor = 1 + primaryTwinkle + secondaryTwinkle
        
        // Apply base size with complex twinkle
        const finalSize = starSize * twinkleFactor
        this.obj?.scale.copy(new THREE.Vector3(finalSize, finalSize, finalSize))
        
        // Dramatic opacity variation with near-complete fade-outs
        if (this.obj && this.obj.material) {
            // Reduce base opacity and increase variation range
            const opacityBase = 0.3 + Math.sin(this.twinklePhase * 0.8) * 0.55 // Much larger primary variation
            const opacityVariation = Math.sin(this.secondaryPhase * 1.3) * 0.35 // Stronger secondary effect
            // Add two high-frequency variations for more complex twinkling
            const microTwinkle = Math.sin(this.twinklePhase * 3.0) * 0.15
            const ultraTwinkle = Math.sin(this.secondaryPhase * 4.2) * 0.1
            // Allow opacity to go very low for dramatic fade-outs
            this.obj.material.opacity = clamp(opacityBase + opacityVariation + microTwinkle + ultraTwinkle, 0.05, 1.0)
            // Update material for bloom effect
            this.obj.material.needsUpdate = true
        }
    }

    toThreeObject(scene) {
        let sprite = new THREE.Sprite(materials[this.starType])
        sprite.layers.set(BLOOM_LAYER)
        
        sprite.scale.multiplyScalar(starTypes.size[this.starType])
        sprite.position.copy(this.position)

        this.obj = sprite

        scene.add(sprite)
    }
}