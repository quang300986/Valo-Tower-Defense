
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
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = "#60452d";
        ctx.fill();

        ctx.lineWidth = 3;
        ctx.strokeStyle = "#e7c477";
        ctx.stroke();

        ctx.font = "27px Arial";
        ctx.textAlign = "center";
        ctx.fillText(tower.icon, tower.x, tower.y + 9);

        // Selected tower range
        if (tower === towers[towers.length - 1] &&
            selectedTower === null) {
            // No range shown by default
        }
    });

    ctx.textAlign = "left";
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

function drawGame() {
    drawBackground();
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

    // Keep towers away from the road
    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];

        const dx = b.x - a.x;
        const dy = b.y - a.y;

        const lengthSquared = dx * dx + dy * dy;

        let t = (
            (x - a.x) * dx + (y - a.y) * dy
        ) / lengthSquared;

        t = Math.max(0, Math.min(1, t));

        const nearestX = a.x + t * dx;
        const nearestY = a.y + t * dy;

        if (Math.hypot(x - nearestX, y - nearestY) < 65) {
            showMessage("You cannot build on the road!");
            return;
        }
    }

    // Keep towers separated
    for (const tower of towers) {
        if (Math.hypot(x - tower.x, y - tower.y) < 55) {
            showMessage("Too close to another tower!");
            return;
        }
    }

    gold -= type.cost;

    towers.push({
        x,
        y,
        name: type.name,
        icon: type.icon,
        range: type.range,
        damage: type.damage,
        cooldown: type.cooldown,
        timer: 0
    });

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

    placeTower(x, y);
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

// INITIALIZE

updateUI();
showMessage("Choose a tower and prepare your defense!");

requestAnimationFrame(gameLoop);
