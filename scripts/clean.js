const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const os = require('os');

const outPath = path.join(__dirname, '..', 'out');
console.log(`Cleaning build output directory: ${outPath}`);
try {
    rimraf.sync(outPath);
    console.log('✓ Build output directory cleaned');
} catch (err) {
    console.error('Failed to clean build output directory:', err.message);
}

const testDir = path.join(__dirname, '..', '.vscode-dev-test');
console.log(`Creating clean extension development directory: ${testDir}`);
try {
    if (fs.existsSync(testDir)) {
        rimraf.sync(testDir);
    }
    fs.mkdirSync(testDir, { recursive: true });
    console.log('✓ Clean extension development directory created');
} catch (err) {
    console.warn('Warning: Could not create clean extension development directory:', err.message);
}

const vscodePath = path.join(__dirname, '..', '.vscode-test');
console.log(`Cleaning VS Code test directory: ${vscodePath}`);
try {
    if (process.platform === 'win32') {
        setTimeout(() => {
            rimraf.sync(vscodePath, { 
                force: true,
                maxRetries: 3,
                recursive: true
            });
        }, 1000);
    } else {
        rimraf.sync(vscodePath);
    }
    console.log('✓ VS Code test directory cleaned');
} catch (err) {
    console.warn('Warning: Could not fully clean .vscode-test directory:', err.message);
}

const extensionsCachePaths = [];

// On Windows
if (process.platform === 'win32') {
    extensionsCachePaths.push(path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'CachedExtensionVSIXs'));
    extensionsCachePaths.push(path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'workspaceStorage'));
    extensionsCachePaths.push(path.join(os.homedir(), '.vscode', 'extensions', 'agent-workshop-0.0.3'));
}
// On macOS
else if (process.platform === 'darwin') {
    extensionsCachePaths.push(path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'CachedExtensionVSIXs'));
    extensionsCachePaths.push(path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'workspaceStorage'));
    extensionsCachePaths.push(path.join(os.homedir(), '.vscode', 'extensions', 'agent-workshop-0.0.3'));
}
// On Linux
else if (process.platform === 'linux') {
    extensionsCachePaths.push(path.join(os.homedir(), '.config', 'Code', 'CachedExtensionVSIXs'));
    extensionsCachePaths.push(path.join(os.homedir(), '.config', 'Code', 'User', 'workspaceStorage'));
    extensionsCachePaths.push(path.join(os.homedir(), '.vscode', 'extensions', 'agent-workshop-0.0.3'));
}

// Try to clean cache paths
for (const cachePath of extensionsCachePaths) {
    if (fs.existsSync(cachePath)) {
        console.log(`Cleaning extension cache: ${cachePath}`);
        try {
            if (cachePath.includes('workspaceStorage')) {
                const workspaces = fs.readdirSync(cachePath);
                for (const workspace of workspaces) {
                    const extensionsPath = path.join(cachePath, workspace, 'extensions');
                    if (fs.existsSync(extensionsPath)) {
                        console.log(`  Cleaning workspace storage: ${extensionsPath}`);
                        rimraf.sync(extensionsPath);
                    }
                }
            } else if (cachePath.includes('extensions/agent-workshop')) {
                console.log(`  Removing installed extension: ${cachePath}`);
                rimraf.sync(cachePath);
            } else {
                const files = fs.readdirSync(cachePath);
                for (const file of files) {
                    if (file.includes('agent-workshop') || file.includes('ai-assistant')) {
                        const filePath = path.join(cachePath, file);
                        console.log(`  Removing cached extension file: ${file}`);
                        fs.unlinkSync(filePath);
                    }
                }
            }
            console.log('✓ Extension cache cleaned');
        } catch (err) {
            console.warn(`Warning: Could not clean extension cache: ${err.message}`);
        }
    }
} 