
const userCanvas = document.getElementById('userCanvas');
const ctxUser = userCanvas.getContext('2d');
let drawing = false;
let userStrokes = [];
let currentStroke = [];

ctxUser.lineWidth = 3;
ctxUser.lineCap = 'round';
ctxUser.strokeStyle = '#2d3436';

function getPos(e) {
  if (e.touches && e.touches.length > 0) {
    const rect = userCanvas.getBoundingClientRect();
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  }
  return { x: e.offsetX, y: e.offsetY };
}

userCanvas.addEventListener('mousedown', startDraw);
userCanvas.addEventListener('mousemove', drawLine);
userCanvas.addEventListener('mouseup', endDraw);
userCanvas.addEventListener('mouseout', endDraw);

userCanvas.addEventListener('touchstart', e => { startDraw(e); e.preventDefault(); });
userCanvas.addEventListener('touchmove', e => { drawLine(e); e.preventDefault(); });
userCanvas.addEventListener('touchend', endDraw);

function startDraw(e) {
  drawing = true;
  currentStroke = [];
  const pos = getPos(e);
  currentStroke.push(pos);
}
function drawLine(e) {
  if (!drawing) return;
  const pos = getPos(e);
  currentStroke.push(pos);
  ctxUser.beginPath();
  const last = currentStroke.length > 1 ? currentStroke[currentStroke.length - 2] : currentStroke[0];
  ctxUser.moveTo(last.x, last.y);
  ctxUser.lineTo(pos.x, pos.y);
  ctxUser.stroke();
}
function endDraw(e) {
  if (!drawing) return;
  drawing = false;
  if (currentStroke.length > 1) userStrokes.push(currentStroke.slice());
  currentStroke = [];
}
document.getElementById('clearBtn').onclick = () => {
  ctxUser.clearRect(0, 0, userCanvas.width, userCanvas.height);
  userStrokes = [];
  currentStroke = [];
  setStatus("Canvas cleared. Ready to draw!");
};


const aiCanvas = document.getElementById('aiCanvas');
const ctxAI = aiCanvas.getContext('2d');
ctxAI.lineWidth = 3;
ctxAI.lineCap = 'round';
ctxAI.strokeStyle = '#617692';

const statusDiv = document.getElementById('status');
function setStatus(msg) {
  statusDiv.textContent = msg;
}
setStatus("Loading AI model...");

let modelReady = false;
let model;
ml5.sketchRNN('cat', function() {
  modelReady = true;
  setStatus("AI model loaded. Draw and click 'Draw'.");
  aiClear();
});

function strokesToSketchRNN(strokes) {
  let rnnStrokes = [];
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.length; i++) {
      const dx = stroke[i].x - stroke[i - 1].x;
      const dy = stroke[i].y - stroke[i - 1].y;
      rnnStrokes.push([dx, dy, 0, 0, 0]);
    }
    rnnStrokes.push([0, 0, 0, 1, 0]); 
  }
  return rnnStrokes;
}


function aiClear() {
  ctxAI.clearRect(0, 0, aiCanvas.width, aiCanvas.height);
  paintStrokes = [];
  currentPaintStroke = null;
}


const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
let painting = false;
let paintStrokes = [];
let currentPaintStroke = null;

function getAIPos(e) {
  if (e.touches && e.touches.length > 0) {
    const rect = aiCanvas.getBoundingClientRect();
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  }
  return { x: e.offsetX, y: e.offsetY };
}
aiCanvas.addEventListener('mousedown', e => { startPaint(e); });
aiCanvas.addEventListener('mousemove', e => { paintLine(e); });
aiCanvas.addEventListener('mouseup', endPaint);
aiCanvas.addEventListener('mouseout', endPaint);
aiCanvas.addEventListener('touchstart', e => { startPaint(e); e.preventDefault(); });
aiCanvas.addEventListener('touchmove', e => { paintLine(e); e.preventDefault(); });
aiCanvas.addEventListener('touchend', endPaint);

function startPaint(e) {
  painting = true;
  currentPaintStroke = { color: colorPicker.value, size: brushSize.value, points: [] };
  const pos = getAIPos(e);
  currentPaintStroke.points.push(pos);
}
function paintLine(e) {
  if (!painting || !currentPaintStroke) return;
  const pos = getAIPos(e);
  // Draw line
  ctxAI.strokeStyle = currentPaintStroke.color;
  ctxAI.lineWidth = currentPaintStroke.size;
  ctxAI.lineCap = 'round';
  const last = currentPaintStroke.points.length > 0 ? currentPaintStroke.points[currentPaintStroke.points.length - 1] : pos;
  ctxAI.beginPath();
  ctxAI.moveTo(last.x, last.y);
  ctxAI.lineTo(pos.x, pos.y);
  ctxAI.stroke();
  currentPaintStroke.points.push(pos);
}
function endPaint() {
  if (painting && currentPaintStroke && currentPaintStroke.points.length > 1) {
    paintStrokes.push(currentPaintStroke);
  }
  painting = false;
  currentPaintStroke = null;
}
function redrawPaintStrokes() {
  for (const stroke of paintStrokes) {
    ctxAI.strokeStyle = stroke.color;
    ctxAI.lineWidth = stroke.size;
    ctxAI.beginPath();
    const points = stroke.points;
    ctxAI.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctxAI.lineTo(points[i].x, points[i].y);
    }
    ctxAI.stroke();
  }
}

document.getElementById('drawBtn').onclick = () => {
  if (!modelReady) return setStatus("Please wait, AI is loading...");
  if (userStrokes.length === 0) return setStatus("Draw something first!");
  setStatus("Generating AI sketch...");
  aiClear();
  
  ctxAI.strokeStyle = "#bbb";
  ctxAI.lineWidth = 3;
  for (const stroke of userStrokes) {
    ctxAI.beginPath();
    ctxAI.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      ctxAI.lineTo(stroke[i].x, stroke[i].y);
    }
    ctxAI.stroke();
  }
  ctxAI.strokeStyle = "#617692";
  ctxAI.lineWidth = 3;

  // Prepare input for AI
  const inputStrokes = strokesToSketchRNN(userStrokes);
  model.reset();
  model.feedInput(inputStrokes);

  // Start point for AI drawing:
  let [x, y] = userStrokes.length
    ? [userStrokes[userStrokes.length - 1].slice(-1)[0].x, userStrokes[userStrokes.length - 1].slice(-1)[0].y]
    : [aiCanvas.width / 2, aiCanvas.height / 2];
  let pen = [1, 0, 0]; // pen_down, pen_up, pen_end

  function generateAI() {
    model.generate(pen, function(err, s) {
      if (err) return setStatus("Error in AI generation.");
      const [dx, dy, pen_down, pen_up, pen_end] = s;
      if (pen_end) {
        setStatus("AI sketch complete! Now you can color or download.");
        redrawPaintStrokes();
        return;
      }
      if (pen_down) {
        ctxAI.beginPath();
        ctxAI.moveTo(x, y);
        ctxAI.lineTo(x + dx, y + dy);
        ctxAI.stroke();
      }
      x += dx; y += dy;
      pen = [pen_down, pen_up, pen_end];
      setTimeout(generateAI, 20);
    });
  }
  generateAI();
};
document.getElementById('downloadBtn').onclick = () => {
  const link = document.createElement('a');
  link.download = 'AI_sketch.png';
  link.href = aiCanvas.toDataURL();
  link.click();
};
