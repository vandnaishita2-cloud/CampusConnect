const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname);

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(file => {
    if (file === '.git' || file === 'node_modules' || file === 'campusconnect.db' || file === 'campusconnect.db-journal') return;
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.relative(dir, fullPath).replace(/\\/g, '/'));
    }
  });

  return arrayOfFiles;
}

(async () => {
  try {
    console.log('1. Initializing Git repository in:', dir);
    await git.init({ fs, dir, defaultBranch: 'main' });
    console.log('   Initialized .git successfully!');

    console.log('2. Staging files...');
    const files = getAllFiles(dir);
    for (const f of files) {
      await git.add({ fs, dir, filepath: f });
    }
    console.log(`   Staged ${files.length} files.`);

    console.log('3. Creating initial commit...');
    const sha = await git.commit({
      fs,
      dir,
      author: {
        name: 'vandnaishita2-cloud',
        email: 'vandnaishita2@users.noreply.github.com'
      },
      message: 'Initial commit: CampusConnect Student Management Portal'
    });
    console.log('   Commit created with SHA:', sha);

    // Add remote
    console.log('4. Configuring remote origin...');
    await git.addRemote({
      fs,
      dir,
      remote: 'origin',
      url: 'https://github.com/vandnaishita2-cloud/CampusConnect.git',
      force: true
    });
    console.log('   Remote origin set to https://github.com/vandnaishita2-cloud/CampusConnect.git');

    console.log('\nLocal Git repository is fully initialized and committed!');
  } catch (err) {
    console.error('Git task error:', err);
    process.exit(1);
  }
})();
