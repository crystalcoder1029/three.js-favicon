import * as THREE from 'three'
import * as dat from 'dat.gui'
import platform from 'platform'

import Sizes from './Utils/Sizes.js'
import Time from './Utils/Time.js'
import World from './World/index.js'
import Resources from './Resources.js'

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import BlurPass from './Passes/Blur.js'
import GlowsPass from './Passes/Glows.js'
import Camera from './Camera.js'

export default class Application
{
    /**
     * Constructor
     */
    constructor(_options)
    {
        // Options
        this.$canvas = _options.$canvas

        // Set up
        this.time = new Time()
        this.sizes = new Sizes()
        this.resources = new Resources()

        if(window.location.hash === '#debug')
        {
            this.debug = new dat.GUI({ width: 420 })
        }

        this.resources.on('progress', (_progress) =>
        {
            // console.log(_progress)
        })

        this.setConfig()
        this.setRenderer()
        this.setCamera()
        this.setPasses()
        this.setWorld()

        this.resources.on('ready', () =>
        {
            this.world.start()
            this.setTitle()
        })
    }

    /**
     * Set config
     */
    setConfig()
    {
        this.config = {}
        this.config.mobile = ['Android', 'iOS', 'Windows Phone'].indexOf(platform.os.family) !== - 1
    }

