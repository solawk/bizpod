const canv = el("canv");
const ctx = canv.getContext("2d");

const dpr = window.devicePixelRatio || 1;
const h = Math.min(window.innerWidth, window.innerHeight) * dpr;
const w = h;
canv.style.width = w / dpr + "px";
canv.style.height = h / dpr + "px";
canv.width = w;
canv.height = h;
const pi2 = 2 * Math.PI;

let timestamp = 0;

const gunpodSize = w * 0.35;
const gunpodMaxShift = 0.08;
const gunpodImgs = [
    img("assembly.png"),
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    img("assembly.png"),
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    img("gunpodPod.png"),
    img("gunpodPod.png"),
    img("gunpodPylon.png"),
    img("gunpodPylon.png"),
    img("gunpodPodFar.png"),
];
const barrelsImgs = [
    img("muzzle.png"),
    img("barrel.png"),
    img("barrel.png"),
    img("barrel.png"),
    img("barrel.png"),
    img("barrel.png"),
    img("barrel.png"),
    img("barrelFar.png"),
    null,
    img("barrel.png"),
    img("barrel.png"),
    img("barrel.png"),
    img("barrel.png"),
    img("barrel.png"),
    img("barrel.png"),
    img("barrelFar.png"),
    null,
    null,
    null,
    null,
    null
];
const barrelDistance = w * 0.04;
let pressed = false;
const shift = {x: 0, y: 0};

let startTouch = null;
let prevTouch = null;
let phase = 0;
let vel = 0; // radians per second
let lastSpinTime = 0;
let rpm = null;

let decelLvl = -1;
let decel = 1;
const decelUp = 0.8;
let decelPrice = 3;
const decelPriceUp = 1.7;
const decelLvlSpan = el("decelLvlSpan");
const decelPriceSpan = el("decelPriceSpan");

let accelLvl = -1;
let accel = 1;
const accelUp = 1.15;
let accelPrice = 30;
const accelPriceUp = 1.5;
const accelLvlSpan = el("accelLvlSpan");
const accelPriceSpan = el("accelPriceSpan");

let autoLvl = -1;
let auto = 0;
const autoUp = 0.2;
let autoPrice = 300;
const autoPriceUp = 2;
const autoLvlSpan = el("autoLvlSpan");
const autoPriceSpan = el("autoPriceSpan");

const decelTd = el("decelTd");
const accelTd = el("accelTd");
const autoTd = el("autoTd");

decelTd.style.display = "none";
accelTd.style.display = "none";
autoTd.style.display = "none";

const nyaImg = img("nya.png");
const nyaSize = w * 0.1;
let nyas = [];
let score = 0;

function render()
{
    const timeNow = Date.now();
    const dt = (timeNow - timestamp) / 1000;
    ctx.clearRect(0, 0, w, h);

    // Nyas
    for (const nya of nyas)
    {
        nya.x += nya.vx * dt;
        nya.y += nya.vy * dt;

        nya.vx *= 1 - 5 * dt;
        nya.vy *= 1 - 5 * dt;

        const opacity = nya.life > 1 ? 100 : (nya.life * 100);
        ctx.filter = "opacity(" + opacity + "%)";
        ctx.drawImage(nyaImg, nya.x - nyaSize / 2, nya.y - nyaSize / 2, nyaSize, nyaSize);
        ctx.filter = "none";
        nya.life -= dt;
    }

    nyas = nyas.filter((nya) => nya.life > 0);

    vel *= 1 - decel * dt;
    if (!pressed)
    {
        shift.x *= 1 - 2 * dt;
        shift.y *= 1 - 2 * dt;
    }
    phase += vel * dt;
    const spins = phase / pi2;
    if (Math.abs(spins) > 1)
    {
        phase -= Math.abs(Math.floor(spins)) * pi2 * Math.sign(spins);
        score += Math.floor(Math.abs(spins));
        spawnNya();

        const timePerSpin = timeNow - lastSpinTime;
        if (timePerSpin < 1000)
            rpm = Math.floor(60000 * Math.abs(spins) / timePerSpin);
        else
            rpm = null;

        lastSpinTime = timeNow;

        if (decelLvl === -1 && score >= decelPrice)
        {
            decelTd.style.display = "table-cell";
            decelLvl = 0;
        }

        if (accelLvl === -1 && score >= accelPrice)
        {
            accelTd.style.display = "table-cell";
            accelLvl = 0;
        }

        if (autoLvl === -1 && score >= autoPrice)
        {
            autoTd.style.display = "table-cell";
            autoLvl = 0;
        }
    }

    // Gunpod
    for (let i = gunpodImgs.length - 1; i >= 0; i--)
    {
        if (i === gunpodImgs.length - 1)
        {
            ctx.shadowColor = "black";
            ctx.shadowBlur = 50;
        }
        else
        {
            ctx.shadowBlur = 0;
        }

        const size = 1.8 - 0.035 * i;

        const gunpodImg = gunpodImgs[i];

        const sm = 1 - 2 * (i / gunpodImgs.length);

        ctx.save();
        ctx.translate(w / 2 + shift.x * sm, h / 2 + shift.y * sm);
        if (gunpodImg) ctx.drawImage(gunpodImg, -gunpodSize * size / 2, -gunpodSize * size / 2, gunpodSize * size, gunpodSize * size);
        if (barrelsImgs[i] != null)
        {
            const barrelImg = barrelsImgs[i];
            for (let j = 0; j < 6; j++)
            {
                const angle = j * (pi2 / 6) + phase;
                const bX = Math.cos(angle) * barrelDistance;
                const bY = Math.sin(angle) * barrelDistance;
                ctx.drawImage(barrelImg, (-gunpodSize / 2 + bX) * size, (-gunpodSize / 2 + bY) * size, gunpodSize * size, gunpodSize * size);
            }
        }
        ctx.restore();
    }

    rollAuto(dt);

    ctx.shadowColor = "black";
    ctx.shadowBlur = 25;
    ctx.fillStyle = "white";
    ctx.font = w * 0.06 + "px Courier New bold";
    ctx.textAlign = "center";
    ctx.fillText(score, w / 2, h * 0.1);

    ctx.font = w * 0.04 + "px Courier New bold";
    if (rpm != null)
        ctx.fillText(rpm + " об/мин", w / 2, h * 0.16);
    if (vel === 0)
        ctx.fillText("Крутите пальцем вокруг ганпода", w / 2, h * 0.16);

    ctx.shadowBlur = 0;

    timestamp = timeNow;
    requestAnimationFrame(render);
}

