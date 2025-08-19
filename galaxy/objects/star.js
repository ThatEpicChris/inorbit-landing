import * as THREE from 'three'
import { BLOOM_LAYER, STAR_MAX, STAR_MIN } from '../config/renderConfig.js'
import { starTypes } from '../config/starDistributions.js'
import { clamp } from '../utils.js'

const texture = new THREE.TextureLoader().load('galaxy/resources/sprite120.png')

export class Star {

    constructor(position) {
        this.position = position
        this.starType = this.generateStarType()
        this.obj = null
        
        // Add individual size variation to break up identical star types
        this.sizeVariation = 0.7 + Math.random() * 0.6 // 0.7 to 1.3 multiplier
        
        // Initialize twinkle properties with much more variation and independence
        // Each star gets completely different twinkle characteristics
        this.twinkleSpeed = 0.001 + Math.random() * 0.02 // Much wider speed range
        this.twinklePhase = Math.random() * Math.PI * 100 // Much larger initial phase variation
        this.twinkleAmount = 0.1 + Math.random() * 0.5 // Wider intensity range
        
        // Secondary twinkle with completely independent parameters
        this.secondarySpeed = 0.002 + Math.random() * 0.015 // Independent speed range
        this.secondaryPhase = Math.random() * Math.PI * 100 // Independent phase
        this.secondaryAmount = 0.05 + Math.random() * 0.3 // Independent intensity
        
        // Add tertiary twinkle for even more complexity
        this.tertiarySpeed = 0.003 + Math.random() * 0.012
        this.tertiaryPhase = Math.random() * Math.PI * 100
        this.tertiaryAmount = 0.02 + Math.random() * 0.2
        
        // Add individual time offsets to prevent synchronization
        this.timeOffset = Math.random() * 1000
        
        // Add individual opacity characteristics
        this.opacityMultiplier = 0.8 + Math.random() * 0.4 // 0.8 to 1.2 multiplier - more centered
        this.opacitySpeed = 0.5 + Math.random() * 1.5 // Individual opacity animation speed
        
        // Hover effect properties
        this.hoverBrightness = 0.0 // Current hover brightness (0-1)
        this.targetHoverBrightness = 0.0 // Target hover brightness
        this.hoverSpeed = 0.1 // How fast hover effect fades in/out
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
        // Calculate distance-based scaling with individual variation to break synchronization
        let dist = this.position.distanceTo(camera.position) / 250
        
        // Add individual distance variation to break up synchronized scaling
        const distanceVariation = 0.8 + (Math.sin(this.timeOffset * 0.01) * 0.4)
        dist *= distanceVariation

        // Base star size from distance and star type, with individual size variation
        let baseStarSize = dist * starTypes.size[this.starType] * this.sizeVariation
        baseStarSize = clamp(baseStarSize, STAR_MIN, STAR_MAX)
        
        // Update phases with individual time offsets to prevent synchronization
        const time = Date.now() + this.timeOffset
        this.twinklePhase += this.twinkleSpeed
        this.secondaryPhase += this.secondarySpeed
        this.tertiaryPhase += this.tertiarySpeed

        // Combine three different sine waves with different frequencies for complex twinkling
        const primaryTwinkle = Math.sin(this.twinklePhase) * this.twinkleAmount
        const secondaryTwinkle = Math.sin(this.secondaryPhase) * this.secondaryAmount
        const tertiaryTwinkle = Math.sin(this.tertiaryPhase) * this.tertiaryAmount
        
        // Add some noise to break up any remaining patterns
        const noise = (Math.sin(time * 0.001 + this.timeOffset) * 0.1) + 
                     (Math.sin(time * 0.003 + this.timeOffset * 2) * 0.05)
        
        // Apply twinkle factor to size
        const twinkleFactor = 1 + primaryTwinkle + secondaryTwinkle + tertiaryTwinkle + noise
        const finalSize = baseStarSize * twinkleFactor
        this.obj?.scale.copy(new THREE.Vector3(finalSize, finalSize, finalSize))
        
        // Brighter twinkling for better visibility
        if (this.obj && this.obj.material) {
            // Base opacity centered around 85% with subtle variations
            const opacityBase = 0.85 + Math.sin(this.twinklePhase * this.opacitySpeed) * 0.1
            const opacityVariation = Math.sin(this.secondaryPhase * this.opacitySpeed * 0.8) * 0.08
            const opacityTertiary = Math.sin(this.tertiaryPhase * this.opacitySpeed * 1.2) * 0.06
            
            // Add subtle high-frequency variations
            const microTwinkle = Math.sin(this.twinklePhase * 1.8 + this.timeOffset) * 0.04
            const ultraTwinkle = Math.sin(this.secondaryPhase * 2.5 + this.timeOffset * 1.5) * 0.03
            
            // Combine all opacity effects with individual multiplier
            const rawOpacity = opacityBase + opacityVariation + opacityTertiary + microTwinkle + ultraTwinkle
            
            // Add hover brightness effect with much higher opacity range (doubled)
            const hoverEffect = this.hoverBrightness * 10.0 // Max 1000% brightness increase on hover
            const finalOpacity = (rawOpacity + hoverEffect) * this.opacityMultiplier
            this.obj.material.opacity = clamp(finalOpacity, 0.7, 6.0) // Much higher max opacity (70% to 600%)
            
            // Update emissive intensity for dramatic hover effect
            if (this.obj.material) {
                const baseEmissive = 2.0 // Base emissive intensity
                const hoverEmissive = 50.0 // Very high emissive intensity when hovered (doubled)
                this.obj.material.emissiveIntensity = baseEmissive + (this.hoverBrightness * hoverEmissive)
            }
            
            // Debug: log hover state
            if (this.hoverBrightness > 0.1) {
                console.log('Star hovered! Brightness:', this.hoverBrightness, 'Opacity:', this.obj.material.opacity);
            }
            
            // Update material for bloom effect
            this.obj.material.needsUpdate = true
        }
    }

