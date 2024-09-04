import {
	makeCastRemove,
	NobleEd25519Signer,
	FarcasterNetwork,
	makeCastAdd,
	CastAddBody,
	CastType,
	getSSLHubRpcClient,
	getAuthMetadata,
	Message,
	ReactionType,
	makeReactionAdd,
	makeReactionRemove,
} from '@farcaster/hub-nodejs';

const FC_TIMESTMAP_OFFSET = 1609459200

class FCHubUtils {
	private PK: string;
	private HUB_URL: string = "hub.pinata.cloud";
	private HUB_USER: string = "";
	private HUB_PASS: string = "";
	private signer: NobleEd25519Signer;
	private hubClient: ReturnType<typeof getSSLHubRpcClient>;
	private hubClientAuthMetadata: ReturnType<typeof getAuthMetadata>;
	private fid: number; // 709233

	constructor(
		PK: string, fid: number,
		HUB_URL?: string,
		HUB_USER?: string,
		HUB_PASS?: string,
	) {
		if (HUB_URL) {
			if (HUB_URL.includes('//')) {
				HUB_URL = HUB_URL.split('//')[1];
			}

			if (HUB_URL.includes('/')) {
				HUB_URL = HUB_URL.split('/')[0];
			}

			this.HUB_URL = HUB_URL;
		}
		if (HUB_USER) {
			this.HUB_USER = HUB_USER;
		}
		if (HUB_PASS) {
			this.HUB_PASS = HUB_PASS;
		}
		this.PK = PK;
		this.fid = fid;
		this.signer = new NobleEd25519Signer(Buffer.from(this.PK.replace('0x', ''), 'hex'));
		this.hubClient = getSSLHubRpcClient(this.HUB_URL);
		this.hubClientAuthMetadata = getAuthMetadata(this.HUB_USER, this.HUB_PASS);
	}
 
	changeSigner = (PK: string) => {
		try {
			this.signer = new NobleEd25519Signer(Buffer.from(PK.replace('0x', ''), 'hex'));
			this.PK = PK;
			return true
		} catch (e) {
			console.error(`Failed to change signer to PK=${PK} err=${e}`)
			return false
		}
	}

	 changeHub = async ({
		HUB_URL,
		HUB_USER,
		HUB_PASS,
	}: {
		HUB_URL?: string,
		HUB_USER?: string,
		HUB_PASS?: string,
	}) => {
		try {
			if (HUB_URL) {
				if (HUB_URL.includes('//')) {
					HUB_URL = HUB_URL.split('//')[1];
				}
			}
			if (HUB_USER) {
				this.HUB_USER = HUB_USER;
			} else {
				this.HUB_USER = "";
			}
			if (HUB_PASS) {
				this.HUB_PASS = HUB_PASS;
			} else {
				this.HUB_PASS = "";
			}
			if (!HUB_URL) {
				throw new Error('HUB_URL is required')
			}
			await this.hubClient.close()
			this.HUB_URL = HUB_URL;
			this.hubClient = getSSLHubRpcClient(this.HUB_URL);
			this.hubClientAuthMetadata = getAuthMetadata(this.HUB_USER, this.HUB_PASS);
			return true
		} catch (e) {
			console.error(`Failed to change hub url to HUB_URL=${HUB_URL} err=${e}`)
			return false
		}
	}

	getFidFromUsername = async (username: string) => {
		try {
			const user = await this.hubClient.getUsernameProof({
				name: new TextEncoder().encode(username),
			})
			if (!user.isOk()) {
				throw new Error(user._unsafeUnwrapErr().toString())
			}
			return user._unsafeUnwrap().fid
		} catch (e) {
			console.error(`Failed to get fid from username=${username} err=${e}`)
			return null
		}
	}

	getCastFromHash = async (hash: string, fid: number) => {
		try {
			const cast = await this.hubClient.getCast({
				hash: Buffer.from(hash, 'hex'),
				fid: fid
			})
			if (!cast.isOk()) {
				throw new Error(cast._unsafeUnwrapErr().toString())
			}

			const castData = cast._unsafeUnwrap()

			if (castData.data?.castAddBody) {
				return castData.data.castAddBody as CastAddBody;
			}
			return null
		} catch (e) {
			console.error(`Failed to get cast from hash=${hash} err=${e}`)
			return null
		}
	}


