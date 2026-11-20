# خط آتش · Fireline

A Persian, RTL, single-player canvas arcade game. Aim at the front windshield of fictional luxury cars and launch fireballs. Hit vehicles skid off the highway; armored vehicles require two hits. Five escaped cars end the run.

## Run

```sh
npm install
npm run dev
```

Vite listens on `0.0.0.0:5173`. No backend or external services are needed. The Persian Vazirmatn font is bundled locally through npm.

## Controls

- Click/tap a windshield to shoot.
- Arrow keys move the reticle; Space fires.
- P pauses/resumes. The interface also has pause, replay, help and sound buttons.
- Audio is off initially; the music-note button enables synthesized effects.
- Best score persists in browser local storage when available.

## Check

```sh
npm test
npm run build
```

The tests run the game logic with a mocked canvas/DOM (not full browser visual tests) and cover shooting, cooldown, scoring, swerving, pause/help, escaped vehicles, game over, and replay. Production output is generated into the ignored `dist` directory.
