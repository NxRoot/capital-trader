const header = (t) => `\x1b[32m${t}\x1b[0m`

console.log(`
${header("Start bot")}
capital

${header("Show help")}
capital --help

${header("Show strategy")}
capital --code

${header("Test strategy")}
capital --test

${header("Get config path")}
capital --config

${header("Set config value")}
capital --set orderSize 0.005

${header("Reset strategy")}
capital --clear`)