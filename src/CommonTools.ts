import axios from "axios"
import crypto from "crypto"
import {Socket} from "socket.io";

interface AppConfigs {
    DB_PATH: string;
    MAILER_PATH: string;
    ENCRYPT_VECTOR: string;
    ENCRYPT_KEY: string;
}

interface SocketTasks {
    [key: string]: (param: any, socket: Socket) => void
}

export class CommonTools {
    private readonly encryptVector: Buffer;
    private readonly encryptKey: Buffer;
    private readonly configs: AppConfigs;
    public static socketListeners: SocketTasks = {};

    constructor(configs: AppConfigs) {
        console.log("Initializing common tools");

        this.configs = configs;

        this.encryptVector = Buffer.from(this.configs.ENCRYPT_VECTOR);
        this.encryptKey = Buffer.from(this.configs.ENCRYPT_KEY);
    }

    public operateDb(conditional: any, operation: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            axios.post(this.configs.DB_PATH + operation, conditional).then(function (response) {
                resolve(response.data);
            }).catch(function (error) {
                reject(error.data);
            });
        });
    }

    public static addSocketListener(task: { id: string, fn: (param: any, socket: Socket) => void }): void {
        this.socketListeners[task.id] = task.fn;
    }

    public static callSocketListener(parameters: any, socket: Socket): void {
        const socketId = parameters.id;
        const socketListener = this.socketListeners[socketId];
        if (socketListener && typeof socketListener === 'function') {
            socketListener(parameters.data, socket);
        }
    }

    public static getRequest(path: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            axios.get(path)
                .then((response) => {
                    resolve(response);
                }).catch((err: Error) => {
                reject(err);
            });
        });
    }

    public sendEmail(sendTo: string, subject: string, templateId: string, data: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            axios.post(this.configs.MAILER_PATH, {
                sendTo: sendTo,
                parameters: {
                    subject: subject,
                    template: templateId,
                    options: data
                }
            }).then(function (response) {
                resolve(response);
            }).catch(function (error) {
                reject(error);
            });
        });
    }

    public logger(msg: any): void {
        const date = new Date();
        console.log("\n*NODEAPP:\n");
        console.log(date.toLocaleTimeString(), msg + "\n");
    }

    public encrypt(text: string): any {
        const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptKey, this.encryptVector);
        const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
        return this.encryptVector.toString('hex') + '@' + encrypted.toString('hex');
    }

    public decrypt(text: any): string | null {
        try {
            let textParts = text.split('@');
            const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptKey, Buffer.from(textParts[0], 'hex'));
            const decrpyted = Buffer.concat([decipher.update(Buffer.from(textParts[1], 'hex')), decipher.final()]);
            return decrpyted.toString();
        } catch (e: any) {
            return null
        }
    }

    private calcChecksum(str: string | undefined): number {
        if (!str) {
            str = "a";
        }
        let tmp = 0;
        let checkSum = 0;
        if (checkSum > 0) {
            tmp = checkSum;
        }
        for (let i = 0; i < str.length; i++) {
            let chr = str.charCodeAt(i);
            checkSum = ((checkSum << 5) - checkSum) + chr;
            checkSum |= 0; // Convert to 32bit integer
        }
        return checkSum + tmp;
    }
}
