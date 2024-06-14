const fs = require("fs");
const http = require("http");
const crypto = require("crypto");
const cp = require("child_process");


// Load handlers
const handlers = {};
const routes = fs.readFileSync("./temp/routes.txt").toString("utf-8").split("\n");

for (const route of routes) {
    const [ method, url, callback ] = route.split(" ");

    if (!handlers[method]) {
        handlers[method] = {};
    }

    handlers[method][url] = callback;
}


// Create server
const server = http.createServer(async (req, res) => {
    const method = req.method.toLowerCase();

    if (handlers[method]) {
        // Find the handler of the url that matches
        const { url, params } = getMatchedUrl(req.url, Object.keys(handlers[method]));
        // If none matches, set status code to 404 and end
        if (url === "") {
            res.statusCode = 404;
            res.end();
            return;
        }
        // Get the callback function of request
        const callback = handlers[method][url];

        // Get request body
        let reqBody = await new Promise((resolve, reject) => {
            let chunks = [];

            req.on("data", chunk => {
                chunks.push(chunk);
            });

            req.on("end", () => {
                resolve(Buffer.concat(chunks).toString());
            });
        });


        // Generate request id
        const id = BigInt("0x" + crypto.randomBytes(16).toString("hex")).toString();
        // Get request info
        let reqInfo = "";
        // Body
        reqInfo += `set req.body=${reqBody}\n`;
        // Params
        for (const param in params) {
            reqInfo += `set req.params.${param}=${params[param]}\n`;
        }
        // Headers
        for (const header in req.headers) {
            reqInfo += `set req.headers["${header}"]=${req.headers[header]}\n`;
        }
        // IP
        reqInfo += `set req.address=${req.socket.remoteAddress}\n`;
        // URL
        reqInfo += `set req.url=${req.url}\n`;
        // Store the request info into "<id>.bat"
        fs.writeFileSync(`./temp/${id}.bat`, reqInfo);


        // Call the handler
        const output = cp.execSync(`call ${callback} ${id}`);
        console.log("batch>", output.toString());


        // Get the response from the handler
        const resInfo = JSON.parse(fs.readFileSync(`./temp/${id}.res`).toString("utf-8"));
        res.writeHead(resInfo.statusCode, resInfo.headers);
        res.end(resInfo.body);


        // Clean up
        fs.unlinkSync(`./temp/${id}.bat`);
        fs.unlinkSync(`./temp/${id}.res`);
    }
});


// Start server
const port = process.argv[2];
const hostname = process.argv[3];
server.listen(port, hostname, () => {
    console.log(`Server listening on http://${hostname}:${port}/`);
});


// Utils
function getMatchedUrl(targetUrl, urls) {
    let possibleUrls = urls.filter(url => countChar(url, "/") === countChar(targetUrl, "/"));
    let maxPoint = 0;
    let bestUrl = "";
    let bestParams = {};

    for (const url of possibleUrls) {
        const { count, params } = countSimilarChunks(targetUrl, url, "/");
    
        if (count > maxPoint) {
            maxPoint = count;
            bestUrl = url;
            bestParams = params;
        }
    }

    return { url: bestUrl, params: bestParams };
}

function countChar(string, char) {
    let count = 0;
    
    for (let i = 0; i < string.length; i++) {
        if (string[i] === char) {
            count++;
        }
    }

    return count;
}

function countSimilarChunks(target, string, delim) {
    const targetChunks = target.split(delim);
    const stringChunks = string.split(delim);

    let count = 0, params = {};

    for (let i = 0; i < targetChunks.length; i++) {
        if (targetChunks[i] === stringChunks[i]) {
            count++;
        } else if (targetChunks[i] !== stringChunks[i] && stringChunks[i].startsWith(":")) {
            count++;
            params[stringChunks[i].slice(1)] = targetChunks[i];
        } else {
            count = 0;
            break;
        }
    }

    return { count, params };
}
