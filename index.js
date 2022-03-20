const fs = require('fs');
const path = require('path');
const { chromium, firefox } = require('playwright');
const { exit } = require('process');

const [url, fileType, file] = process.argv.slice(2);
const csv = "csv";
const txt = "txt";

if (!url) {
    throw 'Please provide a URL as the first argument.';
}
if (!fileType || fileType != csv && fileType != txt) {
    throw 'Please provide a file type as the second argument, either "txt" or "csv" ';
}

async function run() {
    const browser = await firefox.launch();
    const page = await browser.newPage();

    await page.goto(url);
    // waitForSelector timing out in Chromium?
    await page.waitForSelector('.easy-card-list');

    const boardTitle = await page.$eval('.board-name', (node) => node.innerText.trim().replace(/\s/g, ''));

    if (!boardTitle) {
        throw 'Board title does not exist. Please check if provided URL is correct.'
    }
    
    return fileType == txt ? writeTxt(boardTitle, page) : writeCSV(boardTitle, page)
}

async function writeCSV(boardTitle, page) {
    let output = [];
    const columns = await page.$$('.easy-card-list');
    for (let i = 0; i < columns.length; i++) {
        output.push([])
    }
    for (let i = 0; i < columns.length; i++) {
        const columnTitle = await columns[i].$eval('.column-header', (node) => node.innerText.trim());
        output[0].push(columnTitle);
        const messages = await columns[i].$$('.easy-board-front');
        let rowcount = 1;
        let blankCount = 0;
        let selected = false
        for (let k = 0; k < messages.length; k++) {
            const messageText = await messages[k].$eval('.easy-card-main .easy-card-main-content .text', (node) => node.innerText.trim());
            const votes = await messages[k].$eval('.easy-card-votes-container .easy-badge-votes', (node) => node.innerText.trim());
            if (votes != 0) {
                if (i == 0) {
                    output[rowcount].push(messageText)
                    rowcount++;
                    selected = true;
                } else {
                    output[rowcount].push(messageText)
                    rowcount++;
                    selected = true;
                }
            }
            blankCount++;
        }
        if(!selected) {
            while(blankCount > 0) {
                output[blankCount].push(" ")
                blankCount--;
            }
        }
    }
    console.log(output)
    let csvString = "";
    output.forEach((text, i) => {
        csvString += text.toString() + "\n"
    })
    
    return boardTitle + "\n" + csvString;
}

async function writeTxt(boardTitle, page) {
    let parsedText = boardTitle + '\n\n';

    const columns = await page.$$('.easy-card-list');

    for (let i = 0; i < columns.length; i++) {
        const columnTitle = await columns[i].$eval('.column-header', (node) => node.innerText.trim());

        const messages = await columns[i].$$('.easy-board-front');
        if (messages.length) {
            parsedText += columnTitle + '\n';
        }
        for (let i = 0; i < messages.length; i++) {
            const messageText = await messages[i].$eval('.easy-card-main .easy-card-main-content .text', (node) => node.innerText.trim());
            const votes = await messages[i].$eval('.easy-card-votes-container .easy-badge-votes', (node) => node.innerText.trim());
            parsedText += `- ${messageText} (${votes})` + '\n';
        }

        if (messages.length) {
            parsedText += '\n';
        }
    }
    return parsedText;
}

function writeToFile(filePath, data) {
    let resolvedPath = null;
    fileType == txt ? resolvedPath = path.resolve(filePath || `../${data.split('\n')[0].replace('/', '')}.txt`) :
        resolvedPath = path.resolve(filePath || `../${data.split('\n')[0].replace('/', '')}.csv`)
    if (fileType != txt) {
        data = data.split("\n").slice(1).join("\n")
    }
    fs.writeFile(resolvedPath, data, (error) => {
        if (error) {
            throw error;
        } else {
            console.log(`Successfully written to file at: ${resolvedPath}`);
        }
        process.exit();
    });
}

function handleError(error) {
    console.error(error);
}

run().then((data) => writeToFile(file, data)).catch(handleError);