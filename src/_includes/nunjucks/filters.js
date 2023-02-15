
const { minify } = require('terser');


function dateToXmlSchema(value) {
  return new Date(value).toISOString()
}


module.exports = {
    add: (eleventyConfig) => {
        eleventyConfig.addNunjucksAsyncFilter('jsmin', async function(code, callback) {
            try {
                const minified = await minify(code);
                callback(null, minified.code);
            } catch (err) {
                console.error('Terser error: ', err);
                callback(null, code);
            }
        });

        eleventyConfig.addFilter('dateToXmlSchema', dateToXmlSchema);
    }
}
