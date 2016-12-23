'use strict';

// node modules
const fs = require('fs');

// app modules
const Parser = require('./scripts/parser');

// constants
const SAVE_PATH = process.env.HOME + '/Downloads/html2md/';


class App {

    /**
     * App constructor
     * @param {string} appId
     */
    constructor(appId) {
        // dom
        this._appEl = document.getElementById(appId || 'app');
        this._inputUrl = this._appEl.querySelector('input#url');
        this._parseBtn = this._appEl.querySelector('button#parse');

        console.info('SAVE_PATH: ', SAVE_PATH);
        this.parser = new Parser(SAVE_PATH);

        // onClick
        this._parseBtn.addEventListener('click', event => this.onParseClick(event));
    }

    /**
     * Click handler for Parse button
     * @param event
     */
    onParseClick(event) {
        event.preventDefault();
        event.stopPropagation();

        const startUrl = this._inputUrl.value;

        if (!startUrl) {
            console.info('Input URL is empty :(');
            return;
        }

        console.info('Start searching of nodes');
        this.parser.setBaseUrl(startUrl);

        this.parser.getNodeUrls(startUrl)
            .then(urls => {
                console.info(`Found ${urls.length} nodes.`);
                const promises = urls.map(nodeUrl => this.parser.processNode(nodeUrl));
                return Promise.all(promises);
            })
            .then(nodes => {
                console.info(`Saved ${nodes.length} nodes.`);
                const summary = nodes.map(node => `* [${node.title}](${node.folder}/index.md)`);

                fs.writeFile(`${SAVE_PATH}/summary.md`, summary.join('\n'), 'utf8', (err) => {
                    if (err) throw err;
                    console.info(`summary saved.`);
                });
            });
    }
}

document.addEventListener('DOMContentLoaded', () => new App());
