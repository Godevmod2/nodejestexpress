import {Application} from "../Application";
import request from "supertest";

describe("Testing server initialization", () => {
    it("Should start an express application. Should return 200 or 404", async (done: any) => {
        const appInstance = await new Application();
        try {
            request(appInstance.app)
                .get("/")
                .then(response => {
                    expect(response.status.toString()).toMatch(/200|404/);
                    appInstance.closeServer();
                    console.log("Returned status:", response.status);
                    done();
                });
        } catch (e) {
            done.fail(e)
        }
        appInstance.closeServer();
    });
});