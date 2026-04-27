#!/usr/bin/env node
const next = require('next')
const http = require('http')
const os = require('os')

const port = process.env.PORT || 5001
const app = next({ dev: false, dir: __dirname })
const handle = app.getRequestHandler()

function getIp() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) { for (const net of nets[name]) { if (net.family === 'IPv4' && !net.internal) { return net.address; } } }
}

app.prepare().then(() => {
    http.createServer(handle).listen(port, () => {
        console.log(`> Ready on http://${getIp()}:${port}`)
    })
})