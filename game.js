
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const goldDisplay = document.getElementById("gold");
const livesDisplay = document.getElementById("lives");
const waveDisplay = document.getElementById("wave");
const message = document.getElementById("gameMessage");

const startButton = document.getElementById("startWave");
const pauseButton = document.getElementById("pauseGame");
const speedButton = document.getElementById("speedGame");

let gold = 300;
let lives = 20;
let wave = 0;
let speed = 1;
let paused = false;
let gameOver = false;

let selectedTower = null;
let towers = [];
let activeTower = null;

const upgradeCosts = {
    2: 100,
    3: 200
};
let enemies = [];
let projectiles = [];

let waveRemaining = 0;
let spawnTimer = 0;
let waveActive = false;

const towerTypes = {
    archer: {
        name: "Archer",
        cost: 100,
        range: 150,
        damage: 20,
        cooldown: 0.8,
        icon: "🏹"
    },

    mage: {
        name: "Mage",
        cost: 150,
        range: 180,
        damage: 35,
        cooldown: 1.3,
        icon: "🔮"
    },

    cannon: {
        name: "Cannon",
        cost: 200,
        range: 130,
        damage: 65,
        cooldown: 2,
        icon: "💣"
    }
};

// ENEMY PATH

const path = [
    { x: 0, y: 110 },
    { x: 200, y: 110 },
    { x: 200, y: 300 },
    { x: 440, y: 300 },
    { x: 440, y: 150 },
    { x: 680, y: 150 },
    { x: 680, y: 410 },
    { x: 900, y: 410 }
];

// GRID BUILDING SYSTEM
const GRID_SIZE = 50;
const GRID_COLS = 18;
const GRID_ROWS = 11;

function getGridCenter(x, y) {
    return {
        x: Math.floor(x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2,
        y: Math.floor(y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2
    };
}

// Check distance from a cell to the enemy road
function distanceToRoad(x, y) {
    let minDistance = Infinity;

    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];

        const dx = b.x - a.x;
        const dy = b.y - a.y;

        const lengthSquared = dx * dx + dy * dy;

        let t = ((x-a.x)*dx + (y-a.y)*dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));

        const nearestX = a.x + t * dx;
        const nearestY = a.y + t * dy;

        const distance = Math.hypot(
            x-nearestX,
            y-nearestY
        );

        minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
}

function isBuildableCell(x, y) {
    if (x < 25 || y < 25 ||
        x > 875 || y > 525) return false;

    if (distanceToRoad(x, y) < 65) return false;

    for (const tower of towers) {
        if (Math.hypot(x-tower.x, y-tower.y) < 45) {
            return false;
        }
    }

    return true;
}

function updateUI() {
    goldDisplay.textContent = gold;
    livesDisplay.textContent = lives;
    waveDisplay.textContent = wave;
}

function showMessage(text) {
    message.textContent = text;
}

// DRAW BACKGROUND

