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

        const url = this._inputUrl.value;

        if (!url) {
            console.info(`Input ${this._inputUrl.getAttribute('placeholder')} is empty :(`);
            return;
        }

        this.parser.getLinks(url, links => {
            console.info(`Found ${links.length} nodes.`);
            const promises = links.map(link => this.parser.parseNode(link));

            Promise.all(promises).then(nodes => {
                console.info(`Saved ${nodes.length} nodes.`);

                if (nodes.length) {
                    const summary = [];

                    for (const node of nodes) {
                        summary.push(`* [${node.title}](${node.folder}/index.md)`);
                    }

                    fs.writeFile(`${SAVE_PATH}/summary.md`, summary.join('\n'), 'utf8', err => {
                        if (err) throw err;
                        console.info(`summary saved.`);
                    });
                }
            })
        });
    }
}

document.addEventListener('DOMContentLoaded', () => new App());
