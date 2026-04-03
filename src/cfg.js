const { configPath, conf } = require('./utils/constant');
const config = conf(["optional"]);
delete config.strategyCode;
console.log("")
console.log(`Config File: ${configPath}`)
console.log("")
console.log(config)
console.log("")
