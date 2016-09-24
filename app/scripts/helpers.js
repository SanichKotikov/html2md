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
 * Optimize image
 * @param {Object} image
 * @returns {Promise}
 */
function optimiseImage(image) {
    return new Promise(resolve => {
        imagemin.buffer(image.imageBuffer, {}).then(buffer => {
            resolve(buffer);
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

    /**
     * Processes image (download, optimise)
     * @param {string} imgUrl
     * @returns {Promise}
     */
    processImage(imgUrl) {
        return new Promise(resolve => {
            // Avoid `Uncaught Error: connect ECONNRESET`
            const timer = getRandomArbitrary(1000, 3000);

            setTimeout(() => {
                getImage(imgUrl).then(image => {
                    optimiseImage(image).then(buffer => {
                        resolve({
                            fileType: fileType(buffer),
                            buffer: buffer,
                            url: imgUrl
                        });
                    });
                });
            }, timer);
        });
    },

    /**
     * Write image on disk
     * @param {Object} image
     * @param {string} name
     * @param {string} path
     * @returns {Promise}
     */
    saveFile(image, name, path) {
        return new Promise((resolve, reject) => {
            fs.writeFile(`${path}/${name}`, image.buffer, err => {
                if (err) reject(err);
                resolve({
                    url: image.url,
                    name: name
                });
            });
        });
    }
};

module.exports = helpers;
