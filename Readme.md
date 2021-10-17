Blog using 11ty
---
[![Netlify Status](https://api.netlify.com/api/v1/badges/028cdca6-8cf5-4c8a-87f4-842b045c2024/deploy-status)](https://app.netlify.com/sites/iamninad/deploys)

My peronal blog migrated to 11ty.

to run on local
```
npm start
```

to run on prod
```
npm run build
```

generated site is created in `www` folder in the root

### Generate a new blog post

Run following command 
```
npm run generate
```

provide the blog title and it will generate a markdown file in `src/posts/` and a folder for storing blog post images in `src/images/`
