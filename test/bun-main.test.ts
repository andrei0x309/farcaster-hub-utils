import { expect, test } from "bun:test";
import { FCHubUtils } from '../src/main'

const SIGNER_KEY = process.env.SIGNER_KEY as string;
const SIGNER_KEY2 = process.env.SIGNER_KEY2 as string;
const FID = Number(process.env.FID as string);
const FID2 = Number(process.env.FID2 as string);
const HUB_URL = process.env.HUB_URL;
const HUB_USER = process.env.HUB_USER;
const HUB_PASS = process.env.HUB_PASS;
const HUB_URL2 = process.env.HUB_URL2;


const hubUtils = new FCHubUtils(SIGNER_KEY, FID, HUB_URL, HUB_USER, HUB_PASS);

const hubUtils2 = new FCHubUtils(SIGNER_KEY2, FID2, HUB_URL, HUB_USER, HUB_PASS);

const hubUtils3 = new FCHubUtils(SIGNER_KEY, FID, 'hub-grpc.pinata.cloud');

let testOrSkip: typeof test | typeof test.skip;

const testEnabled = {
    "getFidFromUsername": false,
    "createFarcasterPost": false,
    "createCast": false,
    "removeCast": true,
    "getCastsFromFid": false,
    "testChangeHub": false,
    "testChangeSigner": false,
    "test6Medias": false,
    "testCastInNonExistentChannel": false,
    "testCastWithAllMediaInOneURL": false,
    "testPublicHub": false,
    "calculateFollowingsByfid": false
}

testOrSkip = testEnabled.getFidFromUsername ? test : test.skip;
testOrSkip("Get fid By name", async () => {
    expect(await hubUtils.getFidFromUsername("clearwallet")).toBe(FID);
});

testOrSkip = testEnabled.createFarcasterPost ? test : test.skip;
testOrSkip("Test send cast", async () => {
    const text = "Test @andrei0x309";
    const castHash = await hubUtils.createFarcasterPost({
        content: text
    });
    const stringHash = Buffer.from(castHash).toString('hex');
    console.log(castHash);
    expect(stringHash).toBeDefined();
});

testOrSkip = testEnabled.createCast ? test : test.skip;
testOrSkip("Test send cast", async () => {
    const text = "5";
    const castHash = await hubUtils3.createCast({
        content: text
    })
    const stringHash = Buffer.from(castHash).toString('hex');
    console.log(castHash);
    expect(stringHash).toBeDefined();
}, { timeout: 30000 });

testOrSkip = testEnabled.removeCast ? test : test.skip;
testOrSkip("Test remove cast", async () => {
    const hash = '69a3d03b3d90f0901ed71f4e243a5b383d7e1497'
    const castHash = await hubUtils3.deleteCast(hash)
    expect(castHash).toBeTrue();
}, { timeout: 20000 });

testOrSkip = testEnabled.getCastsFromFid ? test : test.skip;
testOrSkip("Get cast by FID", async () => {
    const FID = 1791
    const casts = await hubUtils.getCastsByFid({
        fid: FID,
        limit: 1,
        fromTimestamp: Date.now() - 1000 * 60 * 60 * 24 * 7
    });
 
    console.log(casts?.casts[0].cast?.text);
    console.log(new Date(casts?.casts[0].timestamp ?? 0).toISOString());

    expect(casts).toBeDefined();
})

 
testOrSkip = testEnabled.testChangeHub ? test : test.skip;
testOrSkip("Test change hub", async () => {
    await hubUtils.changeHub({
        HUB_URL: HUB_URL2
    });
    expect(await hubUtils.getFidFromUsername("clearwallet")).toBe(FID);
});


testOrSkip = testEnabled.testChangeSigner ? test : test.skip;
testOrSkip("Test change signer", async () => {
    const hubUtils = new FCHubUtils(SIGNER_KEY as string, FID, HUB_URL, HUB_USER, HUB_PASS);
    await hubUtils.changeSigner(SIGNER_KEY2 as string);
    expect(await hubUtils.getFidFromUsername("yuptester")).toBe(FID2);
});

testOrSkip = testEnabled.test6Medias ? test : test.skip;
testOrSkip("Test 6 medias", async () => {

    const id = 237
    const getUrl = (id) => `https://picsum.photos/id/${id}/200/300`

    const text = "Test 6 medias";
    const castHash = await hubUtils2.createFarcasterPost({
        content: text,
        media: Array.from({ length: 6 }, (_, i) => getUrl(id + i)).map(url => ({ farcaster: url }))
    });
    const stringHash = Buffer.from(castHash).toString('hex');
    await new Promise(resolve => setTimeout(resolve, 15000));
    const cast = await hubUtils2.getCastFromHash(stringHash, FID2)
    console.log(cast);
    expect(cast).toBeDefined();
}, {
    timeout: 50000
})

testOrSkip = testEnabled.testCastInNonExistentChannel ? test : test.skip;
testOrSkip("Test cast in non existent channel", async () => {
    const text = "Test cast in non existent channel";
    const castHash = await hubUtils2.createFarcasterPost({
        content: text,
        replyTo: "https://warpcast.com/~/channel/yuptester"
    });
    const stringHash = Buffer.from(castHash).toString('hex');
    console.log(castHash);
    expect(stringHash).toBeDefined();
});

testOrSkip = testEnabled.testCastWithAllMediaInOneURL ? test : test.skip;
testOrSkip("Test cast with all media in one URL", async () => {

        const id = 237
    const getUrl = (id) => `https://picsum.photos/id/${id}/200/300`

    const text = "Test cast with all media in one URL";
    const largeURLsStrings = Array.from({ length: 6 }, (_, i) => getUrl(id + i)).reduce((acc: string, url: string) => {
        if (acc.length === 0) {
           return url
        } else if ( !acc?.includes('?')) {
            return acc + '?embeds[]=' + url
        } else {
            return acc + ',' + url
        }
    }, "") as string
    console.log(largeURLsStrings.length)
    const castHash = await hubUtils2.createFarcasterPost({
        content: text,
        media: [largeURLsStrings].map(url => ({ farcaster: url }))
    });
    const stringHash = Buffer.from(castHash).toString('hex');
    console.log(castHash);
    expect(stringHash).toBeDefined();
}, {
    timeout: 20000
})

testOrSkip = testEnabled.calculateFollowingsByfid ? test : test.skip;
testOrSkip("Calculate followings by fid", async () => {
    const followings = await hubUtils.getAllLinksByFid({
        fid: 1791,
        limitPerRequest: 100,
        fromTimestamp: Date.now(),
        toTimestamp:  Date.now() - 1000 * 60 * 60 * 24 * 180,
        newestFirst: true
    })
    console.log(followings);
    expect(followings).toBeDefined();
}, {
    timeout: 20000
})
