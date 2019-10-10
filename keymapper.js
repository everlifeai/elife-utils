const ED25519_KEY_SUFFIX = ".ed25519";

function unescapeFromUrlSafe(base64str) {
    return (base64str + '==='.slice((base64str.length + 3) % 4))
        .replace(/-/g, '+')
        .replace(/_/g, '/')
}

function escapeToUrlSafe(base64str) {
    return base64str.replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
}

function toUrlSafeEd25519Key(ed25519PublicKey) {
    if (ed25519PublicKey.slice(-ED25519_KEY_SUFFIX.length) !== ED25519_KEY_SUFFIX) {
        throw new Error("Invalid key format");
    }
    return escapeToUrlSafe(ed25519PublicKey.slice(0, -ED25519_KEY_SUFFIX.length));
}

function fromUrlSafeEd25519Key(urlSafeEd25519PublicKey) {
    return unescapeFromUrlSafe(urlSafeEd25519PublicKey)+ED25519_KEY_SUFFIX;
}

module.exports = {
    fromUrlSafeEd25519Key,
    toUrlSafeEd25519Key
}