function drawBackground() {
    ctx.fillStyle = "#477a42";
    ctx.fillRect(0, 0, 900, 550);

    // Grass decoration
    for (let x = 25; x < 900; x += 65) {
        for (let y = 25; y < 550; y += 65) {
            ctx.fillStyle = "#56864a";
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Trees
    const trees = [
        [65, 260], [105, 430], [330, 75],
        [350, 440], [560, 490], [820, 65],
        [810, 280], [100, 520], [560, 65],
        [850, 500]
    ];

    trees.forEach(([x, y]) => {
        ctx.fillStyle = "#68462d";
        ctx.fillRect(x - 5, y, 10, 20);

        ctx.fillStyle = "#205b32";
        ctx.beginPath();
        ctx.arc(x, y, 19, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#387b3d";
        ctx.beginPath();
        ctx.arc(x - 7, y - 7, 11, 0, Math.PI * 2);
        ctx.fill();
    });

    // Dirt road
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    path.forEach((point, index) => {
        if (index === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    });

    ctx.strokeStyle = "#61482f";
    ctx.lineWidth = 78;
    ctx.stroke();

    ctx.strokeStyle = "#98754c";
    ctx.lineWidth = 64;
    ctx.stroke();

    ctx.strokeStyle = "#ad8a5c";
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 12]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = "bold 18px Georgia";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("START", 12, 65);
    ctx.fillText("CASTLE", 820, 365);
}

// DRAW ENEMIES

function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.fillStyle = "#182519";
        ctx.beginPath();
        ctx.ellipse(
            enemy.x, enemy.y + 13, 16, 7,
            0, 0, Math.PI * 2
        );
        ctx.fill();

        ctx.font = "27px Arial";
        ctx.textAlign = "center";
        ctx.fillText("👾", enemy.x, enemy.y + 9);

        // Health bar
        ctx.fillStyle = "#422222";
        ctx.fillRect(enemy.x - 16, enemy.y - 17, 32, 5);

        ctx.fillStyle = "#65d45c";
        ctx.fillRect(
            enemy.x - 16,
            enemy.y - 17,
            32 * Math.max(0, enemy.hp / enemy.maxHp),
            5
        );
    });

    ctx.textAlign = "left";
}

// DRAW TOWERS


