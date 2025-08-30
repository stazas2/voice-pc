// Простой скрипт для создания базовой иконки для трея
const fs = require('fs');
const path = require('path');

// Создаем простую SVG иконку
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="30" fill="#4CAF50" stroke="#2E7D32" stroke-width="2"/>
  <path d="M20 32 L28 40 L44 24" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="32" y="18" text-anchor="middle" fill="white" font-family="Arial" font-size="10" font-weight="bold">VOICE</text>
  <text x="32" y="52" text-anchor="middle" fill="white" font-family="Arial" font-size="8">PC</text>
</svg>`;

// Сохраняем SVG
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

fs.writeFileSync(path.join(assetsDir, 'tray-icon.svg'), svgIcon);

console.log('Создана иконка assets/tray-icon.svg');
console.log('Для полноценной работы нужно конвертировать в .ico файл через онлайн конвертер');
console.log('Например: https://convertio.co/svg-ico/');