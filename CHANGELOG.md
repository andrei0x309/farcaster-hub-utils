### 0.1.10

- breaking change: `createCast` now returns the cast hash in string format
- changed the default public hub address to `hub-grpc.pinata.cloud` is the only public hub that I could find working
- added some new methods `getFidReactions`, `getReationsByFidByType`, `getLikesByFid`, `getRecastsByFid`, `getFrameBody`, `getAllLinksByFid`

### 0.1.9

- changed public hub url to `hub.pinata.cloud`
- added more testes
- added methods:
  - `removeRecast`
  - `addRecast`
  - `removeLike`
  - `addLike`
  - `removeReaction`
  - `addReaction`
  - `getCastsByFid`
  - `deleteCast`
  - `createCast`
  - `changeHub`
  - `changeSigner`
- updated README.md
- updated dependencies

### 0.1.7

- Parsed mentions corectly
- added `getFidFromUsername` method
- added `deleteCast` method
- added basic bun tests