function drawTowers() {
    towers.forEach(tower => {
        const x = tower.x;
        const y = tower.y;

        ctx.save();

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(x, y + 15, 27, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Stone foundation
        const stone = ctx.createLinearGradient(x-20, y-15, x+20, y+20);
        stone.addColorStop(0, "#d0bd96");
        stone.addColorStop(0.5, "#89785e");
        stone.addColorStop(1, "#514432");

        ctx.fillStyle = stone;
        ctx.beginPath();
        ctx.roundRect(x-23, y-12, 46, 34, 5);
        ctx.fill();

        // Foundation border
        ctx.strokeStyle = "#e6ce9b";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Stone details
        ctx.strokeStyle = "#66553d";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x-20, y+1);
        ctx.lineTo(x+20, y+1);
        ctx.moveTo(x-20, y+11);
        ctx.lineTo(x+20, y+11);
        ctx.stroke();

        // ARCHER TOWER
        if (tower.name === "Archer") {

            // Wooden tower
            ctx.fillStyle = "#79502e";
            ctx.fillRect(x-15, y-35, 30, 30);

            ctx.fillStyle = "#b17a43";
            ctx.fillRect(x-19, y-40, 38, 9);

            // Roof
            ctx.fillStyle = "#a34d32";
            ctx.beginPath();
            ctx.moveTo(x-23, y-39);
            ctx.lineTo(x, y-65);
            ctx.lineTo(x+23, y-39);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = "#e6b56c";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Wooden window
            ctx.fillStyle = "#251b13";
            ctx.fillRect(x-5, y-29, 10, 15);

            // Arrow
            ctx.strokeStyle = "#f4d18b";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x, y-51);
            ctx.lineTo(x+13, y-51);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x+10, y-55);
            ctx.lineTo(x+15, y-51);
            ctx.lineTo(x+10, y-47);
            ctx.stroke();

            // Green flag
            ctx.strokeStyle = "#d9c18c";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x+14, y-43);
            ctx.lineTo(x+14, y-63);
            ctx.stroke();

            ctx.fillStyle = "#3e9b55";
            ctx.beginPath();
            ctx.moveTo(x+15, y-63);
            ctx.lineTo(x+31, y-57);
            ctx.lineTo(x+15, y-51);
            ctx.closePath();
            ctx.fill();
        }

        // MAGE TOWER
        else if (tower.name === "Mage") {

            // Purple tower body
            const magic = ctx.createLinearGradient(
                x-15, y-55, x+15, y-5
            );

            magic.addColorStop(0, "#b28ae6");
            magic.addColorStop(0.5, "#6842a1");
            magic.addColorStop(1, "#33204f");

            ctx.fillStyle = magic;
            ctx.beginPath();
            ctx.moveTo(x-15, y-7);
            ctx.lineTo(x-12, y-45);
            ctx.lineTo(x+12, y-45);
            ctx.lineTo(x+15, y-7);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = "#d6b2ff";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Tower roof
            ctx.fillStyle = "#472a75";
            ctx.beginPath();
            ctx.moveTo(x-21, y-43);
            ctx.lineTo(x, y-66);
            ctx.lineTo(x+21, y-43);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = "#c5a1ff";
            ctx.stroke();

            // Glowing crystal
            ctx.shadowColor = "#c18aff";
            ctx.shadowBlur = 20;

            ctx.fillStyle = "#e1c4ff";
            ctx.beginPath();
            ctx.moveTo(x, y-57);
            ctx.lineTo(x+8, y-45);
            ctx.lineTo(x, y-34);
            ctx.lineTo(x-8, y-45);
            ctx.closePath();
            ctx.fill();

            ctx.shadowBlur = 0;

            // Magic windows
            ctx.fillStyle = "#b5e7ff";
            ctx.fillRect(x-9, y-27, 5, 9);
            ctx.fillRect(x+4, y-27, 5, 9);
        }

        // CANNON TOWER
        else if (tower.name === "Cannon") {

            // Stone tower
            ctx.fillStyle = "#747d83";
            ctx.fillRect(x-18, y-38, 36, 34);

            ctx.strokeStyle = "#d5d9d7";
            ctx.lineWidth = 2;
            ctx.strokeRect(x-18, y-38, 36, 34);

            // Battlements
            ctx.fillStyle = "#9ca4a7";

            for (let i = -18; i <= 12; i += 15) {
                ctx.fillRect(x+i, y-46, 10, 10);
            }

            // Cannon base
            ctx.fillStyle = "#754522";
            ctx.beginPath();
            ctx.arc(x, y-31, 13, 0, Math.PI * 2);
            ctx.fill();

            // Cannon barrel
            const bronze = ctx.createLinearGradient(
                x-10, y-45, x+10, y-45
            );

            bronze.addColorStop(0, "#674322");
            bronze.addColorStop(0.5, "#e5b35b");
            bronze.addColorStop(1, "#664021");

            ctx.fillStyle = bronze;
            ctx.save();
            ctx.translate(x, y-39);
            ctx.rotate(-Math.PI/4);
            ctx.fillRect(-6, -19, 12, 28);
            ctx.fillStyle = "#36291e";
            ctx.beginPath();
            ctx.arc(0, -19, 6, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();

            // Golden decoration
            ctx.strokeStyle = "#e9c16e";
            ctx.lineWidth = 2;
            ctx.strokeRect(x-14, y-17, 28, 4);
        }
        // Tower level decorations
if (tower.level >= 2) {
    ctx.strokeStyle = "#f4d17e";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(x, y - 20, 29, 0, Math.PI * 2);
    ctx.stroke();
}

if (tower.level >= 3) {
    ctx.fillStyle = "#ffe69a";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    ctx.fillText("★ ★ ★", x, y - 73);
}

        ctx.restore();
    });
}


// DRAW PROJECTILES

function drawProjectiles() {
    projectiles.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = bullet.color;
        ctx.fill();
    });
}

// DRAW GAME


function drawBuildGrid() {
    if (!selectedTower) return;

    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {

            const x = col * GRID_SIZE + 25;
            const y = row * GRID_SIZE + 25;

            if (!isBuildableCell(x, y)) continue;

            ctx.fillStyle = "rgba(100, 255, 120, 0.13)";
            ctx.fillRect(
                col * GRID_SIZE,
                row * GRID_SIZE,
                GRID_SIZE,
                GRID_SIZE
            );

            ctx.strokeStyle = "rgba(180, 255, 180, 0.65)";
            ctx.lineWidth = 2;

            ctx.strokeRect(
                col * GRID_SIZE + 2,
                row * GRID_SIZE + 2,
                GRID_SIZE - 4,
                GRID_SIZE - 4
            );

            ctx.fillStyle = "#baffae";
            ctx.font = "bold 20px Arial";
            ctx.textAlign = "center";
            ctx.fillText("+", x, y + 7);
        }
    }

    ctx.textAlign = "left";
}

