module.exports = {
    isPaired: false,

    fn: (href = '', isExternal = false, content, classes = '') => (`
      <a href="${href}" ${isExternal ? 'target="_blank"' : ''} class="${classes}">${content}</a>
    `)
}
