'use strict';

// node modules
const url = require('url');
const path = require('path');
const toMarkdown = require('to-markdown');
const fs = require('fs');
const escapeStringRegexp = require('escape-string-regexp');

// app modules
const helpers = require('./helpers');


class Parser {

    /**
     * Parser constructor
     * @param {string} savePath
     */
    constructor(savePath) {
        this._savePath = savePath;

        this._baseUrl = null;
        this._getLinksCallback = null;
        this._links = [];
    }

    /**
     * Search node links
     * @param {string} pageUrl
     */
    _findLinks(pageUrl) {
        helpers.getHtml(pageUrl).then(dom => {
            const links = [...dom.querySelectorAll('.node-teaser h2 > a')]
                .map(link => this._baseUrl + link.getAttribute('href'));

            this._links = [...this._links, ...links];
            const nextLink = dom.querySelector('.pager .pager-next > a');

            if (nextLink) {
                const nextUrl = this._baseUrl + nextLink.getAttribute('href');
                // TODO:
                this._findLinks(nextUrl);
            } else {
                this._getLinksCallback(this._links);
            }
        });
    }

    /**
     * Starts finding links
     * @param {string} startUrl
     * @param {Function} callback
     */
    getLinks(startUrl, callback) {
        this._getLinksCallback = callback || function (){};
        const urlObject = url.parse(startUrl);

        this._baseUrl = `${urlObject.protocol}//${urlObject.hostname}`;
        console.log('baseUrl: ', this._baseUrl);

        this._findLinks(startUrl);
    }

    /**
     * Processes images
     * @param {string} md - markdown text
     * @returns {Promise}
     */
    _processImages(md) {
        return new Promise(resolve => {
            const mdLinks = md.match(/!\[(.+?|)]\(.+?\)/ig);
            if (!mdLinks) resolve([]);

            const promises = [];

            for (const item of mdLinks) {
                const match = item.match(/!\[(.+?|)]\((.+?)\)/i);
                if (!match || match.length !== 3) continue;
                promises.push(helpers.processImage(match[2]));
            }

            // Waits processing of all images
            Promise.all(promises).then(images => {
                resolve(images);
            });
        });
    }

    /**
     * Parses node
     * @param {string} nodeUrl
     * @returns {Promise}
     */
    parseNode(nodeUrl) {
        return new Promise(resolve => {
            // Get html DOM by url
            helpers.getHtml(nodeUrl).then(dom => {
                const body = dom.querySelector('body');
                const title = dom.querySelector('h1').textContent;

                const folderName = helpers.getFolderName(title);
                const folderPath = path.normalize(this._savePath + folderName);

                // Convert html to markdown
                let md = toMarkdown(body.innerHTML);

                fs.mkdir(folderPath, () => {
                    // Processes images for current node
                    this._processImages(md).then(images => {

                        const promises = [];

                        if (images.length) {
                            for (let i = 0; i < images.length; i++) {
                                const img = images[i];
                                const name = `${i + 1}.${img.fileType.ext}`;
                                promises.push(helpers.saveFile(img, name, folderPath));
                            }
                        }

                        // Waits saving of all images
                        Promise.all(promises).then(images => {

                            // Update links in markdown
                            if (images.length) {
                                for (const img of images) {
                                    const reg = new RegExp(escapeStringRegexp(img.url), 'g');
                                    md = md.replace(reg, img.name);
                                }
                            }

                            // Write markdown text into md file
                            fs.writeFile(`${folderPath}/index.md`, md, 'utf8', err => {
                                if (err) throw err;
                                console.info(`"${title}" saved.`);

                                resolve({
                                    title: title,
                                    folder: folderName
                                });
                            });
                        });
                    });
                });
            });
        });
    }
}

module.exports = Parser;
