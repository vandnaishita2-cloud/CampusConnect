const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('node:fs');
const path = require('node:path');

const token = process.argv[2] || process.env.GITHUB_TOKEN;
if (!token) {
  console.log('\n❌ Usage: node push.js <YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>');
  console.log('   Or set GITHUB_TOKEN environment variable.\n');
  process.exit(1);
}

const dir = path.join(__dirname);

(async () => {
  try {
    console.log('Pushing to https://github.com/vandnaishita2-cloud/CampusConnect.git ...');
    const pushResult = await git.push({
      fs,
      http,
      dir,
      remote: 'origin',
      ref: 'main',
      onAuth: () => ({ username: token })
    });
    console.log('✅ Push successful!', pushResult);
  } catch (err) {
    console.error('❌ Push failed:', err.message);
    if (err.message.includes('401')) {
      console.error('   Hint: Make sure your GitHub token has the "repo" scope enabled.');
    }
    process.exit(1);
  }
})();
