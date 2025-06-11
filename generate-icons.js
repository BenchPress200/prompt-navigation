// 아이콘 생성 스크립트
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#10a37f"/>
  <!-- 고릴라 얼굴 -->
  <circle cx="64" cy="70" r="35" fill="#654321"/>
  <!-- 눈 -->
  <circle cx="54" cy="60" r="6" fill="white"/>
  <circle cx="74" cy="60" r="6" fill="white"/>
  <circle cx="54" cy="60" r="3" fill="black"/>
  <circle cx="74" cy="60" r="3" fill="black"/>
  <!-- 콧구멍 -->
  <ellipse cx="60" cy="72" rx="3" ry="2" fill="black"/>
  <ellipse cx="68" cy="72" rx="3" ry="2" fill="black"/>
  <!-- 입 -->
  <path d="M54 82 Q64 90 74 82" stroke="black" stroke-width="2" fill="none"/>
  <!-- 귀 -->
  <circle cx="40" cy="55" r="12" fill="#654321"/>
  <circle cx="88" cy="55" r="12" fill="#654321"/>
  <circle cx="40" cy="55" r="6" fill="#8B4513"/>
  <circle cx="88" cy="55" r="6" fill="#8B4513"/>
</svg>`;

const sizes = [16, 48, 128];

async function generateIcons() {
  // SVG 버퍼 생성
  const svgBuffer = Buffer.from(svgContent);

  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, 'icons', `icon${size}.png`));
    
    console.log(`생성됨: icon${size}.png`);
  }
}

generateIcons().catch(console.error);