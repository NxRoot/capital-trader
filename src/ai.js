process.removeAllListeners('warning');

const { test } = require('./utils/testing');
const { makePrompt, callAnthropic } = require('./utils/generate');
const { join } = require('path');
const { writeFileSync, copyFileSync, unlinkSync } = require('fs');
const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
const { delay, conf, configDir, configPath } = require('./utils/constant');


// ##################################################
// #                 Global Variables               #
// ##################################################

const config = conf(["anthropicKey"]);
const backupPath = join(configDir, 'config-backup.json');
const tokens = { apiKey: config?.apiKey }

const text = process.argv.slice(2).join(' ');
const initial = config.strategyCode;
let retries = Number(config.retries) || 3;


// ##################################################
// #                     Ask AI                     #
// ##################################################

const generate = async (prev) => {
    const request = await callAnthropic(config, [
        { role: "user", content: makePrompt(config) },
        { role: "user", content: text }
    ]);
    if(request?.code) {
        config.strategyCode = request?.code;
        const stats = await test(tokens, config, prev.login);
        if((stats?.profit > prev?.profit && stats?.profit > 0 && stats?.profit > stats?.drawdown) || retries <= -3 || Number(config.retries) === 0) {
            return request?.response;
        } else {
            retries--;
            config.strategyCode = retries <= 0 ? initial : request?.code;
            await delay(3000);
            return await generate(prev);
        }
    }
    return null;
}


// ##################################################
// #                   Initialize                   #
// ##################################################

const main = async () => {

    const stats = await test(tokens, config);

    console.log("\nGenerating strategy, please wait...\n");

    const response = await generate(stats);

    console.log(response);

    copyFileSync(configPath, backupPath);
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    await delay(1000);

    require('./test')

    await delay(3000);
    
    // ask user if wants to keep this strategy using readline
    rl.question("Do you want to keep this strategy? (y/n): ", (answer) => {
        if(!(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes" || answer.toLowerCase() === "ok")){
            unlinkSync(configPath);
            copyFileSync(backupPath, configPath);
            unlinkSync(backupPath);
        }
        process.exit(0);
    });
}

main();