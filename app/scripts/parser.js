'use strict';

// node modules
const url = require('url');
const path = require('path');
const toMarkdown = require('to-markdown');
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
    }

    /**
     * Set base url
     * @param {string} startUrl
     */
    setBaseUrl(startUrl) {
        const urlObject = url.parse(startUrl);
        this._baseUrl = `${urlObject.protocol}//${urlObject.hostname}`;
        console.info('Base URL: ', this._baseUrl);
    }

    /**
     * Get node & next urls
     * @param dom
     * @returns {{nodeUrls: Array, nextUrl: string}}
     * @private
     */
    _getUrls(dom) {
        const nodeLinks = [...dom.querySelectorAll('.node-teaser h2 > a')];
        const nextLink = dom.querySelector('.pager .pager-next > a');

        return {
            nodeUrls: nodeLinks.map(link => helpers.getUrl(this._baseUrl, link)),
            nextUrl: nextLink ? helpers.getUrl(this._baseUrl, nextLink) : undefined
        };
    }

    /**
     * Get urls for all nodes
     * @param {string} startUrl
     * @returns {Promise}
     */
    getNodeUrls(startUrl) {
        let urls = [];

        return new Promise(resolve => {
            const fn = (url) => {
                helpers.getHtml(url)
                    .then(dom => this._getUrls(dom))
                    .then(res => {
                        urls = [...urls, ...res.nodeUrls];
                        res.nextUrl ? fn(res.nextUrl) : resolve(urls);
                    });
            };

            fn(startUrl);
        });
    }

    /**
     * Processes images
     * @param {string} md - markdown text
     * @returns {Promise}
     */
    static processImages(md) {
        const links = md.match(/!\[(.+?|)]\(.+?\)/ig) || [];
        const promises = [];

        for (let item of links) {
            const match = item.match(/!\[(.+?|)]\((.+?)\)/i);
            if (!match || match.length !== 3) continue;
            promises.push(helpers.processImage(match[2]));
        }

        return Promise.all(promises);
    }

    /**
     * Update and save markdown
     * @param {Object} node
     * @param {Array} images
     * @returns {Promise}
     * @private
     */
    _saveMarkdown(node, images) {
        let md = node.md;

        // Update links in markdown
        for (let img of images) {
            const reg = new RegExp(escapeStringRegexp(img.url), 'g');
            md = md.replace(reg, img.name);
        }

        // Write markdown text into md file
        return helpers.writeMarkdown(node.folderPath, md)
            .then(() => {
                console.info(`"${node.title}" saved.`);
                return {
                    title: node.title,
                    folder: node.folderName
                };
            });
    }

    /**
     * Process & save images
     * @param {Object} node
     * @returns {Promise}
     * @private
     */
    _saveImages(node) {
        return Parser.processImages(node.md)
            .then(images => {
                const promises = images.map((img, index) => {
                    const name = `${index + 1}.${img.fileType.ext}`;
                    return helpers.writeImage(img, name, node.folderPath)
                });

                return Promise.all(promises);
            })
            .then(images => this._saveMarkdown(node, images));
    }

    /**
     * Create Node object
     * @param dom
     * @returns {Promise}
     * @private
     */
    _prepareNode(dom) {
        return new Promise(res => {
            const body = dom.querySelector('body');
            const title = dom.querySelector('h1').textContent;

            const folderName = helpers.getFolderName(title);
            const folderPath = path.normalize(this._savePath + folderName);

            res({
                title: title,
                md: toMarkdown(body.innerHTML),
                folderName: folderName,
                folderPath: folderPath
            });
        });
    }

    /**
     * Precess node
     * @param {string} nodeUrl
     * @returns {Promise}
     */
    processNode(nodeUrl) {
        return helpers.getHtml(nodeUrl)
            .then(dom => this._prepareNode(dom))
            .then(node => helpers.makeDir(node.folderPath).then(() => node))
            .then(node => this._saveImages(node));
    }
}

module.exports = Parser;