	publishCast = async (
		castAdd: CastAddBody,
	): Promise<Uint8Array> => {
		if (!this.signer) {
			throw new Error('Failed to retrieve farcaster signer')
		}

		const dataOptions = {
			fid: this.fid,
			network: FarcasterNetwork.MAINNET
		}

		const cast = await makeCastAdd(
			castAdd,
			dataOptions,
			this.signer
		)

		if (!cast.isOk()) {
			throw new Error(cast._unsafeUnwrapErr().toString())
		}

		const castMessage = await this.hubClient.submitMessage(cast._unsafeUnwrap(), this.hubClientAuthMetadata)

		if (!castMessage.isOk()) {
			const hubError = castMessage._unsafeUnwrapErr().toString()
			console.error(`Failed to publish cast due to network error castAdd=${JSON.stringify(castAdd)} fid=${this.fid} err=${hubError}`)
			throw new Error(hubError)
		}

		return castMessage._unsafeUnwrap().hash
	}

	byteLength = (str: string) => Buffer.byteLength(str, 'utf8')

	parseEmbeds (text: string) {
		const URL_REGEX = /http[s]?:\/\/.*?( |\n|\t|$){1}/igm
		return (text.match(URL_REGEX) || []).map((url) => url.replace(' ', '')).map((url) => {
			return { url }
		})
	}

	async parseFarcasterMentions (text: string) {
		const reResults = [...text.matchAll(/@\w+(.eth)?/g)]
		const mentions: number[] = []
		const mentionsPositions: number[] = []
		let mentionsText = text
		let offset = 0
		for (const reResult of reResults) {
			const mention = reResult[0].slice(1)
			const position = this.byteLength(text.slice(0, (reResult.index)))
			const fid = await this.getFidFromUsername(mention)
			if (fid === null) {
				continue
			}
			mentions.push(fid)
			mentionsPositions.push(position - offset)
			mentionsText = mentionsText.replace(`@${mention}`, '')
			offset += this.byteLength(`@${mention}`)
		}

		return {
			mentions,
			mentionsPositions,
			mentionsText
		}
	}


	createFarcasterPost = async ({
		media = [] as Array<{ farcaster: string }>,
		content = '',
		replyTo = undefined as { hash: string; fid: string } | undefined,
	}) => {
		const text = content

		const byteLength = Buffer.byteLength(text, 'utf8')
		let isLongCast = false

		if (byteLength > 320) {
			isLongCast = true
		}

		if (byteLength > 1024) {
			throw new Error('Post exceeds Farcaster character limit')
		}

		const publishContent: CastAddBody = {
			text,
			mentions: [],
			mentionsPositions: [],
			embeds: [],
			embedsDeprecated: [],
			type: isLongCast ? CastType.LONG_CAST : CastType.CAST
		}

		if (media) {
			publishContent.embeds = media.slice(0, 2).map(m => ({ url: m.farcaster }))
		}

		publishContent.embeds = publishContent.embeds.concat(this.parseEmbeds(text)).slice(0, 2)

		const { mentions, mentionsPositions, mentionsText } = await this.parseFarcasterMentions(text)
		publishContent.mentions = mentions
		publishContent.mentionsPositions = mentionsPositions
		publishContent.text = mentionsText

		if (replyTo?.hash) {
			const hash = replyTo.hash.startsWith('0x') ? replyTo.hash.slice(2) : replyTo.hash
			publishContent.parentCastId = {
				fid: Number(replyTo.fid),
				hash: Buffer.from(hash, 'hex')
			}
		} else {
			publishContent.parentUrl = String(replyTo)
		}

		const hash = await this.publishCast(publishContent)

		return hash
	}

	createCast = async ({
		media = [] as Array<{ farcaster: string }>,
		content = '',
		replyTo = undefined as { hash: string; fid: string } | undefined,
	}) => {
		return await this.createFarcasterPost({
			media,
			content,
			replyTo
		})
	}

	deleteCast = async (hash: string) => {
		try {
			const deleteCastMessage = await makeCastRemove({
				targetHash: Buffer.from(hash, 'hex'),
			}, {
				fid: this.fid,
				network: FarcasterNetwork.MAINNET
			}, this.signer)

			if (!deleteCastMessage.isOk()) {
				const hubError = deleteCastMessage._unsafeUnwrapErr().toString()
				console.error(`Failed to delete cast due to network error hash=${hash} fid=${this.fid} err=${hubError}`)
				return false
			}

			const deleteCastResponse = await this.hubClient.submitMessage(deleteCastMessage._unsafeUnwrap(), this.hubClientAuthMetadata)

			if (!deleteCastResponse.isOk()) {
				const hubError = deleteCastResponse._unsafeUnwrapErr().toString()
				console.error(`Failed to delete cast due to network error hash=${hash} fid=${this.fid} err=${hubError}`)
				return false
			}

			return true

		} catch (e) {
			console.error(`Failed to delete cast due to network error hash=${hash} fid=${this.fid} err=${e}`)
			return false
		}
	}