    updateHover(mouse, camera) {
        if (!this.obj) return
        
        // Use the actual sprite's world position (includes container transformations)
        const spriteWorldPos = this.obj.getWorldPosition(new THREE.Vector3());
        const starScreenPos = spriteWorldPos.project(camera);
        
        // Calculate distance from mouse to star on screen
        const distance = Math.sqrt(
            Math.pow(mouse.x - starScreenPos.x, 2) + 
            Math.pow(mouse.y - starScreenPos.y, 2)
        )
        
        // Set target hover brightness based on proximity
        const hoverRadius = 0.2 // Larger radius for easier hovering
        if (distance < hoverRadius) {
            this.targetHoverBrightness = 1.0 - (distance / hoverRadius)
            // Debug: log when star is being hovered
            console.log('Star hovered! Distance:', distance, 'Brightness:', this.targetHoverBrightness, 'Mouse:', mouse.x, mouse.y, 'Star:', starScreenPos.x, starScreenPos.y);
        } else {
            this.targetHoverBrightness = 0.0
        }
        
        // Smoothly interpolate current hover brightness to target
        this.hoverBrightness += (this.targetHoverBrightness - this.hoverBrightness) * 0.15 // Faster response
    }

    toThreeObject(scene) {
        // Create individual material for this star with emissive properties
        const material = new THREE.SpriteMaterial({
            map: texture, 
            color: starTypes.color[this.starType],
            transparent: true,
            emissive: starTypes.color[this.starType], // Add emissive color
            emissiveIntensity: 2.0 // High emissive intensity for brightness
        })
        
        let sprite = new THREE.Sprite(material)
        sprite.layers.set(BLOOM_LAYER)
        
        sprite.scale.multiplyScalar(starTypes.size[this.starType])
        sprite.position.copy(this.position)

        this.obj = sprite

        scene.add(sprite)
    }
}