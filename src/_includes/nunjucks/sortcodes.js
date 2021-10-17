const Image = require("@11ty/eleventy-img");

module.exports = {
    add: (eleventyConfig) => {
        eleventyConfig.addNunjucksAsyncShortcode("resI", async (src, alt, widths) => {
            let metadata = await Image(src, {
                widths: widths,
                formats: ["webp", "jpeg"],
                urlPath: '/images',
                outputDir: 'www/images',
                useCache: false,
                cacheOptions: {
                    duration: '1d',
                    directory: 'www/.cache',
                        removeUrlQueryParams: false,

                }
            });

            let imageAttributes = {
                alt,
                sizes: widths,
                loading: "lazy",
                decoding: "async",
            };

            // You bet we throw an error on missing alt in `imageAttributes` (alt="" works okay)
            return Image.generateHTML(metadata, imageAttributes);
        });
    }
};