	getCastsByFid = async ({
		fid,
		limit = 10,
		newestFirst = true,
		fromTimestamp = Date.now(),
		toTimestamp = 0
	}: {
		fid: number,
		limit?: number,
		newestFirst?: boolean,
		fromTimestamp?: number,
		toTimestamp?: number,
	}) => {
		try {

			if (limit > 100) {
				limit = 100
				console.warn(`Limit was set to max value of 100`)
			}

			if (toTimestamp && fromTimestamp < toTimestamp) {
				throw new Error('Invalid timestamp range, fromTimestamp must be greater than toTimestamp')
			}

			if (fromTimestamp > Date.now()) {
				throw new Error('Invalid fromTimestamp value, must be less or equal to current time')
			}

			fromTimestamp = fromTimestamp / 1000
			fromTimestamp = Math.trunc(fromTimestamp - FC_TIMESTMAP_OFFSET)
			toTimestamp = toTimestamp / 1000
			if (toTimestamp - FC_TIMESTMAP_OFFSET > 0) {
				toTimestamp = Math.trunc(toTimestamp - FC_TIMESTMAP_OFFSET)
			}

			const casts = await this.hubClient.getAllCastMessagesByFid({
				fid,
				reverse: newestFirst,
				pageSize: limit,
				startTimestamp: toTimestamp,
				stopTimestamp: fromTimestamp
			})


			if (!casts.isOk()) {
				throw new Error(casts._unsafeUnwrapErr().toString())
			}


			const mapCasts = casts._unsafeUnwrap().messages.map((m: Message) => {

				return {
					hash: Buffer.from(m.hash).toString('hex'),
					fid: m.data?.fid,
					cast: m.data?.castAddBody,
					timestamp: (m.data?.timestamp ?? 0) * 1000 + FC_TIMESTMAP_OFFSET * 1000
				}
			})

			return {
				casts: mapCasts
			}

		} catch (e) {
			console.error(`Failed to get latest casts from fid=${fid} err=${e}`)
			return null
		}
	}

	addReaction = async (hash: string, fid: number, reactionType: ReactionType) => {
		try {

			const reactionMessage = await makeReactionAdd({
				targetCastId: {
					fid,
					hash: Buffer.from(hash, 'hex')
				},
				type: reactionType
			}, {
				fid: this.fid,
				network: FarcasterNetwork.MAINNET
			}, this.signer)

			const submitReactionMessage = await this.hubClient.submitMessage(reactionMessage._unsafeUnwrap(), this.hubClientAuthMetadata)
			if (!submitReactionMessage.isOk()) {
				const hubError = reactionMessage._unsafeUnwrapErr().toString()
				console.error(`Failed to add reaction due to network error hash=${hash} err=${hubError}`)
				return false
			}

			return true
		} catch (e) {
			console.error(`Failed to add reaction due to network error hash=${hash} err=${e}`)
			return false
		}
	}

	removeReaction = async (hash: string, fid: number, reactionType: ReactionType) => {
		try {

			const reactionMessage = await makeReactionRemove({
				targetCastId: {
					fid,
					hash: Buffer.from(hash, 'hex')
				},
				type: reactionType
			}, {
				fid: this.fid,
				network: FarcasterNetwork.MAINNET
			}, this.signer)

			const submitReactionMessage = await this.hubClient.submitMessage(reactionMessage._unsafeUnwrap(), this.hubClientAuthMetadata)
			if (!submitReactionMessage.isOk()) {
				const hubError = reactionMessage._unsafeUnwrapErr().toString()
				console.error(`Failed to remove reaction due to network error hash=${hash} err=${hubError}`)
				return false
			}

			return true
		} catch (e) {
			console.error(`Failed to remove reaction due to network error hash=${hash} err=${e}`)
			return false
		}
	}

	addLike = async (hash: string, fid: number) => {
		return await this.addReaction(hash, fid, ReactionType.LIKE)
	}

	removeLike = async (hash: string, fid: number) => {
		return await this.removeReaction(hash, fid, ReactionType.LIKE)
	}

	addRecast = async (hash: string, fid: number) => {
		return await this.addReaction(hash, fid, ReactionType.RECAST)
	}

	removeRecast = async (hash: string, fid: number) => {
		return await this.removeReaction(hash, fid, ReactionType.RECAST)
	}

}

export { FCHubUtils }
