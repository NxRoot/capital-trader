const { join } = require('path');
const { existsSync, readFileSync, mkdirSync, copyFileSync } = require('fs');
const { homedir } = require('os');

const dat = x => x ? new Date(x) : new Date()
const log = (x, y) => `\x1b[0m${dat(y).toLocaleTimeString()}\x1b[0m ${x}\x1b[0m`
const red = (x, y) => `\x1b[0m${dat(y).toLocaleTimeString()}\x1b[31m ${x}\x1b[0m`
const green = (x, y) => `\x1b[0m${dat(y).toLocaleTimeString()}\x1b[32m ${x}\x1b[0m`
const yellow = (x, y) => `\x1b[0m${dat(y).toLocaleTimeString()}\x1b[33m ${x}\x1b[0m`
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const configDir = join(homedir(), '.capital');
const configPath = join(configDir, 'config.json');

const missing  = (keys) => {
    console.log("")
    console.log("\x1b[31mMISSING CAPITAL CREDENTIALS\x1b[0m\n")
    console.log(`Config File: ${configPath}`)
    console.log("")
    for(const key of keys) console.log(`\x1b[33m${key}\x1b[0m is required but not set.`)
    console.log("")
    for(const key of keys) console.log(`Set it with: \x1b[32mcapital --set ${key} YOUR_${key.toUpperCase()}\x1b[0m`)
    console.log("")
    process.exit(0);
}

const conf = (required = []) => {
    if (!existsSync(configPath)) {
        mkdirSync(configDir, { recursive: true });
        copyFileSync(join(__dirname, '..', '..', 'config.json'), configPath);
    }
    const res = JSON.parse(readFileSync(configPath, 'utf-8'));
    if(!required?.every(k => res?.[k])) {
        missing(required)
    }
    return res;
}

module.exports = { dat, log, red, green, yellow, delay, conf, configDir, configPath }