    /**
     * Set renderer
     */
    setRenderer()
    {
        // Scene
        this.scene = new THREE.Scene()

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.$canvas,
            alpha: true
        })
        // this.renderer.setClearColor(0x414141, 1)
        this.renderer.setClearColor(0x000000, 1)
        // this.renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio, 1.5), 2))
        this.renderer.setPixelRatio(2)
        this.renderer.setSize(this.sizes.viewport.width, this.sizes.viewport.height)
        this.renderer.physicallyCorrectLights = true
        this.renderer.gammaFactor = 2.2
        this.renderer.gammaOutPut = true
        this.renderer.autoClear = false

        // Resize event
        this.sizes.on('resize', () =>
        {
            this.renderer.setSize(this.sizes.viewport.width, this.sizes.viewport.height)
        })
    }

    /**
     * Set camera
     */
    setCamera()
    {
        this.camera = new Camera({
            time: this.time,
            sizes: this.sizes,
            renderer: this.renderer,
            debug: this.debug
        })

        this.scene.add(this.camera.instance)

        this.time.on('tick', () =>
        {
            if(this.world && this.world.car)
            {
                this.camera.target.x = this.world.car.chassis.object.position.x
                this.camera.target.y = this.world.car.chassis.object.position.y
            }
        })
    }

    setPasses()
    {
        this.passes = {}

        // Debug
        if(this.debug)
        {
            this.passes.debugFolder = this.debug.addFolder('postprocess')
            // this.passes.debugFolder.open()
        }

        this.passes.composer = new EffectComposer(this.renderer)

        // Create passes
        this.passes.renderPass = new RenderPass(this.scene, this.camera.instance)

        this.passes.horizontalBlurPass = new ShaderPass(BlurPass)
        this.passes.horizontalBlurPass.strength = this.config.mobile ? 0 : 1
        this.passes.horizontalBlurPass.material.uniforms.uResolution.value = new THREE.Vector2(this.sizes.viewport.width, this.sizes.viewport.height)
        this.passes.horizontalBlurPass.material.uniforms.uStrength.value = new THREE.Vector2(this.passes.horizontalBlurPass.strength, 0)

        this.passes.verticalBlurPass = new ShaderPass(BlurPass)
        this.passes.verticalBlurPass.strength = this.config.mobile ? 0 : 1
        this.passes.verticalBlurPass.material.uniforms.uResolution.value = new THREE.Vector2(this.sizes.viewport.width, this.sizes.viewport.height)
        this.passes.verticalBlurPass.material.uniforms.uStrength.value = new THREE.Vector2(0, this.passes.verticalBlurPass.strength)

        // Debug
        if(this.debug)
        {
            const folder = this.passes.debugFolder.addFolder('blur')
            folder.open()

            folder.add(this.passes.horizontalBlurPass.material.uniforms.uStrength.value, 'x').step(0.001).min(0).max(10)
            folder.add(this.passes.verticalBlurPass.material.uniforms.uStrength.value, 'y').step(0.001).min(0).max(10)
        }

        this.passes.glowsPass = new ShaderPass(GlowsPass)
        this.passes.glowsPass.color = '#ffcfe0'
        this.passes.glowsPass.material.uniforms.uPosition.value = new THREE.Vector2(0, 0.25)
        this.passes.glowsPass.material.uniforms.uRadius.value = 0.7
        this.passes.glowsPass.material.uniforms.uColor.value = new THREE.Color(this.passes.glowsPass.color)
        this.passes.glowsPass.material.uniforms.uAlpha.value = 0.55

        // Debug
        if(this.debug)
        {
            const folder = this.passes.debugFolder.addFolder('glows')
            folder.open()

            folder.add(this.passes.glowsPass.material.uniforms.uPosition.value, 'x').step(0.001).min(- 1).max(2).name('positionX')
            folder.add(this.passes.glowsPass.material.uniforms.uPosition.value, 'y').step(0.001).min(- 1).max(2).name('positionY')
            folder.add(this.passes.glowsPass.material.uniforms.uRadius, 'value').step(0.001).min(0).max(2).name('radius')
            folder.addColor(this.passes.glowsPass, 'color').name('color').onChange(() =>
            {
                this.passes.glowsPass.material.uniforms.uColor.value = new THREE.Color(this.passes.glowsPass.color)
            })
            folder.add(this.passes.glowsPass.material.uniforms.uAlpha, 'value').step(0.001).min(0).max(1).name('alpha')
        }

        // Add passes
        this.passes.composer.addPass(this.passes.renderPass)
        this.passes.composer.addPass(this.passes.horizontalBlurPass)
        this.passes.composer.addPass(this.passes.verticalBlurPass)
        this.passes.composer.addPass(this.passes.glowsPass)

        // Time tick
        this.time.on('tick', () =>
        {
            this.passes.horizontalBlurPass.enabled = this.passes.horizontalBlurPass.material.uniforms.uStrength.value.x > 0
            this.passes.verticalBlurPass.enabled = this.passes.verticalBlurPass.material.uniforms.uStrength.value.y > 0

            // Renderer
            this.passes.composer.render()
            // this.renderer.domElement.style.background = 'black'
            // this.renderer.render(this.scene, this.camera.instance)
        })

        // Resize event
        this.sizes.on('resize', () =>
        {
            this.renderer.setSize(this.sizes.viewport.width, this.sizes.viewport.height)
            this.passes.composer.setSize(this.sizes.viewport.width, this.sizes.viewport.height)
            this.passes.horizontalBlurPass.material.uniforms.uResolution.value.x = this.sizes.viewport.width
            this.passes.horizontalBlurPass.material.uniforms.uResolution.value.y = this.sizes.viewport.height
            this.passes.verticalBlurPass.material.uniforms.uResolution.value.x = this.sizes.viewport.width
            this.passes.verticalBlurPass.material.uniforms.uResolution.value.y = this.sizes.viewport.height
        })
    }

    /**
     * Set world
     */
    setWorld()
    {
        this.world = new World({
            config: this.config,
            debug: this.debug,
            resources: this.resources,
            time: this.time,
            sizes: this.sizes,
            camera: this.camera,
            renderer: this.renderer,
            passes: this.passes
        })
        this.scene.add(this.world.container)
    }

    /**
     * Set title
     */
    setTitle()
    {
        if(this.config.mobile)
        {
            return
        }

        this.title = {}
        this.title.frequency = 300
        this.title.width = 20
        this.title.position = 0
        this.title.$element = document.querySelector('title')
        this.title.absolutePosition = Math.round(this.title.width * 0.25)

        this.time.on('tick', () =>
        {
            this.title.absolutePosition += this.world.physics.car.forwardSpeed

            if(this.title.absolutePosition < 0)
            {
                this.title.absolutePosition = 0
            }
        })

        window.setInterval(() =>
        {
            this.title.position = Math.round(this.title.absolutePosition % this.title.width)

            document.title = `${'_'.repeat(this.title.width - this.title.position)}🚗${'_'.repeat(this.title.position)}`
        }, this.title.frequency)
    }

    /**
     * Destructor
     */
    destructor()
    {
        this.time.off('tick')
        this.sizes.off('resize')

        this.camera.orbitControls.dispose()
        this.renderer.dispose()
        this.debug.destroy()
    }
}