function drawGame() {
    drawBackground();
    drawBuildGrid();
    drawTowers();
    drawEnemies();
    drawProjectiles();
}


// PATH MOVEMENT

function getPathLength() {
    let length = 0;

    for (let i = 0; i < path.length - 1; i++) {
        const dx = path[i + 1].x - path[i].x;
        const dy = path[i + 1].y - path[i].y;

        length += Math.hypot(dx, dy);
    }

    return length;
}

function moveEnemy(enemy, dt) {
    let distance = enemy.speed * dt;

    while (distance > 0 && enemy.segment < path.length - 1) {
        const target = path[enemy.segment + 1];

        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const remaining = Math.hypot(dx, dy);

        if (remaining <= distance) {
            enemy.x = target.x;
            enemy.y = target.y;
            distance -= remaining;
            enemy.segment++;
        } else {
            enemy.x += (dx / remaining) * distance;
            enemy.y += (dy / remaining) * distance;
            distance = 0;
        }
    }

    if (enemy.segment >= path.length - 1) {
        enemy.reachedEnd = true;
    }
}

// CREATE ENEMY

function createEnemy() {
    const hp = 60 + wave * 20;

    enemies.push({
        x: path[0].x,
        y: path[0].y,
        hp: hp,
        maxHp: hp,
        speed: 55 + Math.min(wave * 2, 30),
        segment: 0,
        reachedEnd: false,
        progress: 0
    });
}

// START WAVE

function startWave() {
    if (gameOver || waveActive) return;

    wave++;
    waveRemaining = 5 + wave * 2;
    spawnTimer = 0;

    waveActive = true;

    showMessage("Wave " + wave + " is coming!");

    updateUI();
}

// PLACE TOWER

function placeTower(x, y) {
    if (!selectedTower) {
        showMessage("Choose a tower first!");
        return;
    }

    const type = towerTypes[selectedTower];

    if (gold < type.cost) {
        showMessage("Not enough gold!");
        return;
    }

    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lengthSquared = dx * dx + dy * dy;

        let t = ((x-a.x)*dx + (y-a.y)*dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));

        const nx = a.x + t * dx;
        const ny = a.y + t * dy;

        if (Math.hypot(x-nx, y-ny) < 65) {
            showMessage("You cannot build on the road!");
            return;
        }
    }

    for (const tower of towers) {
        if (Math.hypot(x-tower.x, y-tower.y) < 55) {
            showMessage("Too close to another tower!");
            return;
        }
    }

    gold -= type.cost;

    const tower = {
        x,
        y,
        name: type.name,
        icon: type.icon,
        level: 1,
        invested: type.cost,
        range: type.range,
        damage: type.damage,
        cooldown: type.cooldown,
        timer: 0
    };

    towers.push(tower);
    selectedTower = null;

    document.querySelectorAll(".tower-card").forEach(card => {
        card.style.borderColor = "#a98242";
    });

    updateUI();
    showMessage(type.name + " Tower built!");
}

// TOWER SHOOTING

function updateTowers(dt) {
    towers.forEach(tower => {
        tower.timer -= dt;

        if (tower.timer > 0) return;

        let target = null;
        let highestProgress = -1;

        enemies.forEach(enemy => {
            const distance = Math.hypot(
                enemy.x - tower.x,
                enemy.y - tower.y
            );

            if (
                distance <= tower.range &&
                !enemy.reachedEnd &&
                enemy.hp > 0 &&
                enemy.progress > highestProgress
            ) {
                target = enemy;
                highestProgress = enemy.progress;
            }
        });

        if (target) {
            projectiles.push({
                x: tower.x,
                y: tower.y,
                target: target,
                damage: tower.damage,
                speed: 350,
                color: tower.name === "Mage" ? "#b77cff" :
                       tower.name === "Cannon" ? "#ff9d42" :
                       "#ffe18a"
            });

            tower.timer = tower.cooldown;
        }
    });
}

