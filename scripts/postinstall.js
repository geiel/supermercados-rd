// scripts/postinstall.js
// This script packages Chromium for Vercel deployment

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const Sentry = require('@sentry/nextjs');

const publicDir = path.join(__dirname, '..', 'public');
const outputPath = path.join(publicDir, 'chromium-pack.tar');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Only run in CI/build environment, skip in local development
if (process.env.CI || process.env.VERCEL) {
  try {
    console.log('📦 Packaging Chromium for Vercel...');
    
    // Get the path to the chromium module
    const chromiumPath = path.dirname(require.resolve('@sparticuz/chromium'));
    const binPath = path.join(chromiumPath, 'bin');
    
    // Create tar archive
    execSync(`tar -cf "${outputPath}" -C "${binPath}" .`, { stdio: 'inherit' });
    
    console.log('✅ Chromium packaged successfully!');
  } catch (error) {
    Sentry.logger.error('❌ Failed to package Chromium:', { error: error.message });
    // Don't fail the build if packaging fails - the remote URL will be used as fallback
  }
} else {
  console.log('⏭️  Skipping Chromium packaging (local development)');
}
