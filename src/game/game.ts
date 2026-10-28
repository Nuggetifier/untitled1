import { loadTexture, type Texture } from './textures'

export function startGame(): void {
  // ===== SETUP: canvas and input =====
  const canvas = document.getElementById('game')

  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Could not find canvas')
  }

  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Could not get canvas context')
  }
  // Texture setup: images and repeat patterns are shared by block type.
  const textures: Partial<Record<number, Texture>> = {}
  const blockPatterns: Partial<Record<number, CanvasPattern>> = {}

  const setBlockTexture = async (type: number, filename: string): Promise<void> => {
    const texture = await loadTexture(`${import.meta.env.BASE_URL}textures/${filename}`)
    const pattern = ctx.createPattern(texture.image, 'repeat')
    if (!pattern) throw new Error(`Could not create texture pattern: ${filename}`)
    textures[type] = texture
    blockPatterns[type] = pattern
  }

  // Load the active checkpoint once; its position is read from player.respawn below.
  let checkpointTexture: Texture | undefined
  loadTexture(`${import.meta.env.BASE_URL}textures/checkpoint-active-v2.png`)
    .then(texture => { checkpointTexture = texture })
    .catch(console.error)

  // Track which arrow keys are currently held down.
  const keys = new Set<string>()

  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key.startsWith('Arrow')) {
      event.preventDefault()
    }
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.ctrlKey && ['s', 'p', 'f', 't', 'w'].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
    });
    keys.add(event.key.toLowerCase())
  })

  window.addEventListener('keyup', (event: KeyboardEvent) => {
    keys.delete(event.key.toLowerCase())
  })

  window.addEventListener('blur', () => keys.clear())




  // Mouse coordinates use the canvas's 800 x 800 drawing space.
  const mouse = {
    x: 0,
    y: 0,
    leftDown: false,
    middleDown: false,
    rightDown: false,
  }

  const updateMousePosition = (event: MouseEvent): void => {
    const bounds = canvas.getBoundingClientRect()
    // Exclude the CSS border when mapping to drawing coordinates.
    const scaleX = bounds.width / canvas.offsetWidth
    const scaleY = bounds.height / canvas.offsetHeight
    mouse.x = (event.clientX - bounds.left - canvas.clientLeft * scaleX)
      * canvas.width / (canvas.clientWidth * scaleX)
    mouse.y = (event.clientY - bounds.top - canvas.clientTop * scaleY)
      * canvas.height / (canvas.clientHeight * scaleY)
  }

  canvas.addEventListener('mousemove', updateMousePosition)

  canvas.addEventListener('mousedown', (event: MouseEvent) => {
    updateMousePosition(event)
    if (event.button === 0) mouse.leftDown = true
    if (event.button === 1) mouse.middleDown = true
    if (event.button === 2) mouse.rightDown = true
    event.preventDefault()
  })

  // Catch releases outside the canvas, too.
  window.addEventListener('mouseup', (event: MouseEvent) => {
    if (event.button === 0) mouse.leftDown = false
    if (event.button === 1) mouse.middleDown = false
    if (event.button === 2) mouse.rightDown = false
  })

  window.addEventListener('blur', () => {
    mouse.leftDown = false
    mouse.middleDown = false
    mouse.rightDown = false
  })



  canvas.addEventListener('contextmenu', (event) => event.preventDefault())



  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'c' && !event.repeat) {
      void copyLevel()
    }
  })


  async function copyLevel(): Promise<void> {
    try {
      const data = `{
  "blocks": [
    ${blocks.map(block => JSON.stringify(block)).join(',\n    ')}
  ],
  "texts": [
    ${texts.map(text => JSON.stringify(text)).join(',\n    ')}
  ]
}`;
      await navigator.clipboard.writeText(data);
      console.log('Level copied!')
    } catch (error) {
      console.error('Could not copy level:', error)
    }
  }

  // Call getMouse() in your game code to read position and held buttons.
 // const getMouse = () => ({ ...mouse })







  // Put images in public/textures, then assign a filename to a block type.
  // Read loaded colors with textures[0].pixels (see public/textures/README.txt).
  setBlockTexture(0, 'block.svg').catch(console.error)

  let mouseWasDown = false;
  let aWasDown = 0;
  let dWasDown = 0;
  let pWasDown = false;
  let sWasDown = false;
  let rWasDown = 0;
  let escWasDown = false;
  let last_grav = 0.2;

  let ground = 0;
  let player = {x:400, y:200, height:30, width:15, respawnX:400, respawnY:200};
  let velX = 0;
  let velY = 0;
  let grav = 0.2;
  let speed = 3;
  let jump = 7;

  //let block = {x1: 0, y1: 0, x2: 0, y2: 0, draw: false, type: 0, index: 0}
  let camera = {x: 0, y: 0};
  let sprint = -20;
  let editorMode = 0;
  let gameplayMode = 0;
  let wasSideCollision = 0;
  let wasTopCollision = false;
  let isSideCollision = false;
  let sprint_timer = 100;
  let canDown = true
  let stun = 0;

  let editorDashX = 0;
  let editorDashY = 0;
  let editorAccel = 0.3;
  let cameraOffset = 300;
  let editExtras = false;
  let blockExtras: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];

  let deaths = 0;
  let respawn = 0;
  let respawnTimer = 60;

  let paused = false;
  type button = {x: number, y: number, width: number, height: number, color: string, action: () => void}
  type menu = {
    buttons: button[],
    texts: text[]
  }
  let menues: menu[] = [
    {
      buttons: [
        {x: 0, y: 0, width: 100, height: 50, color: "red", action: () => {paused = !paused}},
        {x: 100, y: 0, width: 100, height: 50, color: "green", action: () => {paused = !paused}},
      ],
      texts: []
    }
  ]


  let newBlock: block = {x1: 200, y1: 400, x2: 600, y2: 500, draw: false, type: 0, index: 1, extra: []}
  type xy = {x:number, y:number}
  type block = {x1:number, y1:number, x2:number, y2:number, draw:boolean, type: number, index: number, extra: xy[]};
  let blocks: block[] = [];
  blocks.push(newBlock);
  ctx.textAlign = "center";
  type text = {text: string, x: number, y: number, size: number, color: string, draw:boolean}
  let newText: text = {text: "", x: 0, y: 0, size: 20, color: "white", draw:false}
  let texts: text[] = [];

  type level = ({
    blocks: block[]
    texts: text[]
  })

  let levels: level[] = [
    {
      "blocks": [
        {"x1":200,"y1":400,"x2":600,"y2":500,"draw":false,"type":0,"index":1,"extra":[]},
        {"x1":744.1052631578948,"y1":318.189974937342,"x2":1006.7619047619048,"y2":422.4506265664147,"draw":false,"type":0,"index":1,"extra":[]},
        {"x1":1105.032581453634,"y1":234.23007518796862,"x2":1378.71679197995,"y2":328.4656641603997,"draw":false,"type":0,"index":2,"extra":[]},
        {"x1":1379.96992481203,"y1":267.3127819548859,"x2":1677.7142857142858,"y2":320.4456140350864,"draw":false,"type":3,"index":3,"extra":[]},
        {"x1":1501.5238095238096,"y1":163.0521303258132,"x2":1546.5238095238096,"y2":173.0521303258132,"draw":false,"type":0,"index":4,"extra":[]},
        {"x1":1679.4436090225563,"y1":208.16491228070043,"x2":1897.9899749373435,"y2":319.4431077694222,"draw":false,"type":0,"index":5,"extra":[]},
        {"x1":1778.4160401002507,"y1":112.9268170426052,"x2":1832.5513784461152,"y2":164.0546365914774,"draw":false,"type":5,"index":6,"extra":[]},
        {"x1":2731.3984962406016,"y1":592.1699248120284,"x2":2804.7318295739346,"y2":896.8065162907252,"draw":false,"type":1,"index":9,"extra":[]},
        {"x1":2907.062656641604,"y1":711.4681704260636,"x2":3103.5538847117796,"y2":774.6260651629057,"draw":false,"type":0,"index":10,"extra":[]},
        {"x1":3026.160401002506,"y1":564.0997493734319,"x2":3718.0401002506264,"y2":628.2601503759381,"draw":false,"type":1,"index":11,"extra":[]},
        {"x1":3711.9498746867166,"y1":737.5333333333317,"x2":4005.233082706767,"y2":799.6887218045097,"draw":false,"type":0,"index":12,"extra":[]},
        {"x1":3999.218045112782,"y1":679.3879699248104,"x2":5021.4473684210525,"y2":734.5258145363392,"draw":false,"type":2,"index":13,"extra":[]},
        {"x1":5022.550125313283,"y1":735.3528822055123,"x2":5189.968671679198,"y2":816.5558897243093,"draw":false,"type":0,"index":14,"extra":[]},
        {"x1":4010.720551378446,"y1":1176.4055137844596,"x2":4299.442355889724,"y2":1326.7814536340836,"draw":false,"type":0,"index":16,"extra":[]},
        {"x1":4300.695488721804,"y1":1235.553383458645,"x2":4587.412280701755,"y2":1291.6937343358381,"draw":false,"type":3,"index":17,"extra":[]},
        {"x1":4601.171679197995,"y1":1178.410526315788,"x2":5114.37969924812,"y2":1312.7463659147854,"draw":false,"type":0,"index":17,"extra":[]},
        {"x1":5273.307769423559,"y1":646.2075187969908,"x2":5462.781453634085,"y2":714.3779448621538,"draw":false,"type":0,"index":18,"extra":[]},
        {"x1":5514.385463659148,"y1":745.4556390977427,"x2":5749.974436090225,"y2":835.6812030075172,"draw":false,"type":0,"index":19,"extra":[]},
        {"x1":5929.748872180451,"y1":324.80401002506096,"x2":5974.748872180451,"y2":428.06215538846953,"draw":false,"type":3,"index":22,"extra":[]},
        {"x1":6208.94686716792,"y1":327.81152882205345,"x2":6253.94686716792,"y2":432.07218045112614,"draw":false,"type":3,"index":23,"extra":[]},
        {"x1":5747.793984962405,"y1":337.8867167919783,"x2":6849.623558897243,"y2":759.5909774436074,"draw":false,"type":4,"index":23,"extra":[]},
        {"x1":5742.806516290727,"y1":276.8340852130309,"x2":6851.829072681704,"y2":334.97944862155225,"draw":false,"type":0,"index":23,"extra":[]},
        {"x1":6492.480701754386,"y1":333.8265664160384,"x2":6850.876691729323,"y2":427.7614035087703,"draw":false,"type":3,"index":24,"extra":[]},
        {"x1":7255.438095238095,"y1":456.6335839598981,"x2":7536.465664160401,"y2":784.4531328320786,"draw":false,"type":6,"index":26,"extra":[]},
        {"x1":7468.608521303258,"y1":684.9904761904745,"x2":7651.064661654135,"y2":749.1508771929807,"draw":false,"type":0,"index":27,"extra":[]},
        {"x1":6855.88671679198,"y1":684.9904761904745,"x2":7252.302756892231,"y2":751.1558897243091,"draw":false,"type":0,"index":27,"extra":[]},
        {"x1":8185.5007518797,"y1":643.6481203007497,"x2":8463.194987468672,"y2":747.9087719298224,"draw":false,"type":0,"index":28,"extra":[]},
        {"x1":8450.162406015039,"y1":503.2972431077672,"x2":8543.395488721806,"y2":643.6481203007497,"draw":false,"type":8,"index":29,"extra":[]},
        {"x1":3837.891478696742,"y1":631.7057644110259,"x2":3927.1145363408527,"y2":714.9137844611513,"draw":false,"type":5,"index":30,"extra":[]},
        {"x1":2600.8621553884714,"y1":913.7463659147853,"x2":2734.195488721805,"y2":975.9017543859633,"draw":false,"type":0,"index":30,"extra":[]},
        {"x1":1816.4761904761908,"y1":960.8641604010008,"x2":2339.358395989975,"y2":1080.162406015036,"draw":false,"type":0,"index":31,"extra":[]},
        {"x1":-2736.3102756892117,"y1":1602.2651629072666,"x2":8760.740852130304,"y2":1744.6210526315772,"draw":false,"type":3,"index":32,"extra":[]}
      ],
      "texts": [
        {"text":"Tutorial","x":400,"y":100,"size":50,"color":"white","draw":false},
        {"text":"Use WASD or arrow keys to move","x":400.50125313283206,"y":120.55137844611528,"size":20,"color":"white","draw":false},
        {"text":"Blue blocks are smooth. You can stand and","x":402.0513784461153,"y":521.5914786967419,"size":20,"color":"white","draw":false},
        {"text":"jump on then, but not much else.","x":400.046365914787,"y":545.6516290726817,"size":20,"color":"white","draw":false},
        {"text":"Red blocks kill you.","x":1556.3205513784462,"y":361.22556390977445,"size":20,"color":"white","draw":false},
        {"text":"Don't worry, you can ","x":1558.3255639097747,"y":386.28822055137846,"size":20,"color":"white","draw":false},
        {"text":"respawn.","x":1560.330576441103,"y":413.3558897243108,"size":20,"color":"white","draw":false},
        {"text":"This is a checkpoint.","x":1794.1441102756892,"y":57.98496240601554,"size":20,"color":"white","draw":false},
        {"text":"If you touch it, you will respawn","x":1799.15664160401,"y":80.04010025062706,"size":20,"color":"white","draw":false},
        {"text":"there until you touch another one.","x":1791.1365914786968,"y":104.10025062656689,"size":20,"color":"white","draw":false},
        {"text":"Down here!","x":1922.0300751879697,"y":439.7543859649128,"size":20,"color":"white","draw":false},
        {"text":"Sprint by going forward, backward, and forward","x":2078.90977443609,"y":799.259147869674,"size":20,"color":"white","draw":false},
        {"text":"again in quick succession.","x":2084.924812030075,"y":819.3092731829573,"size":20,"color":"white","draw":false},
        {"text":"Green blocks are climbable.","x":2861.395989974937,"y":926.6135338345867,"size":20,"color":"white","draw":false},
        {"text":"Don't land on top, though!","x":2880.4436090225563,"y":959.696240601504,"size":20,"color":"white","draw":false},
        {"text":"You can also stick to the bottom of green blocks.","x":3240.586466165413,"y":541.4551378446118,"size":20,"color":"white","draw":false},
        {"text":"Touch a yellow block, and you get teleported to the other side","x":4252.067669172932,"y":579.1819548872184,"size":20,"color":"white","draw":false},
        {"text":"Yes, the top works too.","x":4432.894736842105,"y":1444.6130325814538,"size":20,"color":"white","draw":false},
        {"text":"Reverse gravity zone ->","x":5618.917293233083,"y":501.22907268170474,"size":20,"color":"white","draw":false},
        {"text":"No sprinting in here!","x":7392.48320802005,"y":519.6275689223073,"size":20,"color":"white","draw":false},
        {"text":"---->","x":7707.187468671678,"y":532.6601503759414,"size":20,"color":"white","draw":false},
        {"text":"Finish the","x":8496.099749373434,"y":521.6320802005025,"size":20,"color":"white","draw":false},
        {"text":"level","x":8496.099749373434,"y":538.6746867167933,"size":20,"color":"white","draw":false},
        {"text":"By the way, you can press R to restart.","x":8298.656140350877,"y":430.0005012531311,"size":20,"color":"white","draw":false}
      ]
    },
    {
      "blocks": [
        {"x1":-1000,"y1":400,"x2":200,"y2":500,"draw":false,"type":3,"index":1,"extra":[]},
        {"x1":600,"y1":400,"x2":1080,"y2":640,"draw":false,"type":4,"index":2,"extra":[]},
        {"x1":600,"y1":400,"x2":1080,"y2":640,"draw":false,"type":4,"index":3,"extra":[]},
        {"x1":1080,"y1":360,"x2":3680,"y2":680,"draw":false,"type":3,"index":4,"extra":[]},
        {"x1":-320,"y1":40,"x2":-240,"y2":50,"draw":false,"type":0,"index":5,"extra":[]},
        {"x1":-585,"y1":-80,"x2":-535,"y2":-70,"draw":false,"type":0,"index":6,"extra":[]},
        {"x1":-600,"y1":-220,"x2":-520,"y2":-160,"draw":false,"type":0,"index":7,"extra":[]},
        {"x1":-320,"y1":-280,"x2":-160,"y2":-200,"draw":false,"type":0,"index":8,"extra":[]},
        {"x1":-260,"y1":-420,"x2":-180,"y2":-340,"draw":false,"type":5,"index":9,"extra":[]},
        {"x1":-340,"y1":-500,"x2":100,"y2":-60,"draw":false,"type":6,"index":10,"extra":[]},
        {"x1":-225,"y1":-200,"x2":-175,"y2":-80,"draw":false,"type":1,"index":11,"extra":[]},
        {"x1":-240,"y1":-80,"x2":-160,"y2":-70,"draw":false,"type":3,"index":12,"extra":[]},
        {"x1":15,"y1":-200,"x2":65,"y2":-80,"draw":false,"type":1,"index":13,"extra":[]},
        {"x1":0,"y1":-240,"x2":110,"y2":-200,"draw":false,"type":0,"index":14,"extra":[]},
        {"x1":0,"y1":-80,"x2":80,"y2":-70,"draw":false,"type":3,"index":15,"extra":[]},
        {"x1":900,"y1":-140,"x2":1180,"y2":-60,"draw":false,"type":0,"index":16,"extra":[]},
        {"x1":1020,"y1":-300,"x2":1100,"y2":-220,"draw":false,"type":5,"index":17,"extra":[]},
        {"x1":1260,"y1":-220,"x2":1540,"y2":-140,"draw":false,"type":2,"index":18,"extra":[]},
        {"x1":600,"y1":680,"x2":1080,"y2":760,"draw":false,"type":8,"index":19,"extra":[]},
        {"x1":200,"y1":400,"x2":600,"y2":680,"draw":false,"type":0,"index":20,"extra":[]},
        {"x1":135,"y1":280,"x2":185,"y2":290,"draw":false,"type":0,"index":21,"extra":[]},
        {"x1":-105,"y1":160,"x2":-55,"y2":170,"draw":false,"type":0,"index":22,"extra":[]},
        {"x1":1235,"y1":-430,"x2":1285,"y2":-220,"draw":false,"type":3,"index":23,"extra":[]},
        {"x1":1170,"y1":-250,"x2":1280,"y2":-230,"draw":false,"type":0,"index":24,"extra":[]},
        {"x1":1280,"y1":-340,"x2":1360,"y2":-220,"draw":false,"type":0,"index":25,"extra":[]},
        {"x1":1400,"y1":-400,"x2":1600,"y2":-340,"draw":false,"type":3,"index":26,"extra":[]},
        {"x1":1540,"y1":-340,"x2":1600,"y2":-220,"draw":false,"type":3,"index":27,"extra":[]},
        {"x1":1430,"y1":-140,"x2":1490,"y2":30,"draw":false,"type":1,"index":28,"extra":[]},
        {"x1":1490,"y1":30,"x2":1570,"y2":360,"draw":false,"type":3,"index":28,"extra":[]},
        {"x1":1230,"y1":-140,"x2":1290,"y2":120,"draw":false,"type":3,"index":29,"extra":[]},
        {"x1":1230,"y1":110,"x2":1450,"y2":170,"draw":false,"type":3,"index":30,"extra":[]},
        {"x1":-120,"y1":-480,"x2":-40,"y2":-280,"draw":false,"type":3,"index":31,"extra":[]},
        {"x1":1440,"y1":-340,"x2":1540,"y2":-220,"draw":false,"type":6,"index":32,"extra":[]}
      ],
      "texts": [
        {"text":"Try it!","x":400,"y":300,"size":50,"color":"white","draw":false},
        {"text":"End is down there","x":830.1817042606517,"y":494.5238095238095,"size":20,"color":"white","draw":false},
        {"text":"|","x":839.204260651629,"y":509.5258145363409,"size":20,"color":"white","draw":false},
        {"text":"V","x":839.204260651629,"y":518.5483709273183,"size":20,"color":"white","draw":false}
      ]
    },
    {
      "blocks":[
        {x1: 200, y1: 400, x2: 600, y2: 500, draw: false, type: 0, index: 1, extra: []}
      ],
      "texts": []
    }
  ]

    let level = 2;

  const field: block[][][] = [];
  function collidePlayer(x1: number, y1: number, x2: number, y2: number) {
    if (player.x < x2 && player.x + player.width > x1 && player.y < y2 && player.y + player.height > y1) {
      const top = player.y + player.height - y1
      const left = player.x + player.width - x1
      const bottom = y2 - player.y
      const right = x2 - player.x

      const smallest = Math.min(top, left, bottom, right)

      if (smallest === top) return 1
      if (smallest === left) return 2
      if (smallest === bottom) return 3
      return 4
  } else { return 0; }
}





  function blockToField (block: block) {
    for (let i = block.x1 - player.width; i <= block.x2 + player.width; i += player.width) {
      for (let j = block.y1 - player.height; j <= block.y2 + player.height; j += player.height) {
        field[Math.floor(i / player.width)] ??= [];
        field[Math.floor(i / player.width)][Math.floor(j / player.height)] ??= [];
        field[Math.floor(i / player.width)][Math.floor(j / player.height)].push(block);
      }
    }
  }
  blockToField(newBlock);


  for(let i = 0; i < levels[level].blocks.length; i++) {
    blockToField(levels[level].blocks[i]);
  }
  blocks = levels[level].blocks;
  texts = levels[level].texts;

  const line = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (!newText.draw || !gameplayMode) return; // Only while editing text

    if (event.key.length === 1) {
      newText.text += event.key;
      event.preventDefault();
    } else if (event.key === 'Backspace') {
      newText.text = newText.text.slice(0, -1);
      event.preventDefault();
    } else if (event.key === 'Enter') {
      newText.draw = false;
      texts.push({...newText});
      newText.text = '';
      event.preventDefault();
    } else if (event.key === 'Escape') {
      newText.text = '';
      newText.draw = false;
      event.preventDefault();
    } else if (event.key === 'ArrowRight') {
      newText.size++;
      event.preventDefault();
    } else if (event.key === 'ArrowLeft') {
      newText.size--;
      event.preventDefault();
    }
  });


  function changeLevel(newLevel: number) {
    level = newLevel;
    blocks = [];
    for (const x of Object.keys(field)) {
      delete field[Number(x)]
    }
    field.length = 0
    blocks = levels[newLevel].blocks;
    texts = levels[newLevel].texts;
    for(let i = 0; i < blocks.length; i++) {
      blockToField(blocks[i]);
    }
    player.respawnX = 400;
    player.respawnY = 200;
    respawn = 0;
  }