function spawnNya()
{
    const nya = {
        x: w / 2 - 0.03 * w + 0.06 * w * Math.random(),
        y: h / 2 - 0.03 * h + 0.06 * h * Math.random(),
        life: 2 + Math.random(),
        vx: w * (-2 + 4 * Math.random()),
        vy: h * (-2 + 4 * Math.random())
    };

    nyas.push(nya);
}

function buyUp(type)
{
    switch (type)
    {
        case "decel":
            if (score >= decelPrice)
            {
                score -= decelPrice;
                decel *= decelUp;
                decelPrice *= decelPriceUp;
                decelPrice = Math.ceil(decelPrice);
                decelLvl++;
                refreshUpText("decel");
            }
            break;
        case "accel":
            if (score >= accelPrice)
            {
                score -= accelPrice;
                accel *= accelUp;
                accelPrice *= accelPriceUp;
                accelPrice = Math.ceil(accelPrice);
                accelLvl++;
                refreshUpText("accel");
            }
            break;
        case "auto":
            if (score >= autoPrice)
            {
                score -= autoPrice;
                auto += autoUp;
                autoPrice *= autoPriceUp
                autoPrice = Math.ceil(autoPrice);
                autoLvl++;
                refreshUpText("auto");
            }
            break;
    }
}

function refreshUpText(type)
{
    switch (type)
    {
        case "decel":
            decelLvlSpan.innerHTML = decelLvl;
            decelPriceSpan.innerHTML = decelPrice;
            break;
        case "accel":
            accelLvlSpan.innerHTML = accelLvl;
            accelPriceSpan.innerHTML = accelPrice;
            break;
        case "auto":
            autoLvlSpan.innerHTML = autoLvl;
            autoPriceSpan.innerHTML = autoPrice;
            break;
    }
}

function rollAuto(dt)
{
    if (Math.random() < auto * dt)
    {
        vel += Math.sign(vel) * dt * accel * pi2 * 10;
    }
}

canv.ontouchstart = canv.onmousedown = (e) =>
{
    pressed = true;
};

canv.ontouchend = canv.onmouseup = (e) =>
{
    pressed = false;
    startTouch = null;
    prevTouch = null;
};

canv.ontouchmove = window.onmousemove = (e) =>
{
    const t = "touches" in e ? e.touches[0] : e;
    if (!e.hasOwnProperty("touches") && !pressed) return;

    const rect = canv.getBoundingClientRect();
    const rX = t.clientX * dpr - rect.left * dpr - w / 2;
    const rY = t.clientY * dpr - rect.top * dpr - h / 2;
    const mag = Math.sqrt(rX * rX + rY * rY);
    const magRel = mag / (w / 2);

    //ctx.drawImage(nyaImg, rX + w/2, rY + h/2, 100, 100);

    if (prevTouch != null)
    {
        const magA = Math.sqrt(prevTouch.x * prevTouch.x + prevTouch.y * prevTouch.y);
        const magB = mag;
        const dot = prevTouch.x * rX + prevTouch.y * rY;
        const dAngle = Math.acos(dot / (magA * magB));
        const cross = prevTouch.x * rY - prevTouch.y * rX;

        const dv = dAngle * Math.sign(cross) * magRel * accel;

        if (dv)
            vel += dv;
    }

    prevTouch = {x: rX, y: rY};

    if (startTouch == null)
    {
        startTouch = {...prevTouch};
    } else
    {
        shift.x = (rX - startTouch.x) * gunpodMaxShift;
        shift.y = (rY - startTouch.y) * gunpodMaxShift;
    }
};

requestAnimationFrame(render);

function el(id)
{
    return document.getElementById(id);
}

function img(src)
{
    const image = new Image();
    image.src = src;
    return image;
}