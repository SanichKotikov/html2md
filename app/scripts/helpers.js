'use strict';

const ESCAPE_CHARACTERS = {
    ' ':'-',':':'',',':'','.':'','–':'','—':'','+':'plus',
    '(':'',')':'','?':'','/':'-','«':'','»':'','`':''
};

// node modules
const http = require('http');
const translitRussian = require('translit-russian');
const translit = require('translit')(translitRussian);
const escapeTranslit = require('translit')(ESCAPE_CHARACTERS);
const imagemin = require('imagemin');
const fileType = require('file-type');
const fs = require('fs');


/**
 * Download image by url
 * @param {string} url
 * @returns {Promise}
 */
function getImage(url) {
    // TODO: add reject handler
    return new Promise(resolve => {
        http.get(url, res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve({
                imageBuffer: Buffer.concat(chunks),
                originalUrl: url,
            }));
        }).on('error', err => {
            console.log(`Got error: ${err.message}`);
            console.log(`For `, url);
        });
    });
}

/**
 * Get random number
 * @param {Number} min
 * @param {Number} max
 * @returns {Number}
 */
function getRandomArbitrary(min, max) {
    return parseInt(Math.random() * (max - min) + min);
}

/**
 * Delay next promises
 * @param {Number} ms
 * @returns {Promise}
 */
function delay(ms) {
    return new Promise(res => {
        setTimeout(() => res(), ms);
    });
}

/**
 * Helpers
 */
const helpers = {

    /**
     * Get html DOM by url
     * @param {string} url
     * @returns {Promise}
     */
    getHtml(url) {
        // TODO: add reject handler
        return new Promise(resolve => {
            http.get(url, res => {
                let body = '';
                res.setEncoding('utf8');
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    const parser = new DOMParser();
                    const htmlDoc = parser.parseFromString(body, "text/html");
                    resolve(htmlDoc);
                });
            }).on('error', err => {
                console.log(`Got error: ${err.message}`);
            });
        });
    },

    /**
     * Create folder name by title
     * @param {string} title
     * @returns {string} name
     */
    getFolderName(title) {
        return escapeTranslit(translit(title.toLowerCase()));
    },

    getUrl(baseUrl, link) {
        return baseUrl + link.getAttribute('href');
    },

    /**
     * Processes image (download, optimise)
     * @param {string} imgUrl
     * @returns {Promise}
     */
    processImage(imgUrl) {
        const timer = getRandomArbitrary(1000, 3000);

        return delay(timer)
            .then(res => getImage(imgUrl))
            .then(img => imagemin.buffer(img.imageBuffer, {}))
            .then(buffer => {
                return {
                    fileType: fileType(buffer),
                    buffer: buffer,
                    url: imgUrl
                }
            });
    },

    /**
     * fs.mkdir wrapper
     * @param {string} path
     * @returns {Promise}
     */
    makeDir(path) {
        return new Promise(resolve => {
            fs.mkdir(path, () => resolve());
        });
    },

    /**
     * Write markdown on disk
     * @param {string} path
     * @param {string} md
     * @returns {Promise}
     */
    writeMarkdown(path, md) {
        return new Promise((resolve, reject) => {
            fs.writeFile(`${path}/index.md`, md, 'utf8', err => {
                err ? reject(err) : resolve();
            });
        });
    },

    /**
     * Write image on disk
     * @param {Object} image
     * @param {string} name
     * @param {string} path
     * @returns {Promise}
     */
    writeImage(image, name, path) {
        return new Promise((resolve, reject) => {
            fs.writeFile(`${path}/${name}`, image.buffer, (err) => {
                err ? reject(err) : resolve({ url: image.url, name: name });
            });
        });
    }
};

module.exports = helpers;
