import { Howl, Howler } from 'howler'
import engineSound from '../../sounds/engines/1/low_off.wav'
import brick1Sound from '../../sounds/bricks/brick-1.wav'
import brick2Sound from '../../sounds/bricks/brick-2.wav'
// import brick3Sound from '../../sounds/bricks/brick-3.wav'
import brick4Sound from '../../sounds/bricks/brick-4.wav'
// import brick5Sound from '../../sounds/bricks/brick-5.wav'
import brick6Sound from '../../sounds/bricks/brick-6.wav'
import brick7Sound from '../../sounds/bricks/brick-7.wav'
import brick8Sound from '../../sounds/bricks/brick-8.wav'
import bowlingPin1Sound from '../../sounds/bowling/pin-1.wav'

export default class Sounds
{
    constructor(_options)
    {
        // Options
        this.time = _options.time
        this.debug = _options.debug

        // Debug
        if(this.debug)
        {
            this.debugFolder = this.debug.addFolder('sounds')
            this.debugFolder.open()
        }

        // Set up
        this.items = []

        this.setSettings()
        this.setMasterVolume()
        this.setMute()
        this.setEngine()
    }

    setSettings()
    {
        this.settings = [
            {
                name: 'brick',
                sounds: [brick1Sound, brick2Sound, brick4Sound, brick6Sound, brick7Sound, brick8Sound],
                minDelta: 100,
                velocityMin: 1,
                velocityMultiplier: 1,
                volumeMin: 0.2,
                volumeMax: 1,
                rateMin: 0.5,
                rateMax: 0.75
            },
            {
                name: 'bowlingPin',
                sounds: [bowlingPin1Sound, bowlingPin1Sound, bowlingPin1Sound],
                minDelta: 0,
                velocityMin: 1,
                velocityMultiplier: 1,
                volumeMin: 0.35,
                volumeMax: 1,
                rateMin: 0.1,
                rateMax: 0.75
            }
        ]

        for(const _settings of this.settings)
        {
            this.add(_settings)
        }
    }

    setMasterVolume()
    {
        // Set up
        this.masterVolume = 0.4
        Howler.volume(this.masterVolume)

        window.requestAnimationFrame(() =>
        {
            Howler.volume(this.masterVolume)
        })

        // Debug
        if(this.debug)
        {
            this.debugFolder.add(this, 'masterVolume').step(0.001).min(0).max(1).onChange(() =>
            {
                Howler.volume(this.masterVolume)
            })
        }
    }

    setMute()
    {
        // Set up
        this.muted = typeof this.debug !== 'undefined'
        Howler.mute(this.muted)

        // M Key
        window.addEventListener('keydown', (_event) =>
        {
            if(_event.key === 'm')
            {
                this.muted = !this.muted
                Howler.mute(this.muted)
            }
        })

        // Tab focus / blur
        document.addEventListener('visibilitychange', () =>
        {
            if(document.hidden)
            {
                Howler.mute(true)
            }
            else
            {
                Howler.mute(this.muted)
            }
        })

        // Debug
        if(this.debug)
        {
            this.debugFolder.add(this, 'muted').listen().onChange(() =>
            {
                Howler.mute(this.muted)
            })
        }
    }

    setEngine()
    {
        // Set up
        this.engine = {}

        this.engine.progress = 0
        this.engine.progressEasing = 0.15

        this.engine.speed = 0
        this.engine.speedMultiplier = 2.5
        this.engine.acceleration = 0
        this.engine.accelerationMultiplier = 20

        this.engine.rate = {}
        this.engine.rate.min = 0.4
        this.engine.rate.max = 1.4

        this.engine.volume = {}
        this.engine.volume.min = 0.4
        this.engine.volume.max = 1

        this.engine.sound = new Howl({
            src: [engineSound],
            loop: true
        })

        this.engine.sound.play()

        // Time tick
        this.time.on('tick', () =>
        {
            let progress = Math.abs(this.engine.speed) * this.engine.speedMultiplier + Math.max(0, this.engine.acceleration) * this.engine.accelerationMultiplier
            progress = Math.min(Math.max(progress, 0), 1)

            if(progress > this.engine.progress)
            {
                this.engine.progress = progress
            }
            else
            {
                this.engine.progress += (progress - this.engine.progress) * this.engine.progressEasing
            }

            // Rate
            const rateAmplitude = this.engine.rate.max - this.engine.rate.min
            this.engine.sound.rate(this.engine.rate.min + rateAmplitude * this.engine.progress)

            // Volume
            const volumeAmplitude = this.engine.volume.max - this.engine.volume.min
            this.engine.sound.volume(this.engine.volume.min + volumeAmplitude * this.engine.progress)
        })

        // Debug
        if(this.debug)
        {
            const folder = this.debugFolder.addFolder('engine')
            folder.open()

            folder.add(this.engine, 'progressEasing').step(0.001).min(0).max(1).name('progressEasing')
            folder.add(this.engine.rate, 'min').step(0.001).min(0).max(4).name('rateMin')
            folder.add(this.engine.rate, 'max').step(0.001).min(0).max(4).name('rateMax')
            folder.add(this.engine, 'speedMultiplier').step(0.01).min(0).max(5).name('speedMultiplier')
            folder.add(this.engine, 'accelerationMultiplier').step(0.01).min(0).max(100).name('accelerationMultiplier')
            folder.add(this.engine, 'progress').step(0.01).min(0).max(1).name('progress').listen()
        }
    }

    add(_options)
    {
        const item = {
            name: _options.name,
            minDelta: _options.minDelta,
            velocityMin: _options.velocityMin,
            velocityMultiplier: _options.velocityMultiplier,
            volumeMin: _options.volumeMin,
            volumeMax: _options.volumeMax,
            rateMin: _options.rateMin,
            rateMax: _options.rateMax,
            lastTime: 0,
            sounds: []
        }

        for(const _sound of _options.sounds)
        {
            const sound = new Howl({ src: [_sound] })

            item.sounds.push(sound)
        }

        this.items.push(item)
    }

    play(_name, _velocity)
    {
        const item = this.items.find((_item) => _item.name === _name)
        const time = Date.now()

        if(item && time > item.lastTime + item.minDelta && _velocity > item.velocityMin)
        {
            // Find random sound
            const sound = item.sounds[Math.floor(Math.random() * item.sounds.length)]

            // Update volume
            let volume = Math.min(Math.max((_velocity - item.velocityMin) * item.velocityMultiplier, item.volumeMin), item.volumeMax)
            volume = Math.pow(volume, 2)
            sound.volume(volume)

            // Update rate
            const rateAmplitude = item.rateMax - item.rateMin
            sound.rate(item.rateMin + Math.random() * rateAmplitude)

            // Play
            sound.play()

            // Save last play time
            item.lastTime = time
        }
    }
}
