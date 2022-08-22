export default interface Message {
    id: string;
    type: number;
    content: string;
    channel_id: string;
    author: Author;
    attachments: any[];
    embeds: any[];
    mentions: Mention[];
    mention_roles: any[];
    pinned: boolean;
    mention_everyone: boolean;
    tts: boolean;
    timestamp: string;
    edited_timestamp?: any;
    flags: number;
    components: any[];
    reactions?: Reaction[];
    message_reference?: Messagereference;
    referenced_message?: Referencedmessage;
    webhook_id?: string;
}

interface Referencedmessage {
    id: string;
    type: number;
    content: string;
    channel_id: string;
    author: Author2;
    attachments: any[];
    embeds: any[];
    mentions: Mention[];
    mention_roles: any[];
    pinned: boolean;
    mention_everyone: boolean;
    tts: boolean;
    timestamp: string;
    edited_timestamp?: any;
    flags: number;
    components: any[];
    webhook_id: string;
}

interface Author2 {
    bot: boolean;
    id: string;
    username: string;
    avatar?: any;
    discriminator: string;
}

interface Messagereference {
    channel_id: string;
    guild_id: string;
    message_id: string;
}

interface Reaction {
    emoji: Emoji;
    count: number;
    me: boolean;
}

interface Emoji {
    id: string;
    name: string;
}

interface Mention {
    id: string;
    username: string;
    avatar: string;
    avatar_decoration?: any;
    discriminator: string;
    public_flags: number;
}

interface Author {
    id: string;
    username: string;
    avatar?: string;
    avatar_decoration?: any;
    discriminator: string;
    public_flags?: number;
    bot?: boolean;
}
