
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
    twitter: 'https://twitter.com/iamneenad',
    github: 'https://github.com/ninadingole',
    email: 'ninad.ingole@gmail.com',
    newsletter: 'https://blog.iamninad.com/newsletter',
    rss: '/rss/index.xml',
  },

  nav :[
    {
      title: 'Blog',
      url: '/blog/',
    },
    {
      title: 'Sponsor',
      url: 'https://github.com/sponsors/ninadingole',
      external: true,
    },
    {
      title: 'Newsletter',
      url: 'https://blog.iamninad.com/newsletter',
      external: true,
    },
    {
      title: 'About',
      url: '/about/',
    },
  ],

  preconnects: ['https://fonts.gstatic.com', 'https://cdn.heapanalytics.com', 'https://www.googletagmanager.com', 'https://cdn.jsdelivr.net'],
}