// UPDATE PROJECTILES

function updateProjectiles(dt) {
    projectiles.forEach(bullet => {
        const target = bullet.target;

        if (!enemies.includes(target) || target.hp <= 0) {
            bullet.remove = true;
            return;
        }

        const dx = target.x - bullet.x;
        const dy = target.y - bullet.y;
        const distance = Math.hypot(dx, dy);

        const movement = bullet.speed * dt;

        if (distance <= movement + 9) {
            target.hp -= bullet.damage;
            bullet.remove = true;

            if (target.hp <= 0) {
                gold += 15;
                showMessage("Monster defeated! +15 gold");
                updateUI();
            }
        } else {
            bullet.x += (dx / distance) * movement;
            bullet.y += (dy / distance) * movement;
        }
    });

    projectiles = projectiles.filter(b => !b.remove);
}

// GAME UPDATE

function updateGame(dt) {
    if (waveActive && waveRemaining > 0) {
        spawnTimer -= dt;

        if (spawnTimer <= 0) {
            createEnemy();
            waveRemaining--;
            spawnTimer = 1.2;
        }
    }

    enemies.forEach(enemy => {
        if (!enemy.reachedEnd) {
            moveEnemy(enemy, dt);
            enemy.progress = enemy.segment +
                Math.hypot(
                    enemy.x - path[enemy.segment].x,
                    enemy.y - path[enemy.segment].y
                ) / 300;
        }
    });

    enemies.forEach(enemy => {
        if (enemy.reachedEnd && !enemy.processed) {
            enemy.processed = true;
            lives--;
            updateUI();
            showMessage("A monster reached your castle!");
        }
    });

    enemies = enemies.filter(enemy =>
        !enemy.reachedEnd && enemy.hp > 0
    );

    updateTowers(dt);
    updateProjectiles(dt);

    // End of wave
    if (
        waveActive &&
        waveRemaining === 0 &&
        enemies.length === 0
    ) {
        waveActive = false;
        gold += 50;
        updateUI();
        showMessage("Wave completed! Bonus: 50 gold!");
    }

    if (lives <= 0) {
        lives = 0;
        gameOver = true;
        waveActive = false;
        updateUI();
        showMessage("GAME OVER! Your kingdom has fallen.");
    }
}

// MAIN GAME LOOP

let lastTime = 0;

function gameLoop(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    dt = Math.min(dt, 0.05);

    if (!paused && !gameOver) {
        updateGame(dt * speed);
    }

    drawGame();

    requestAnimationFrame(gameLoop);
}

// SELECT TOWER

document.querySelectorAll(".tower-card").forEach(card => {
    card.addEventListener("click", () => {
        selectedTower = card.dataset.tower;

        document.querySelectorAll(".tower-card").forEach(item => {
            item.style.borderColor = "#a98242";
        });

        card.style.borderColor = "#fff1a8";

        showMessage(
            towerTypes[selectedTower].name +
            " selected. Click on the grass to build!"
        );
    });
});

// CLICK CANVAS TO BUILD


canvas.addEventListener("click", event => {
    if (paused || gameOver) return;

    const rect = canvas.getBoundingClientRect();

    const x = (event.clientX - rect.left) *
        (canvas.width / rect.width);

    const y = (event.clientY - rect.top) *
        (canvas.height / rect.height);

    // Select existing tower
    const clickedTower = [...towers].reverse().find(tower =>
        Math.hypot(x - tower.x, y - tower.y) < 27
    );

    if (clickedTower) {
        selectTower(clickedTower);
        return;
    }

    // Build on grid
    if (selectedTower) {
        const cell = getGridCenter(x, y);

        if (!isBuildableCell(cell.x, cell.y)) {
            showMessage("This building spot is unavailable!");
            return;
        }

        placeTower(cell.x, cell.y);
        return;
    }

    activeTower = null;
    towerPanel.hidden = true;
    showMessage("Choose a tower or select an existing tower!");
});

