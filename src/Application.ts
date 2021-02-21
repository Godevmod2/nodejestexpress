import {BaseApplication} from './BaseApplication';
import express from "express";

interface ArticleType {
    productId: string
    articleTitle: string
    brief: string
    image: string
    template: string
    priority: number
}

export class Application extends BaseApplication {
    constructor() {
        super();
        this.baseServerConfigs();
        this.extendedConfigs();
        this.initServer();
    }

    private extendedConfigs() {
        const pathToClient = __dirname + this.configs.get('CLIENT_DIR');

        this.app.use(express.static(pathToClient));
        this.app.set('views', pathToClient + '/views');

        this.app.get('/:blogPage', (req, res): void => {
            res.cookie('lastVisitPage', req.params.blogPage, {maxAge: 900000, httpOnly: true});
            if (req.params.blogPage === "favicon.ico") {
                return;
            }
            const pathParam = req.params.blogPage;
            res.render(this.renderTemplate(pathParam + ".ejs"));
        });

        this.app.get('/article/:articleId', (req, res): void => {
            const pathParam = req.params.articleId;
            res.render(this.renderTemplate("posts/" + pathParam + "/" + pathParam + ".ejs"));
        });

        this.app.get('/', (req, res): void => {
            console.log("Getting articles")
            super.getRecordsFromElastic({
                index: "articles",
                from: 0,
                size: 150,
                body: {}
            }).then((exampleArticles: ArticleType[]) => {
                res.render(this.renderTemplate('index.ejs'), {exampleArticles:exampleArticles});
            }).catch((err) => {
                res.render(this.renderTemplate('index.ejs'), {articlesList: []});
            })
        });
    }
}

if (!process.env.JEST_TEST) {
    new Application();
}