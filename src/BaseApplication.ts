/**
 * Designed by Ilya Nikulin 2020
 * This is a template for creating Node Express + TypesScript + Jest applications.
 * You may extend it with your own configs or use it as is.
 * All the required paths and ports are stored within .env.dev/.env.prod files.
 * You are free to add arguments to npm start dev/prod http/https script via command line.
 * These arguments are for server tuning purposes.
 */
import colors from 'colors';
import * as dotenv from 'dotenv';
import fs from 'fs';

import express from 'express'
import * as http from 'http'
import * as https from 'https'
import ejs from "ejs"
import compression from "compression";
import cookie_parser from "cookie-parser";
import partials from "express-partials";
import bodyParser from "body-parser";
import socket from 'socket.io'
import {ElasticSearch} from "./ElasticSearch";

export class BaseApplication {
    public app: express.Application;
    public server: http.Server | https.Server;
    public socketsIo: socket.Server;
    private isHttpsServer: boolean = false;
    public configs: Map<string, string | null | undefined | number>;
    private elasticSearchClient: ElasticSearch;

    constructor() {
        this.app = express();
        const appArguments = process.argv.slice(2);
        let environment: string = "dev";
        for (const arg of appArguments) {
            if (arg === 'dev' || arg === 'prod') {
                environment = arg;
            }
            this.isHttpsServer = arg === 'https';
        }

        process.env.environment = environment;

        const dotEnvPath = __dirname + '/.env.' + environment;

        if (!fs.existsSync(dotEnvPath)) {
            console.log(colors.bgWhite.red(' No .env file found. Aborting application '));
            return;
        }

        dotenv.config({path: __dirname + '/.env.' + environment});

        this.configs = new Map(Object.entries(process.env));
    }

    public initServer(): void {
        if (this.isHttpsServer) {
            this.server = new https.Server({
                key: fs.readFileSync('/etc/letsencrypt/live/ilyanikulin.com/privkey.pem'),
                cert: fs.readFileSync('/etc/letsencrypt/live/ilyanikulin.com/fullchain.pem')
            }, (this.app));
        } else {
            this.server = new http.Server(this.app);
        }

        this.server.listen(this.configs.get("PORT"), (): void => {
            console.log(colors.bgGreen.white(`Starting: Regular server\nPort: ${this.configs.get("PORT")} `));
        });

        this.elasticSearchClient = new ElasticSearch(<string>this.configs.get('ELASTICSEARCH_PATH'));

        this.socketsIo = socket(this.server, {
            origins: "http://localhost:* http://127.0.0.1:* https://68.183.79.66:* https://godevmod.com:* https://www.godevmod.com:*"
        });
    }

    public getTheApp() {
        return this.app;
    }

    protected renderTemplate = (fileName: string): string => {
        const pathToClient = __dirname + this.configs.get('CLIENT_DIR') + "/" + fileName;
        if (fs.existsSync(pathToClient)) {
            return pathToClient;
        }
        return pathToClient + '404.ejs';
        // if (fs.existsSync(__dirname + this.getConfig('VIEWS_BASE_PATH') + path)) {
        //     return __dirname + this.getConfig('VIEWS_BASE_PATH') + path;
        // }
        // return __dirname + this.getConfig('VIEWS_BASE_PATH') + '/404.ejs';
    };

    public closeServer(): void {
        this.server.close();
    }

    protected baseServerConfigs(): void {
        this.app.use(compression());
        this.app.use(cookie_parser());
        this.app.set('view engine', 'ejs');
        this.app.use(partials());

        this.app.use(bodyParser.urlencoded({
            extended: true
        }));
        this.app.use(bodyParser.json());
    }

    protected getRecordsFromElastic(parameters: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.elasticSearchClient.search(parameters).then((data: any) => {
                console.log("Elastic Found data: ", data)
                if (data && data.length > 0) {
                    let prepareData: any = [];
                    data.forEach((item: any): void => {
                        prepareData.push(item._source);
                    });
                    resolve(prepareData);
                }
            }).catch((e) => {
                console.log("No Found data: ", e)
                reject([]);
            });
        });
    }
}