// BUTTON EVENTS

startButton.addEventListener("click", startWave);

pauseButton.addEventListener("click", () => {
    if (gameOver) return;

    paused = !paused;

    pauseButton.textContent = paused ?
        "▶ RESUME" : "⏸ PAUSE";

    showMessage(paused ? "Game paused!" : "Game resumed!");
});

speedButton.addEventListener("click", () => {
    speed = speed === 1 ? 2 : 1;

    speedButton.textContent = "⏩ SPEED x" + speed;
});
// TOWER PANEL

const towerPanel = document.getElementById("towerPanel");
const towerTitle = document.getElementById("towerTitle");
const towerLevel = document.getElementById("towerLevel");
const towerDamage = document.getElementById("towerDamage");
const towerRange = document.getElementById("towerRange");
const towerSpeed = document.getElementById("towerSpeed");
const upgradeButton = document.getElementById("upgradeTower");
const sellButton = document.getElementById("sellTower");
const closeButton = document.getElementById("closeTower");
const upgradeInfo = document.getElementById("towerUpgradeInfo");

function selectTower(tower) {
    activeTower = tower;
    selectedTower = null;

    towerPanel.hidden = false;
    updateTowerPanel();

    showMessage(tower.name + " selected!");
}

function updateTowerPanel() {
    if (!activeTower) return;

    const tower = activeTower;
    const cost = upgradeCosts[tower.level + 1];

    towerTitle.textContent = tower.icon + " " + tower.name;
    towerLevel.textContent = "LEVEL " + tower.level;

    towerDamage.textContent = tower.damage;
    towerRange.textContent = tower.range;
    towerSpeed.textContent = tower.cooldown.toFixed(2) + "s";

    if (tower.level >= 3) {
        upgradeButton.disabled = true;
        upgradeButton.textContent = "MAX LEVEL";
        upgradeInfo.textContent = "Maximum level reached!";
    } else {
        upgradeButton.disabled = gold < cost;
        upgradeButton.textContent = "⬆ UPGRADE - " + cost + " GOLD";

        upgradeInfo.textContent =
            "Next level: more damage, range and attack speed.";
    }
}

function upgradeSelectedTower() {
    if (!activeTower || activeTower.level >= 3) return;

    const tower = activeTower;
    const nextLevel = tower.level + 1;
    const cost = upgradeCosts[nextLevel];

    if (gold < cost) {
        showMessage("Not enough gold!");
        return;
    }

    gold -= cost;
    tower.invested += cost;
    tower.level = nextLevel;

    if (nextLevel === 2) {
        tower.damage = Math.round(tower.damage * 1.6);
        tower.range = Math.round(tower.range * 1.15);
        tower.cooldown *= 0.8;
    }

    if (nextLevel === 3) {
        tower.damage = Math.round(tower.damage * 1.5625);
        tower.range = Math.round(tower.range * 1.2);
        tower.cooldown *= 0.75;
    }

    updateUI();
    updateTowerPanel();

    showMessage(tower.name + " upgraded to Level " + nextLevel + "!");
}

function sellSelectedTower() {
    if (!activeTower) return;

    const refund = Math.floor(activeTower.invested * 0.7);

    towers = towers.filter(tower => tower !== activeTower);

    gold += refund;

    activeTower = null;
    towerPanel.hidden = true;

    updateUI();

    showMessage("Tower sold! +" + refund + " gold");
}

upgradeButton.addEventListener("click", upgradeSelectedTower);

sellButton.addEventListener("click", sellSelectedTower);

closeButton.addEventListener("click", () => {
    activeTower = null;
    towerPanel.hidden = true;
});

// Refresh upgrade button when gold changes
const originalUpdateUI = updateUI;

updateUI = function() {
    originalUpdateUI();

    if (activeTower) {
        updateTowerPanel();
    }
};
// INITIALIZE

updateUI();
showMessage("Choose a tower and prepare your defense!");

requestAnimationFrame(gameLoop);
