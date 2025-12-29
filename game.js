const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");

canvas.width = innerWidth;
canvas.height = innerHeight;

// === IMAGE BALL ===
const img = new Image();
img.src = "0.png";

// === BALL ===
const ball = {
    r: 16,
    speedUp: 0.8
};

// === PLATFORM ===
const platform = {
    w: 130,
    h: 14,
    x: canvas.width / 2 - 65,
    y: canvas.height - 40
};

let targetX = platform.x;

let lives = 3;
let score = 0;
let running = true;
let scoreSaved = false; // ✅ ФЛАГ

// === RESET BALL ===
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 3;
    ball.vx = (Math.random() > 0.5 ? 1 : -1) * 4;
    ball.vy = 6;
}

// === CONTROLS ===
addEventListener("mousemove", e => {
    targetX = e.clientX - platform.w / 2;
});

addEventListener("touchmove", e => {
    targetX = e.touches[0].clientX - platform.w / 2;
}, { passive: true });

// === RANDOM ANGLE ===
function randomAngle() {
    return Math.random() * (Math.PI / 2) + Math.PI / 4;
}

// === SAVE SCORE (ОДИН РАЗ) ===
function saveScore() {
    if (scoreSaved) return;

    const email = localStorage.getItem("email");
    if (!email || score <= 0) return;

    scoreSaved = true;

    fetch("http://localhost:3000/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, score })
    }).catch(() => {});
}

// === GAME LOOP ===
function update() {
    if (!running) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    platform.x += (targetX - platform.x);
    if (platform.x < 0) platform.x = 0;
    if (platform.x + platform.w > canvas.width)
        platform.x = canvas.width - platform.w;

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x - ball.r < 0 || ball.x + ball.r > canvas.width) ball.vx *= -1;
    if (ball.y - ball.r < 0) ball.vy *= -1;

    if (
        ball.y + ball.r >= platform.y &&
        ball.x > platform.x &&
        ball.x < platform.x + platform.w &&
        ball.vy > 0
    ) {
        const speed = Math.hypot(ball.vx, ball.vy) + ball.speedUp;
        const angle = randomAngle();

        ball.vx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
        ball.vy = -Math.sin(angle) * speed;

        score++;
    }

    // ❌ MISS
    if (ball.y - ball.r > platform.y + platform.h) {
        lives--;
        running = false;

        saveScore(); // ✅ ЗАПИС У БД

        if (lives > 0) {
            overlay.style.display = "flex";
        } else {
            location.href = "zagruzka.html";
        }
    }

    // draw ball
    ctx.save();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2);
    ctx.restore();

    ctx.fillStyle = "#fff";
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);

    ctx.font = "bold 26px Arial";
    ctx.fillText("Score: " + score, 20, 40);
    ctx.fillText("❤".repeat(lives), canvas.width - 100, 40);

    requestAnimationFrame(update);
}

// === MENU ===
function resume() {
    overlay.style.display = "none";
    resetBall();
    scoreSaved = false; // ✅ СКИД
    running = true;
    update();
}

function goMenu() {
    location.href = "index.html";
}

img.onload = () => {
    resetBall();
    update();
};