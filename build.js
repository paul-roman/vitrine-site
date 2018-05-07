const ejs = require('ejs');
const frontMatter = require('front-matter');
const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const { promisify } = require('util');
const glob = promisify(require('glob'));
const renderEjsFile = promisify(ejs.renderFile);

const config = require('./srcs/site.config');

const srcsFolder = path.resolve('srcs');
const distFolder = path.resolve('docs');

(async () => {
  try {
    await fs.emptyDir(distFolder);
    await fs.copy(`${srcsFolder}/assets`, `${distFolder}/assets`);

    const files = await glob('**/*.@(md|ejs|html)', { cwd: `${srcsFolder}/pages` });
    files.forEach(async (file) => {
      const fileData = path.parse(file);
      const destPath = path.join(distFolder, fileData.dir);
      await fs.ensureDir(destPath);

      const data = fs.readFileSync(`${srcsFolder}/pages/${file}`, 'utf-8');
      const pageData = frontMatter(data);
      const templateConfig = {
        ...config,
        page: pageData.attributes
      };
      let pageContent;
      switch (fileData.ext) {
        case '.md':
          pageContent = marked(pageData.body);
          break;
        case '.ejs':
          pageContent = ejs.render(pageData.body, templateConfig, {
            filename: `${srcsFolder}/pages/${file}`
          });
          break;
        default:
          pageContent = pageData.body;
      }

      // const layoutData = await fs.readFile(`${srcsFolder}/layout.ejs`, 'utf-8');
      const layoutContent = await renderEjsFile(`${srcsFolder}/layout.ejs`, {
        ...templateConfig,
        body: pageContent
      });
      fs.writeFile(`${destPath}/${fileData.name}.html`, layoutContent);
    });
  }
  catch (error) {
    console.error(error);
  }
})();
