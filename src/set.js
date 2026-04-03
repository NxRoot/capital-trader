const { writeFileSync } = require('fs')
const { configPath, conf } = require('./utils/constant')

const key = process.argv[3]
const val = process.argv[4]

const config = conf()
config[key] = val

writeFileSync(configPath, JSON.stringify(config, null, 2))
console.log(`\nVariable '${key}' set to '${val}'\n`)
