export interface ShowIdentifiedEvent {
	mediaItemId: string;
	provider: string;
	externalId: string;
	userApiKey?: string;
}

export interface ImageCacheRequestEvent {
	mediaItemId: string;
	sourceUrl: string;
}

export interface MediaItemChangedEvent {
	userId: string;
}

export interface MediaItemDeletedEvent {
	mediaItemId: string;
}

export interface LogEntryChangedEvent {
	userId: string;
}
