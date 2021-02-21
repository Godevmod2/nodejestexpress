import {Client, ApiResponse, RequestParams} from '@elastic/elasticsearch'
import {TransportRequestCallback, TransportRequestPromise} from "@elastic/elasticsearch/lib/Transport";


export class ElasticSearch {
    private esClient: Client;

    constructor(esPath: string) {
        this.esClient = new Client({
            node: esPath
        })
    }

    allIndices(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.esClient.cat.indices({format: 'json'}).then((data) => {
                if (data && data.body && data.body.length > 0) {
                    let preparedData: any = [];
                    data.body.forEach((item: any): void => {
                        if (item.index !== ".apm-agent-configuration") {
                            item.name = item.index;
                            preparedData.push(item);
                        }
                    });
                    resolve(preparedData);
                    return;
                }
                resolve(data);
            }).catch((err: Error) => {
                reject(err);
            });
        });
    }

    deleteIndex(index: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            // if (index === "_all") {
            //     reject("Can not delete all indices");
            // }
            this.esClient.indices.delete({
                index: index
            }, (err, res) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve('Indexes have been deleted!');
                }
            });
        });
    }

    createIndex(record: RequestParams.Index): Promise<ApiResponse | Error> {
        return new Promise<ApiResponse | Error>((resolve, reject) => {
            this.esClient.index(record, (err: Error, data: ApiResponse) => {
                if (err) {
                    reject(err);
                }
                resolve(data);
            });
        })
    }

    search(searchParams: RequestParams.Search): Promise<any | Error> {
        return new Promise<any | Error>((resolve, reject) => {
            this.esClient.search(searchParams).then((result: ApiResponse) => {
                resolve(result.body.hits.hits);
            }).catch((err: Error) => {
                reject(err);
            })
        });
    }

    createBulkBody(items: any, indexName: string): Promise<any | Error> {
        return new Promise<any | Error>((resolve, reject) => {
            let result: any = [];
            items.forEach((item: any) => {
                result.push({
                    index: {
                        _index: indexName,
                        _type: item.type,
                        _id: item.productId
                    }
                });
                result.push(item);
            });

            console.log("Inserting bulk: ", result)

            this.esClient.bulk({
                body: result
            }, (err, resp)=> {
                if (err) {
                    reject(err);
                } else {
                    resolve(resp);
                }
            });
        });
    }
}