//------------------------------- HAPPENS EVERY FRAME --------------------------------


  const frame = (): void => {

    // The mouse is in canvas coordinates; the editor uses world coordinates.
    const worldMouseX = mouse.x + camera.x
    const worldMouseY = mouse.y + camera.y
  if(!paused) {
    if (respawn < 0) {


      ground = 0;
      player.x += velX;
      player.y += velY;
      last_grav = grav;
      grav = 0.2;
      canDown = true;
      //----------------- PLAYER COLLISION --------------------------------


      const nearbyBlocks = field[Math.floor(player.x / player.width)]?.[Math.floor(player.y / player.height)] ?? []

      for (let i = 0; i < nearbyBlocks.length; i++) {
        let block = nearbyBlocks[i];
        if (block && collidePlayer(block.x1, block.y1, block.x2, block.y2) != 0) {
          let direction = collidePlayer(block.x1, block.y1, block.x2, block.y2);

          //Collision type 0; smooth walls

          if (block.type == 0) {
            if (direction == 1) {
              player.y = block.y1 - player.height - 1;
              velY = 0;
              if (grav > 0 && last_grav > 0) {
                ground = 1;
                player.y = block.y1 - player.height + 1;
              }
            } else if (direction == 2) {
              player.x = block.x1 - player.width - 1;
            } else if (direction == 3) {
              player.y = block.y2 + 1;
              velY = 0;
              if (grav < 0 || last_grav < 0) {
                ground = 1;
                player.y = block.y2 - 1;
              }
            } else if (direction == 4) {
              player.x = block.x2 + 1;
            }
          }

          // Collision type 1; Climbable walls


          if (block.type == 1) {
            if (direction == 1) {
              if (grav > 0) {
                if (wasSideCollision < 0 || isSideCollision) {
                  respawn = respawnTimer;
                } else {
                  wasTopCollision = true;
                }
              } else {
                player.y = block.y2 - 1;
                velY = 0;
                if (keys.has('w') || keys.has('up_arrow')) {
                  velY = jump;
                }
              }
            } else if (direction == 2) {
              player.x = block.x1 - player.width - 1;
              velY = 5 * grav;
              ground = 1;
              wasSideCollision = 1;
              isSideCollision = true;
              if (wasTopCollision) {
                respawn = respawnTimer;
              }

            } else if (direction == 3) {
              player.y = block.y2 - 1;
              velY = 0;
              if (keys.has('w') || keys.has('up_arrow')) {
                velY = jump;
              }
              if (grav < 0 || last_grav < 0) {
                respawn = respawnTimer;
              }
            } else if (direction == 4) {
              player.x = block.x2 + 1;
              velY = 5 * grav;
              ground = 1;
              wasSideCollision = 1;
              isSideCollision = true;
              if (wasTopCollision) {
                respawn = respawnTimer;
              }
            }
          }

          //Collision type 2; skip zone
          if (block.type == 2) {
            if (direction == 1) player.y = block.y2 + 1;
            else if (direction == 2) player.x = block.x2 + 1;
            else if (direction == 3) player.y = block.y1 - player.height - 1;
            else if (direction == 4) player.x = block.x1 - player.width - 1;
          }

          //collision type 3; death zone
          if (block.type == 3) {
            respawn = respawnTimer;
          }

          //collision type; 4 reverse gravity
          if (block.type == 4) {
            grav -= 0.4;
          }

          //collision type 5; checkpoints
          if (block.type == 5) {
            player.respawnX = (block.x1 + block.x2) / 2;
            player.respawnY = (block.y1 + block.y2) / 2;
          }

          //collision type 6; No sprint zone
          if (block.type == 6) {
            sprint = 0;
          }

          //collision type _; speed check (Unused)
          // if (block.type == 7) {
          //   let passY = 0;
          //   if(block.extra[0].y < block.y1) {
          //     passY = Math.sqrt((block.y1 - block.extra[0].y) * grav * 2);
          //   }
          //   if(block.extra[0].y > block.y2) {
          //     passY = -Math.sqrt((block.extra[0].y - block.y2) * grav * 2);
          //   }
          //   if(velY < passY) {
          //     velY = -1;
          //     canDown = false;
          //   } else {
          //     velY = passY + 1;
          //   }
          // }


          //collision type 7: bounce
          if (block.type == 7) {
            if (direction == 1) {
              player.y = block.y1 - player.height;
              velY = -1.1 * velY;
            }
            if (direction == 2) {
              player.x = block.x1 - player.width;
              velX = -velX;
              stun = Math.abs(velX * 2);
            }
            if (direction == 3) {
              player.y = block.y2;
              velY = -1.1 * velY;
            }
            if (direction == 4) {
              player.x = block.x2;
              velX = -velX;
              stun = 60;
            }
          }


          //collision type 8; end gate
          if (block.type == 8) {
            level++;
            if (level >= levels.length) {
              level = 0;
            }
            changeLevel(level);
          }
          //collision type 10; portal;
          if (block.type == 10) {
            if (direction == 1) {
              player.y += block.extra[0].y - (block.y2 + block.y1) / 2 + block.y2 - block.y1 + player.height;
              player.x += block.extra[0].x - (block.x2 + block.x1) / 2;
            }
            if (direction == 2) {
              player.x += block.extra[0].x - (block.x2 + block.x1) / 2 + block.x2 - block.x1 + player.width;
              player.y += block.extra[0].y - (block.y2 + block.y1) / 2;
            }
            if (direction == 3) {
              player.y += block.extra[0].y - (block.y2 + block.y1) / 2 - block.y2 + block.y1 - player.height;
              player.x += block.extra[0].x - (block.x2 + block.x1) / 2;
            }
            if (direction == 4) {
              player.x += block.extra[0].x - (block.x2 + block.x1) / 2 - block.x2 + block.x1 - player.width;
              player.y += block.extra[0].y - (block.y2 + block.y1) / 2;
            }
          }

        }
      }
      isSideCollision = false;
      wasSideCollision--;
      wasTopCollision = false;


      //----------------- PLAYER MOVEMENT --------------------------------

      if (gameplayMode == 0) {
        velY += grav;
      }

      if (keys.has('p') && !pWasDown && (!newText.draw || !gameplayMode)) {
        gameplayMode = 1 - gameplayMode;
      }
      pWasDown = keys.has('p');
      if (gameplayMode == 0) {
        if (stun <= 0) {
          velX = 0;
        }


        if (keys.has('arrowLeft') || keys.has('a')) {
          if (stun <= 0) {
            if (aWasDown > 12 && dWasDown > 6 && sprint < -sprint_timer) {
              sprint = 100
            }
            if (aWasDown < 11) {
              aWasDown = Math.max(12, aWasDown + 12);
            } else {
              aWasDown = 12;
            }
            if (ground == 0) {
              velX -= (sprint > 10 ? speed * sprint / 10 : speed);
            } else {
              velX -= speed;
            }
          } else if (velX >= 0) {
            stun--;
          }
        }
        if (keys.has('arrowRight') || keys.has('d')) {
          if (stun <= 0) {
            if (dWasDown > 12 && aWasDown > 6 && sprint < -sprint_timer) {
              sprint = 100
            }
            if (dWasDown < 11) {
              dWasDown = Math.max(12, dWasDown + 12);
            } else {
              dWasDown = 12;
            }
            if (ground == 0) {
              velX += (sprint > 10 ? speed * sprint / 10 : speed);
            } else {
              velX += speed;
            }
          } else if (velX <= 0) {
            velX++;
            stun--;
          }
        }
        if (keys.has('arrowDown') || keys.has('s')) {

          if (!sWasDown && Math.abs(velY) > 3) {
            if (canDown) {
              if (grav > 0 && last_grav > 0) {
                velY = 3
              } else {
                velY = -3
              }
            }
          } else {
            if (grav > 0 && last_grav > 0) {
              velY = Math.abs(velY)
            } else {
              velY = -Math.abs(velY)
            }
          }
        }
        sWasDown = keys.has('s');

        if (ground && (keys.has('arrowUp') || keys.has('w'))) {
          if (grav < 0 || last_grav < 0) {
            velY = jump;
          } else {
            velY = -jump
          }
          if (sprint > 0) {
            velY *= 1.2;
          }
          ground = 0;
        }

        sprint -= (ground == 1 ? 5 : 2);
        aWasDown--;
        dWasDown--;
      } else {

        //------editor movement------

        velX = 0;
        velY = 0;
        if (!newText.draw) {
          if (keys.has('arrowLeft') || keys.has('a')) {
            velX = -Math.min(Math.max(10, editorDashX - (100 * editorAccel)), 50);
            editorDashX += editorAccel;
          } else if (keys.has('arrowRight') || keys.has('d')) {
            velX = Math.min(Math.max(10, editorDashX - (100 * editorAccel)), 50);
            editorDashX += editorAccel;
          } else {
            editorDashX = 0;
          }

          if (keys.has('arrowDown') || keys.has('s')) {
            velY = Math.min(Math.max(10, editorDashY - (100 * editorAccel)), 50);
            editorDashY += editorAccel;
          } else if (keys.has('arrowUp') || keys.has('w')) {
            velY = -Math.min(Math.max(10, editorDashY - (100 * editorAccel)), 50);
            editorDashY += editorAccel;
          } else {
            editorDashY = 0;
          }
        }
      }


      if (keys.has('1') && keys.has('control')) changeLevel(1);
      if (keys.has('2') && keys.has('control')) changeLevel(2);
      if (keys.has('3') && keys.has('control')) changeLevel(3);
      if (keys.has('4') && keys.has('control')) changeLevel(4);
      if (keys.has('5') && keys.has('control')) changeLevel(5);
      if (keys.has('6') && keys.has('control')) changeLevel(6);
      if (keys.has('7') && keys.has('control')) changeLevel(7);
      if (keys.has('8') && keys.has('control')) changeLevel(8);
      if (keys.has('9') && keys.has('control')) changeLevel(9);
      if (keys.has('0') && keys.has('control')) changeLevel(0);


      // Update the camera before drawing this frame.
      if (player.y > camera.y + 800 - cameraOffset) camera.y = player.y - 800 + cameraOffset;
      if (player.y < camera.y + cameraOffset) camera.y = player.y - cameraOffset;
      if (player.x > camera.x + 800 - cameraOffset) camera.x = player.x - 800 + cameraOffset;
      if (player.x < camera.x + cameraOffset) camera.x = player.x - cameraOffset;


      // ---------------------- EDITOR -------------------------------------------------------------------------
      if (keys.has('0') && !keys.has('shift')) editorMode = 0;
      if (keys.has('1')) editorMode = 1;
      if (keys.has('2')) editorMode = 2;
      if (keys.has('3')) editorMode = 3;
      if (keys.has('4')) editorMode = 4;
      if (keys.has('5')) editorMode = 5;
      if (keys.has('6')) editorMode = 6;
      if (keys.has('7')) editorMode = 7;
      if (keys.has('8')) editorMode = 8;
      if (keys.has('9')) editorMode = 9;
      if (keys.has(')')) editorMode = 10;


      if (mouse.leftDown && !mouseWasDown && !editExtras) {
        newBlock = {
          x1: worldMouseX,
          y1: worldMouseY,
          x2: worldMouseX,
          y2: worldMouseY,
          draw: true,
          type: editorMode,
          index: blocks.length,
          extra: []
        }
        if (!keys.has('shift') && !keys.has('control')) [newBlock.x1, newBlock.y1] = [newBlock.x1, newBlock.y1].map(value => Math.round(value / 40) * 40);
        if (keys.has('shift') && !keys.has('control')) [newBlock.x1, newBlock.y1] = [newBlock.x1, newBlock.y1].map(value => Math.round(value / 20) * 20);
        if (!keys.has('shift') && keys.has('control')) [newBlock.x1, newBlock.y1] = [newBlock.x1, newBlock.y1].map(value => Math.round(value / 10) * 10);
        if (keys.has('shift') && keys.has('control')) [newBlock.x1, newBlock.y1] = [newBlock.x1, newBlock.y1].map(Math.round);
      }
      if (!mouse.leftDown && mouseWasDown && newBlock.draw) {
        if (!editExtras) {
          newBlock.x2 = worldMouseX;
          newBlock.y2 = worldMouseY;
          if (!keys.has('shift') && !keys.has('control')) [newBlock.x2, newBlock.y2] = [newBlock.x2, newBlock.y2].map(value => Math.round(value / 40) * 40);
          if (keys.has('shift') && !keys.has('control')) [newBlock.x2, newBlock.y2] = [newBlock.x2, newBlock.y2].map(value => Math.round(value / 20) * 20);
          if (!keys.has('shift') && keys.has('control')) [newBlock.x2, newBlock.y2] = [newBlock.x2, newBlock.y2].map(value => Math.round(value / 10) * 10);
          if (keys.has('shift') && keys.has('control')) [newBlock.x2, newBlock.y2] = [newBlock.x2, newBlock.y2].map(Math.round);
          if (newBlock.x1 > newBlock.x2) {
            const temp = newBlock.x1;
            newBlock.x1 = newBlock.x2;
            newBlock.x2 = temp;
          }
          if (newBlock.y1 > newBlock.y2) {
            const temp = newBlock.y1;
            newBlock.y1 = newBlock.y2;
            newBlock.y2 = temp;
          }

        }
        if (newBlock.extra.length == blockExtras[editorMode] && newBlock.draw) {

          for (const point of newBlock.extra) {
            if (!keys.has('shift') && !keys.has('control')) [point.x, point.y] = [point.x, point.y].map(value => Math.round(value / 40) * 40);
            if (keys.has('shift') && !keys.has('control')) [point.x, point.y] = [point.x, point.y].map(value => Math.round(value / 20) * 20);
            if (!keys.has('shift') && keys.has('control')) [point.x, point.y] = [point.x, point.y].map(value => Math.round(value / 10) * 10);
            if (keys.has('shift') && keys.has('control')) [point.x, point.y] = [point.x, point.y].map(Math.round);
          }
          let mouseRounded = 0;
          if (!keys.has('shift') && !keys.has('control')) mouseRounded = Math.round(worldMouseX / 40) * 40;
          if (keys.has('shift') && !keys.has('control')) mouseRounded = Math.round(worldMouseX / 20) * 20;
          if (!keys.has('shift') && keys.has('control')) mouseRounded = Math.round(worldMouseX / 10) * 10;
          if (keys.has('shift') && keys.has('control')) mouseRounded = Math.round(worldMouseX);

          if (newBlock.y2 - newBlock.y1 < 10) newBlock.y2 = newBlock.y1 + 10;
          if (newBlock.x2 - newBlock.x1 < 50) {
            newBlock.x1 = mouseRounded - 25;
            newBlock.x2 = mouseRounded + 25;
          }

          blocks.push(newBlock);
          blockToField(newBlock);
          if (newBlock.type == 10) {
            const otherPortal: block = {
              x1: newBlock.extra[0].x - (newBlock.x2 - newBlock.x1) / 2,
              y1: newBlock.extra[0].y - (newBlock.y2 - newBlock.y1) / 2,
              x2: newBlock.extra[0].x + (newBlock.x2 - newBlock.x1) / 2,
              y2: newBlock.extra[0].y + (newBlock.y2 - newBlock.y1) / 2,
              draw: false,
              type: 10,
              index: blocks.length,
              extra: [{x: (newBlock.x1 + newBlock.x2) / 2, y: (newBlock.y1 + newBlock.y2) / 2}]
            }
            blocks.push(otherPortal);
            blockToField(otherPortal);
          }
          newBlock.draw = false
          editExtras = false
        } else if (newBlock.y2 !== newBlock.y1 && newBlock.draw) {
          editExtras = true;
        }
      }

      if (editExtras && mouse.leftDown && !mouseWasDown) {
        newBlock.extra.push({x: worldMouseX, y: worldMouseY});
      }


      mouseWasDown = mouse.leftDown;

      if (keys.has('t') && !newText.draw) {
        newText.x = worldMouseX;
        newText.y = worldMouseY;
        if (!keys.has('shift') && !keys.has('control')) [newText.x, newText.y] = [newText.x, newText.y].map(value => Math.round(value / 40) * 40);
        if (keys.has('shift') && !keys.has('control')) [newText.x, newText.y] = [newText.x, newText.y].map(value => Math.round(value / 20) * 20);
        if (!keys.has('shift') && keys.has('control')) [newText.x, newText.y] = [newText.x, newText.y].map(value => Math.round(value / 10) * 10);
        if (keys.has('shift') && keys.has('control')) [newText.x, newText.y] = [newText.x, newText.y].map(Math.round);
        newText.draw = true;
      }


      if (mouse.rightDown) {
        const cellX = Math.floor(worldMouseX / player.width)
        const cellY = Math.floor(worldMouseY / player.height)
        const candidates = field[cellX]?.[cellY] ?? []

        for (const target of candidates) {
          if (
              worldMouseX > target.x1 &&
              worldMouseX < target.x2 &&
              worldMouseY > target.y1 &&
              worldMouseY < target.y2 &&
              (editorMode == 9 || target.type == editorMode)
          ) {
            const index = blocks.indexOf(target)
            if (index !== -1) blocks.splice(index, 1)
            for (let i = index; i < blocks.length; i++) {
              blocks[i].index--;
            }

            for (let x = target.x1 - player.width; x <= target.x2 + player.width; x += player.width) {
              for (let y = target.y1 - player.height; y <= target.y2 + player.height; y += player.height) {
                const cell =
                    field[Math.floor(x / player.width)]
                        ?.[Math.floor(y / player.height)]

                if (!cell) continue

                for (let k = cell.length - 1; k >= 0; k--) {
                  if (cell[k] === target) cell.splice(k, 1)
                }
              }
            }

            break
          }
        }
      }
      if (mouse.middleDown) {
        const candidates = field[Math.floor(worldMouseX / player.width)]?.[Math.floor(worldMouseY / player.height)] ?? []

        for (const target of candidates) {
          if (
              worldMouseX > target.x1 &&
              worldMouseX < target.x2 &&
              worldMouseY > target.y1 &&
              worldMouseY < target.y2
          ) {
            const index = blocks.indexOf(target)
            if (index !== -1) editorMode = target.type;
            break
          }
        }
      }


    } else if (respawn > 0) {
      respawn--;
    } else {
      player.x = player.respawnX - player.width / 2;
      player.y = player.respawnY - player.height / 2;
      velX = 0;
      velY = 0;
      ground = 0;
      deaths++;
      respawn = -1;
      sprint = 0;
    }

    if (keys.has('r') && (!newText.draw || !gameplayMode) && rWasDown < 0) {
      gameplayMode = 0;
      if (keys.has('shift')) {
        player.respawnX = 400;
        player.respawnY = 200;
      }
      respawn = 0;
    }
    if (keys.has('r')) {
      rWasDown = 1
    }
    rWasDown--;
  }

    if(keys.has('escape') && !escWasDown) {
      paused = !paused;
    }
    escWasDown = false;
  if(keys.has('escape')) {
    escWasDown = true;
  }

    // ------------------- DRAWING ------------------------------------------------------------
    // Clear in canvas coordinates, then draw the world through the camera.
    ctx.resetTransform()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(-camera.x, -camera.y)

    let starting_tile_X = Math.floor(camera.x/40) * 40;
    let starting_tile_Y = Math.floor(camera.y/40) * 40;
    for(let i = starting_tile_X; i <= starting_tile_X + canvas.width; i+=40) {
      for (let j = starting_tile_Y; j <= starting_tile_Y + canvas.height; j += 40) {
        if ((i + j) / 40 % 2 == 0) {
          const blue = Math.max(0, Math.min(255, 200 - camera.y / 80))
          ctx.fillStyle = `rgb(200, 200, ${blue})`
          ctx.fillStyle = 'rgb(200,200,200 - camera.y / 800)'
        } else {
          ctx.fillStyle = 'rgb(250,250,250)'
        }
        ctx.fillRect(i, j, 40, 40)
      }
    }


  if(gameplayMode == 0) {
    //sprint bar
    ctx.fillStyle = 'black'
    ctx.font = '24px Arial'
    ctx.fillText('Sprint: ', camera.x + 50, camera.y + 20);
    ctx.fillRect(camera.x + 10, camera.y + 30, 200, 40);
    if (sprint < 0) {
      ctx.fillStyle = 'rgb(255, 100, 0)'
      ctx.fillRect(camera.x + 15, camera.y + 35, Math.min(-190 / sprint_timer * sprint, 190), 30);
    }
    if (sprint > 0) {
      ctx.fillStyle = 'rgb(0, 255, 200)'
      ctx.fillRect(camera.x + 15, camera.y + 35, Math.min(1.9 * sprint, 190), 30);
    }
  } else {
    blocks.push({x1: camera.x + 10, y1: camera.y + 10, x2: camera.x + 90, y2: camera.y + 90, draw: false, type: editorMode, index: blocks.length + 1, extra: []})
  }

    for (const block of blocks) {
      if(block.type == 0) { ctx.fillStyle = 'rgba(0,100,255,0.9)' }
      if(block.type == 1) { ctx.fillStyle = 'rgba(0,150,0,0.9)' }
      if(block.type == 2) { ctx.fillStyle = 'rgba(255,255,0,0.9)' }
      if(block.type == 3) { ctx.fillStyle = 'rgba(200,0,0,0.9)' }
      if(block.type == 4) { ctx.fillStyle = 'rgba(200, 200, 0, 0.5)' }
      if(block.type == 5) { ctx.fillStyle = 'rgba(0, 200, 250, 0.2)' }
      if(block.type == 6) { ctx.fillStyle = 'rgba(250, 0, 250, 0.2)' }
      if(block.type == 7) { ctx.fillStyle = 'rgba(150, 150, 150, 1)' }
      if(block.type == 8) { ctx.fillStyle = 'rgba(0, 0, 0, 1)' }
      if(block.type == 10) { ctx.fillStyle = 'rgba(0, 100, 200, 1)' }
      const pattern = blockPatterns[block.type]
      if (pattern) ctx.fillStyle = pattern
      ctx.fillRect(block.x1, block.y1, block.x2 - block.x1, block.y2 - block.y1)
      if(block.type == 10 && block.extra[0]) {
        line(block.extra[0].x, block.extra[0].y, (block.x1 + block.x2)/2, (block.y1 + block.y2)/2);
        ctx.fillStyle = 'rgba(200, 100, 0, 1)'
        ctx.fillRect(block.extra[0].x - (block.x2 - block.x1)/2, block.extra[0].y - (block.y2 - block.y1)/2, block.x2 - block.x1, block.y2 - block.y1)
      }
    }



    for (const text of texts) {
      ctx.font = `${text.size}px Arial`;
      ctx.fillStyle = `black`;
      ctx.fillText(text.text, text.x, text.y);
    }
    ctx.font = `${newText.size}px Arial`;
    ctx.fillStyle = `black`;
    ctx.fillText(newText.text, newText.x, newText.y);


    if (newBlock.draw && !editExtras) {
      ctx.globalAlpha /= 3;
      ctx.fillRect(newBlock.x1, newBlock.y1, worldMouseX - newBlock.x1, worldMouseY - newBlock.y1)
      ctx.globalAlpha = 1;
    } else if(newBlock.draw) {
      ctx.globalAlpha /= 1.5;
      ctx.fillRect(newBlock.x1, newBlock.y1, newBlock.x2 - newBlock.x1, newBlock.y2 - newBlock.y1)
      ctx.globalAlpha = 1;
      if(newBlock.type == 10) {
        line(worldMouseX, worldMouseY, (newBlock.x1 + newBlock.x2)/2, (newBlock.y1 + newBlock.y2)/2);
      }
    }
    if(gameplayMode == 1) {
      blocks.splice(blocks.length - 1, 1);
    }

    // Active checkpoint: at most 2x the player in either dimension.
    // Center the floating marker exactly on the respawn point.
    if (checkpointTexture) {
      const scale = Math.min(
        player.width * 2 / checkpointTexture.width,
        player.height * 2 / checkpointTexture.height,
      )
      const width = checkpointTexture.width * scale
      const height = checkpointTexture.height * scale
      const x = player.respawnX - width / 2
      const y = player.respawnY - height / 2
      ctx.save()
      ctx.globalAlpha = 1
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(checkpointTexture.image, x, y, width, height)
      ctx.restore()
    }

    ctx.font = `${20}px Arial`
    ctx.textAlign = 'left'
    ctx.fillText(`Y velocity: ${Math.round(10 * velY) / 10}`, 650 + camera.x, 30 + camera.y);
    ctx.fillText(`X velocity: ${Math.round(10 * velX) / 10}`, 650 + camera.x, 50 + camera.y);
    ctx.fillText(`deaths: ${deaths}`, 650 + camera.x , 70 + camera.y);
    ctx.textAlign = 'center'

    const opac = respawn < 0 ? 1 : respawn / respawnTimer
    ctx.fillStyle = `rgba(255, 0, 0, ${opac})`
    ctx.fillRect(player.x, player.y, player.width, player.height)
    if(respawn > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${opac/3})`
      ctx.fillRect(camera.x, camera.y, 800, 800)
    }

    if(paused) {
      ctx.save();

      ctx.fillStyle = `rgba(0, 0, 0, 0.8)`;
      ctx.fillRect(camera.x, camera.y, canvas.width, canvas.height);
      ctx.fillStyle = `rgb(255, 255, 255)`;
      ctx.font = '100px Arial';
      ctx.fillText('PAUSED', camera.x + canvas.width / 2, camera.y + canvas.height / 8);

      ctx.restore();
    }
    // Schedule exactly one next frame.
    requestAnimationFrame(frame)
  }

  // Start the loop.
  requestAnimationFrame(frame)
}











