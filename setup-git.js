const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const url = 'https://github.com/git-for-windows/git/releases/download/v2.56.1.windows.1/MinGit-2.56.1-64-bit.zip';
const targetDir = 'C:\\Users\\ishita\\AppData\\Local\\MinGit';
const zipPath = 'C:\\Users\\ishita\\AppData\\Local\\MinGit.zip';

(async () => {
  try {
    console.log('Downloading MinGit from', url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(zipPath, Buffer.from(buffer));
    console.log('Downloaded', buffer.byteLength, 'bytes');

    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    console.log('Extracting to', targetDir);
    execSync(`tar -xf "${zipPath}" -C "${targetDir}"`);
    console.log('Extraction complete!');

    const gitExe = path.join(targetDir, 'cmd', 'git.exe');
    const out = execSync(`"${gitExe}" --version`).toString();
    console.log('Git installed successfully:', out.trim());

    // Clean up zip
    try { fs.unlinkSync(zipPath); } catch (e) {}
  } catch (err) {
    console.error('Error installing MinGit:', err);
    process.exit(1);
  }
})();
