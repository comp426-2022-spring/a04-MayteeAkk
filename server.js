//Import Functions
import { coinFlip, coinFlips, countFlips, flipACoin } from "./modules/coin.mjs";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

//Require Express.js
const express = require('express');
const app = express();

//Require Database
const db = require("./database.cjs");

const args = require("minimist")(process.argv.slice(2));

const port = args.port || 5555;

const debug = args.debug || false;

const log = args.log || true;

const fs = require('fs');
const morgan = require('morgan');

const help = (`
server.js [options]

--port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.

--debug	If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.

--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.

--help	Return this message and exit.
`)
// If --help or -h, echo help text to STDOUT and exit
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

app.use((req, res, next) => {
    let logdata = {
        remoteaddr: req.ip,
        remoteuser: req.user,
        time: Date.now(),
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        httpversion: req.httpVersion,
        status: res.statusCode,
        referer: req.headers['referer'],
        useragent: req.headers['user-agent']
    };
    const stmt = db.prepare(`
        INSERT INTO accesslog (remoteaddr,
        remoteuser,
        time,
        method,
        url,
        protocol,
        httpversion,
        secure,
        status,
        referer,
        useragent) values (?,?,?,?,?,?,?,?,?,?,?);
    `);
    const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time,logdata.method,
        logdata.url,logdata.protocol,logdata.httpversion,logdata.secure,logdata.status,logdata.referer,logdata.useragent);
    res.status(200).json(info);
    next();

});

if (debug) {
    app.get('/app/log/access', (req, res) => {
        try {
            const stmt = db.prepare(`SELECT * FROM accesslog`).all();
            res.status(200).json(stmt);
        } catch {
            console.error(e);
        }
    });
    app.get('/app/error', (req, res) => {
        throw new Error('Error test successful.');
    });
}

if (log) {
    const writestream = fs.createWriteStream('./access.log', {flags: 'a'})
    app.use(morgan('combined',{stream:writestream}))
}

//Starting an App Server
const server = app.listen(port, () => {
    console.log("App listening on port %PORT%".replace("%PORT%", port));
});

app.get('/app', (req, res) => {
    res.status(200).end("OK");
    res.type("text/plain");
})

app.get('/app/echo/:number', (req, res) => {
    res.status(200).json({ "message": req.params.number });
})

//Defining Check Endpoint
app.get('/app/flip', (req, res) => {
    let flip = coinFlip();
    res.status(200).json({ "flip": flip })
})

app.get('/app/flips/:number', (req, res) => {
    const result = coinFlips(parseInt(req.params.number))
    const count = countFlips(result)
    res.status(200).json({"raw": result, "summary": count})
})

app.get('/app/flip/call/:call', (req, res) => {
    res.status(200).json(flipACoin(req.params.call))
})

//Default Reponse for Any Other Request
app.use(function(req, res) {
    res.status(404).end("Endpoint does not exist");
    res.type("text/plain");
});









