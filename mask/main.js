const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const brushSizeInput = document.getElementById('brushSize');
const brushValue = document.getElementById('brushValue');
const sliderGroup = document.getElementById('sliderGroup');
const canvasContainer = document.getElementById('canvasContainer');
const imageCanvas = document.getElementById('imageCanvas');
const drawCanvas = document.getElementById('drawCanvas');
const outputCanvas = document.getElementById('outputCanvas');
const outputSection = document.getElementById('outputSection');
const downloadLink = document.getElementById('downloadLink');
const tip = document.getElementById('tip');

const imageCtx = imageCanvas.getContext('2d');
const drawCtx = drawCanvas.getContext('2d');
const outputCtx = outputCanvas.getContext('2d');

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let brushSize = 30;
let imageLoaded = false;
let canvasScale = 1;

selectBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => initCanvas(img);
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

function initCanvas(img) {
  const { width, height } = img;
  
  // 设置实际画布大小（原图尺寸）
  const maxWidth = canvasContainer.clientWidth;
  console.log(canvasContainer.clientWidth)
  canvasScale = maxWidth / width;
  const displayWidth = width * canvasScale;
  const displayHeight = height * canvasScale;

  imageCanvas.width = width;
  imageCanvas.height = height;
  drawCanvas.width = width;
  drawCanvas.height = height;
  outputCanvas.width = width;
  outputCanvas.height = height;
  
  // 绘制原图
  imageCtx.drawImage(img, 0, 0);
  
  // 清空绘制层
  drawCtx.clearRect(0, 0, img.width, img.height);
  
  // 初始化输出为纯黑
  outputCtx.fillStyle = '#000000';
  outputCtx.fillRect(0, 0, img.width, img.height);
  
  // 显示控件
  sliderGroup.style.display = 'block';
  clearBtn.disabled = false;
  exportBtn.disabled = false;
  tip.textContent = '在图片上涂抹要标记的区域';
  outputSection.style.display = 'none';
  imageLoaded = true;
  
}

brushSizeInput.addEventListener('input', (e) => {
  brushSize = parseInt(e.target.value);
  brushValue.textContent = brushSize;
});

function getPos(e) {
  const rect = drawCanvas.getBoundingClientRect();
  const scaleX = drawCanvas.width / rect.width;
  const scaleY = drawCanvas.height / rect.height;
  
  let clientX, clientY;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function drawPoint(x, y) {
  const size = brushSize / canvasScale;
  
  // 显示层 - 半透明红色
  drawCtx.beginPath();
  drawCtx.arc(x, y, size / 2, 0, Math.PI * 2);
  drawCtx.fillStyle = 'rgba(255, 80, 80, 0.5)';
  drawCtx.fill();
  
  // 遮罩层 - 白色
  outputCtx.beginPath();
  outputCtx.arc(x, y, size / 2, 0, Math.PI * 2);
  outputCtx.fillStyle = '#ffffff';
  outputCtx.fill();
}

function drawLine(x1, y1, x2, y2) {
  const size = brushSize / canvasScale;
  
  // 显示层
  drawCtx.beginPath();
  drawCtx.moveTo(x1, y1);
  drawCtx.lineTo(x2, y2);
  drawCtx.strokeStyle = 'rgba(255, 80, 80, 0.5)';
  drawCtx.lineWidth = size;
  drawCtx.lineCap = 'round';
  drawCtx.lineJoin = 'round';
  drawCtx.stroke();
  
  // 遮罩层
  outputCtx.beginPath();
  outputCtx.moveTo(x1, y1);
  outputCtx.lineTo(x2, y2);
  outputCtx.strokeStyle = '#ffffff';
  outputCtx.lineWidth = size;
  outputCtx.lineCap = 'round';
  outputCtx.lineJoin = 'round';
  outputCtx.stroke();
}

function startDraw(e) {
  if (!imageLoaded) return;
  e.preventDefault();
  isDrawing = true;
  const pos = getPos(e);
  lastX = pos.x;
  lastY = pos.y;
  drawPoint(pos.x, pos.y);
}

function moveDraw(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const pos = getPos(e);
  drawLine(lastX, lastY, pos.x, pos.y);
  lastX = pos.x;
  lastY = pos.y;
}

function endDraw(e) {
  if (e) e.preventDefault();
  isDrawing = false;
}

// 鼠标事件
drawCanvas.addEventListener('mousedown', startDraw);
drawCanvas.addEventListener('mousemove', moveDraw);
drawCanvas.addEventListener('mouseup', endDraw);
drawCanvas.addEventListener('mouseleave', endDraw);

// 触摸事件
drawCanvas.addEventListener('touchstart', startDraw, { passive: false });
drawCanvas.addEventListener('touchmove', moveDraw, { passive: false });
drawCanvas.addEventListener('touchend', endDraw, { passive: false });
drawCanvas.addEventListener('touchcancel', endDraw, { passive: false });

clearBtn.addEventListener('click', () => {
  if (!imageLoaded) return;
  
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  outputCtx.fillStyle = '#000000';
  outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  outputSection.style.display = 'none';
});

exportBtn.addEventListener('click', () => {
  if (!imageLoaded) return;
  
  outputSection.style.display = 'block';
  downloadLink.href = outputCanvas.toDataURL('image/png');
  outputSection.scrollIntoView({ behavior: 'smooth' });
});