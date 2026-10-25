# untitled1

A canvas precision platformer built with TypeScript and Vite.

Play: https://Nuggetifier.github.io/untitled1/

## Development

Use Node.js 22.12 or newer.

    npm ci
    npm run dev

## Controls

- WASD or arrow keys: move and jump
- S / down: brake vertical movement
- R: respawn; Shift + R: reset to the starting spawn
- P: toggle the level editor

## Publishing updates

Commit changes and push to `main`. The GitHub Pages workflow builds and publishes
`dist` automatically. Check the repository's Actions tab for deployment status.
The workflow sets Vite's base path to the repository name for hosted assets.

To test the published build locally:

    npm run build -- --base /untitled1/
    npm run preview

Open the preview server's `/untitled1/` path.
