const path = require('path');
const sass = require('node-sass');
const autoprefixer = require('autoprefixer');
const postcss = require('postcss');
const CleanCSS = require('clean-css');
const cssesc = require('cssesc');

const isProd = process.env.ELEVENTY_ENV === 'production';

/**
 * @see https://github.com/maxboeck/eleventastic/blob/master/src/assets/styles/styles.11ty.js
 */

// Main entry point name
const ENTRY_FILE_NAME = 'idrc.scss';

module.exports = class {
	async data() {
		const entryPath = path.join(__dirname, `/${ENTRY_FILE_NAME}`);
		return {
			permalink: '/css/idrc.css',
			eleventyExcludeFromCollections: true,
			entryPath
		};
	}

	// Compile Sass to CSS,
	// Embed Source Map in Development
	async compile(config) {
		return new Promise((resolve, reject) => {
			if (!isProd) {
				config.sourceMap = true;
				config.sourceMapEmbed = true;
				config.outputStyle = 'expanded';
			}

			sass.render(config, (err, result) => {
				if (err) {
					reject(err);
				} else {
					// Process CSS with PostCSS and Autoprefixer.
					postcss([autoprefixer]).process(result.css, {from: 'undefined'}).then(result => {
						resolve(result.css);
					});
				}
			});
		});
	}

	// Minify & Optimize with CleanCSS in Production
	async minify(css) {
		return new Promise((resolve, reject) => {
			if (!isProd) {
				resolve(css);
			}

			const minified = new CleanCSS().minify(css);
			if (minified.styles) {
				resolve(minified.styles);
			} else {
				reject(minified.error);
			}
		});
	}

	// Display an error overlay when CSS build fails.
	// this brilliant idea is taken from Mike Riethmuller / Supermaya
	// @see https://github.com/MadeByMike/supermaya/blob/master/site/utils/compile-scss.js
	renderError(error) {
		return `
        /* Error compiling stylesheet */
        *,
        *::before,
        *::after {
            box-sizing: border-box;
        }
        html,
        body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            font-family: monospace;
            font-size: 1.25rem;
            line-height:1.5;
        } 
        body::before { 
            content: ''; 
            background: #000;
            top: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            opacity: 0.7;
            position: fixed;
        }
        body::after { 
            content: '${cssesc(error)}'; 
            white-space: pre;
            display: block;
            top: 0; 
            padding: 30px;
            margin: 50px;
            width: calc(100% - 100px);
            color:#721c24;
            background: #f8d7da;
            border: solid 2px red;
            position: fixed;
        }`;
	}

	// Render the CSS file
	async render({entryPath}) {
		try {
			const css = await this.compile({file: entryPath});
			const result = await this.minify(css);
			return result;
		} catch (error) {
			// If things go wrong
			if (isProd) {
				// Throw and abort in production
				throw new Error(error);
			} else {
				// Otherwise display the error overly
				console.error(error);
				const message = error.formatted || error.message;
				return this.renderError(message);
			}
		}
	}
};
