const fs = require("fs");
const http = require("http");
const https = require("https");
const crypto = require("crypto");
const cp = require("child_process");


// Load handlers
const handlers = {};
const routes = fs.readFileSync("./temp/routes.txt").toString("utf-8").split("\n");

for (const route of routes) {
    const [ method, url, callback, format, limit ] = route.split(" ");

    if (!handlers[method]) {
        handlers[method] = {};
    }

    handlers[method][url] = {
        callback,
        format,
        limit: parseInt(limit)
    };
}


// Create server
async function requestHandler(req, res) {
    try {
        // Get the HTTP method
        const method = req.method.toLowerCase();

        // If no handlers exist for such method, respond with 404
        if (!handlers[method]) {
            res.statusCode = 404;
            res.end();
            return;
        }

        // Get path info
        const reqUrl = new URL(req.url, `http://${req.headers.host}`);
        const reqPath = reqUrl.pathname;
        const reqQueryParams = reqUrl.searchParams;

        // Find the handler of the url that matches
        const { url, params } = getMatchedUrl(reqPath, Object.keys(handlers[method]));
        // If none matches, set status code to 404 and end
        if (url === "") {
            res.statusCode = 404;
            res.end();
            return;
        }
        // Get the callback function, message format and message size limit of request
        const { callback, format, limit } = handlers[method][url];

        // Get request body
        let errorFromReq = false;

        let reqBody = (await new Promise((resolve, reject) => {
            let chunks = [];
            let totalBytes = 0;

            req.on("data", chunk => {
                totalBytes += chunk.length;

                if (totalBytes > limit) {
                    res.statusCode = 400;
                    res.end("Message size exceeded");
                    errorFromReq = true;

                    resolve("");
                }

                chunks.push(chunk);
            });

            req.on("end", () => {
                resolve(Buffer.concat(chunks).toString());
            });
        }));

        if (errorFromReq) return;


        // Generate request id
        const id = BigInt("0x" + crypto.randomBytes(8).toString("hex")).toString();

        // Get request info
        let reqInfo = "";

        switch (format) {
            case "json":
                try {
                    const reqObj = JSON.parse(reqBody);

                    reqInfo += objToBatchDict(reqObj);
                } catch (e) {
                    res.statusCode = 400;
                    res.end("Invalid message format");
                    return;
                }

                break;
        }
        
        // Body
        reqInfo += `set req.body=${secureBatchString(reqBody)}\n`;

        // Params
        for (const param in params) {
            reqInfo += `set req.params.${param}=${secureBatchString(params[param])}\n`;
        }

        // Headers
        for (const header in req.headers) {
            reqInfo += `set req.headers["${secureBatchString(header)}"]=${secureBatchString(req.headers[header])}\n`;
        }

        // IP
        reqInfo += `set req.address=${secureBatchString(req.socket.remoteAddress)}\n`;

        // URL
        reqInfo += `set req.url=${secureBatchString(req.url)}\n`;
        reqInfo += `set req.path=${secureBatchString(reqPath)}\n`;

        // Query params
        for (const [key, value] of reqQueryParams.entries()) {
            reqInfo += `set req.query.params.${secureBatchString(key)}=${secureBatchString(value)}\n`;
        }

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
    } catch (e) {
        console.log(e);
        res.statusCode = 500;
        res.end("Internal Server Error");
    }
}

// Load ssl if enabled
const sslKeyPath = process.argv[4];
const sslCrtPath = process.argv[5];

const server =  sslKeyPath && sslCrtPath ?
                https.createServer({
                    key: fs.readFileSync(sslKeyPath),
                    cert: fs.readFileSync(sslCrtPath)
                }, requestHandler) :
                http.createServer(requestHandler);


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
            // Prioritize direct matches
            count+=2;
        } else if (targetChunks[i] !== stringChunks[i] && stringChunks[i].startsWith(":")) {
            count++;
            params[stringChunks[i].slice(1)] = targetChunks[i];
        } else {
            // If one chunk does not match, reset to 0
            count = 0;
            break;
        }
    }

    return { count, params };
}

function objToBatchDict(obj, parents = []) {
    let parentCode = "";

    for (const parent of parents) {
        let storedProp = parent;

        if (typeof parent === "string") {
            storedProp = `"${secureBatchString(parent)}"`;
        }

        parentCode += `[${storedProp}]`;
    }

    let genCode = "";

    let isArray = Array.isArray(obj);
    let props = isArray ? Object.keys(obj).map(prop => parseInt(prop)) : Object.keys(obj);

    for (const prop of props) {
        let storedProp = prop;

        if (typeof prop === "string") {
            storedProp = `"${secureBatchString(prop)}"`;
        }
        
        if (typeof obj[prop] === "object") {
            genCode += objToBatchDict(obj[prop], [...parents, prop]);
        } else {
            genCode += `set req.body${parentCode}[${storedProp}]=${secureBatchString(obj[prop])}\n`;
        }
    }

    return genCode;
}

function secureBatchString(string) {
    if (typeof string !== "string") return string;

    return string
        .replaceAll("^", "^^^^")
        .replaceAll("|", "^^^|")
        .replaceAll("<", "^^^<")
        .replaceAll(">", "^^^>")
        .replaceAll("&", "^^^&")
        .replaceAll("%", "%%")
        .replace(/\r?\n/g, "%NL%");
}
