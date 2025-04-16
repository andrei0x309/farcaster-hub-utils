## farcaster-hub-utils

Simple library to simplify the interaction with the Farcaster Hub.
Works with a private an authorized signer key and account fid.

### Basic Usage

```typescript
import { FCHubUtils } from 'farcaster-hub-utils';
import { PK, FID, HUB_URL, HUB_USER, HUB_PASS } from './secret';

const fcHubUtils = new FCHubUtils(PK, FID, HUB_URL?, HUB_USER?, HUB_PASS?);

// Invoke some interaction with the hub

const castText = 'Hello World!';

fcHubUtils.createFarcasterPost({
    content: castText,
})

```

### Available Methods

#### Methods user should use

- `createFarcasterPost` - Create a new cast
- `createCast` - Alias for `createFarcasterPost`
- `deleteCast` - Delete a cast
- `getCastsByFid` - Get casts for feed in a specific time range, time range can be used to paginate
- `changeHub` - Change The instance to use a different hub (useful for balancing)
- `changeSigner` - Change The instance to use a different signer (useful to switch between accounts and conserve memory)
- `addLike` - Add a like to a cast
- `removeLike` - Remove a like from a cast
- `addRecast` - Add a recast to a cast
- `removeRecast` - Remove a recast from a cast
- `getFidFromUsername` - Get the fid from a username
- `getCastFromHash` - Get a specific cast by hash and fid

**Note 1:** The `createFarcasterPost` method is an alias for `createCast`

**Note 2:** Also check [Changelog](./CHANGELOG.md) for more methods

#### Internal Methods ( lower level )

- `publishCast` - Publish a cast to the hub
- `byteLength` - Get the byte length of a string
- `parseEmbeds` - Parse embeds from a string as { url: string }[]
- `parseFarcasterMentions` - Parse mentions from a string as { mentions, mentionsPositions, mentionsText }
- `addReaction` - Lower level method to add a reaction to a cast
- `removeReaction` - Lower level method to remove a reaction from a cast


### Changelog

[Changelog](./CHANGELOG.md)

### Notes

- The `PK` is the private key of the signer.
- The `FID` is the account fid.
- HUB_URL, HUB_USER, HUB_PASS are optional parameters to connect to the hub, if not provided, an public hub will be used.
- creating cast methods support, posting to channels, and replying to posts and post media if you have supported media public urls.

### Upcoming Features

- add more features
- add more tests
