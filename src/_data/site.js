
module.exports = {
  title: "Neenad Ingole",
  description: "I am a Full Stack Developer who loves to explore tech and share the expierences with the world",
  url: 'https://iamninad.com',
  baseUrl: '/',
  time: new Date(),
  maxPostsInHomePage: 5,
  environment: process.env.NODE_ENV,
  author: 'neenad ingole',
  email: 'ninad.ingole@gmail.com',

  gaAnalytics: null,
  currentYear: (new Date()).getFullYear(),
  includeServiceWorker: false,
  monetization: "$ilp.uphold.com/96QFDLnaPa42",

  social: {
    about: 'https://iamninad.com/about',
    twitter: 'https://twitter.com/iamneenad',
    github: 'https://github.com/ninadingole',
    email: 'ninad.ingole@gmail.com',
    sponser: 'https://github.com/sponsors/ninadingole',
    newsletter: 'https://blog.iamninad.com/newsletter',
    rss : 'https://iamninad.com/rss/index.xml',
  },

  nav :[
    {
      title: 'blog',
      url: '/blog/',
    },
    {
      title: 'sponsor',
      url: 'https://github.com/sponsors/ninadingole',
      external: true,
    },
    {
      title: 'newsletter',
      url: 'https://blog.iamninad.com/newsletter',
      external: true,
    },
    {
      title: 'archive',
      url: '/archive',
    },
    {
      title: 'rss',
      url: '/rss/index.xml',
    },
  ],

  preconnects: ['https://fonts.gstatic.com', 'https://cdn.heapanalytics.com', 'https://www.googletagmanager.com', 'https://cdn.jsdelivr.net'],
}
