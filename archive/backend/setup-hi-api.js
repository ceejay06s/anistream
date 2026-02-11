/**
 * Setup script for hi-api (PacaHat/hi-api)
 * This will clone and set up hi-api locally for testing
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HI_API_REPO = 'https://github.com/PacaHat/hi-api.git';
const HI_API_DIR = path.join(__dirname, 'hi-api');

console.log('═══════════════════════════════════════════════════════');
console.log('  🚀 Setting up hi-api (PacaHat/hi-api)');
console.log('═══════════════════════════════════════════════════════\n');

// Check if already cloned
if (fs.existsSync(HI_API_DIR)) {
  console.log('✅ hi-api directory already exists');
  console.log('   To reinstall, delete the hi-api folder and run this script again\n');
  
  // Check if node_modules exists
  if (fs.existsSync(path.join(HI_API_DIR, 'node_modules'))) {
    console.log('✅ Dependencies already installed');
    console.log('\n💡 To start hi-api:');
    console.log(`   cd ${HI_API_DIR}`);
    console.log('   npm start');
    console.log('\n   Then test with: node test-hi-api-local.js');
  } else {
    console.log('📦 Installing dependencies...');
    try {
      process.chdir(HI_API_DIR);
      execSync('npm install', { stdio: 'inherit' });
      console.log('\n✅ Dependencies installed!');
      console.log('\n💡 To start hi-api:');
      console.log(`   cd ${HI_API_DIR}`);
      console.log('   npm start');
    } catch (error) {
      console.error('❌ Failed to install dependencies:', error.message);
      process.exit(1);
    }
  }
} else {
  console.log('📥 Cloning hi-api repository...');
  try {
    execSync(`git clone ${HI_API_REPO} ${HI_API_DIR}`, { stdio: 'inherit' });
    console.log('✅ Repository cloned successfully\n');
    
    console.log('📦 Installing dependencies...');
    process.chdir(HI_API_DIR);
    execSync('npm install', { stdio: 'inherit' });
    console.log('\n✅ Setup complete!');
    
    console.log('\n💡 To start hi-api:');
    console.log(`   cd ${HI_API_DIR}`);
    console.log('   npm start');
    console.log('\n   Then test with: node test-hi-api-local.js');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n💡 Manual setup:');
    console.log(`   1. git clone ${HI_API_REPO} ${HI_API_DIR}`);
    console.log(`   2. cd ${HI_API_DIR}`);
    console.log('   3. npm install');
    console.log('   4. npm start');
    process.exit(1);
  }
}
