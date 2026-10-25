TEXTURE IMAGES

Copy PNG, JPG, WebP, or self-contained SVG images into this folder.
For pixel art, use PNG. block.svg is the included 40 x 40 example.

In src/game/game.ts, below YOUR GAME CODE, assign a texture to a block type:

  setBlockTexture(0, 'stone.png').catch(console.error)

Replace the existing block.svg assignment, or add another type:

  setBlockTexture(1, 'grass.png').catch(console.error)

Images repeat at their original pixel size across each block. An image is loaded
once and a CanvasPattern is reused. Missing textures keep the existing block color.
Only block rendering uses the textures; collision still uses block rectangles.

READ PIXEL COLORS (after the texture has loaded)

  const texture = textures[0]
  if (texture) {
    const x = 3 // texture pixel column, from 0 to texture.width - 1
    const y = 5 // texture pixel row, from 0 to texture.height - 1
    const i = (y * texture.width + x) * 4
    const red = texture.pixels[i]
    const green = texture.pixels[i + 1]
    const blue = texture.pixels[i + 2]
    const alpha = texture.pixels[i + 3]
  }

Channels are numbers from 0 to 255. Alpha 0 is transparent; 255 is opaque.
The pixels property is a flat Uint8ClampedArray: R,G,B,A,R,G,B,A,... in row order.
It is extracted only the first time you read it, then cached. It is a snapshot:
changing array values does not automatically modify the rendered image/pattern.
Read it for color queries; use normal image/pattern drawing to render the game.
The textures table and setBlockTexture function are accessible inside startGame.

Files are served at /textures/filename.png by Vite. Keep source images small
when possible; a 1024 x 1024 RGBA pixel array occupies about 4 MiB.

