# End-to-End Encryption Design Document

## Status: Design Only

**This document describes a potential future E2EE implementation. The current app does NOT implement E2EE.**

## Current Security Model

The app currently uses:
- Firebase Authentication for user identity
- Firestore Security Rules for access control
- Firebase Storage Rules for file access control
- HTTPS for transport encryption

Messages are stored in plaintext in Firestore. Firebase (and administrators with database access) can read message content.

## What E2EE Would Protect

- Message content between the two users
- File content in shared attachments
- Protection from server-side breaches accessing message content
- Protection from admin access to message content

## What E2EE Would NOT Protect

- **Metadata**: sender, recipient, timestamps, message sizes
- **User profiles**: phone numbers, display names
- **Presence information**: typing indicators, last seen
- **Push notification content** (unless generic)
- **Account existence and relationships**

## Key Management Options

### Option 1: Device-Based Keys (Recommended for V1)
- Each device generates a key pair on first login
- Public keys stored in Firestore (encrypted or verified)
- Private keys stored in browser/device secure storage (IndexedDB/Web Crypto)
- Key exchange using X3DH or similar protocol

### Option 2: Password-Derived Keys
- User chooses an encryption password separate from login
- Key derived using PBKDF2/Argon2
- Risk: forgotten password = lost messages

### Option 3: Recovery Key
- Generate recovery key during setup
- User must store securely (paper backup)
- Allows key recovery across devices

## Device Pairing Strategy

1. User logs in on new device
2. New device generates key pair
3. Existing device(s) must approve and exchange keys
4. Options for approval:
   - QR code scan between devices
   - Verification code comparison
   - Trusted device approval notification

## Message Encryption Flow

```
1. Sender composes message
2. Client generates random symmetric key (AES-256-GCM)
3. Message encrypted with symmetric key
4. Symmetric key encrypted with recipient's public key
5. Encrypted payload + encrypted key stored in Firestore
6. Recipient fetches message
7. Recipient decrypts symmetric key with private key
8. Recipient decrypts message with symmetric key
```

## File Encryption Flow

```
1. Sender selects file
2. Client generates file encryption key
3. File encrypted locally before upload
4. Encrypted file uploaded to Firebase Storage
5. File key encrypted with recipient's public key
6. File reference + encrypted key stored in message
7. Recipient downloads encrypted file
8. Recipient decrypts file key and then file content
```

## Backup/Recovery Tradeoffs

| Approach | Pros | Cons |
|----------|------|------|
| No backup | Maximum security | Lost device = lost history |
| Encrypted backup | Recovery possible | Additional complexity, key management |
| Cloud backup with user password | User-friendly | Password strength determines security |
| Recovery key | Strong security if stored safely | User responsibility to store key |

## Lost Device / Lost Key Implications

- **Lost device without backup**: Messages on that device are unrecoverable
- **Stolen device**: If device is unlocked, local keys may be compromised
- **Forgotten password** (if password-derived): All messages unrecoverable
- **Multi-device**: Other devices can continue functioning

Mitigation strategies:
- Encourage device PIN/password
- Implement remote device revocation
- Store encrypted backups with recovery key

## Multi-Device Complications

1. **Key distribution**: Each device needs its own key pair
2. **Message delivery**: Messages must be encrypted for all user devices
3. **Key rotation**: Adding/removing devices requires updating keys
4. **Sync**: Historical messages on new device require re-encryption or backup restoration
5. **Storage**: Message size increases with number of recipient devices (encrypted key per device)

## Push Notification Limitations

With E2EE:
- Server cannot read message content for notifications
- Options:
  1. Generic notifications ("New message from [name]")
  2. Client-side decryption on notification receive (complex, OS-dependent)
  3. Store notification preview separately (weakens E2EE)

Recommendation: Use generic notification titles only.

## Search Limitations

With E2EE:
- Server-side search is impossible (content encrypted)
- Client-side search required
- Options:
  1. Decrypt all messages locally for search (slow)
  2. Build local search index on decryption
  3. No search functionality

## Migration Plan

### Phase 1: Preparation
- Implement key generation and storage
- Add device management UI
- Test key exchange in staging

### Phase 2: Opt-in E2EE
- Users can enable E2EE for new messages
- Old messages remain unencrypted
- Clear UI indication of encryption status

### Phase 3: New Conversations Default
- New conversations use E2EE by default
- Legacy conversations remain unchanged

### Phase 4: Full Migration (Optional)
- Offer to re-encrypt old messages
- Requires both users to be online and approved devices

## Recommended Libraries/APIs

### Web Crypto API (Browser Standard)
- Built-in, audited by browser vendors
- Supports: AES-GCM, RSA-OAEP, ECDH, ECDSA
- Reference: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API

### Signal Protocol (libsignal)
- Industry standard for messaging E2EE
- Implements X3DH key agreement, Double Ratchet
- Well-audited, used by Signal, WhatsApp
- JavaScript: @signalapp/libsignal-client

### TweetNaCl.js
- Simple, audited cryptographic library
- Good for basic encryption needs
- Reference: https://tweetnacl.js.org

### OpenPGP.js
- Standard for key-based encryption
- Well-audited, actively maintained
- Reference: https://openpgpjs.org

## Critical Warnings

1. **Do NOT implement custom cryptography** without expert security review
2. **Do NOT store private keys in plain text** or localStorage without encryption
3. **Do NOT weaken security for convenience** without clear user consent
4. **DO use established, audited protocols** (Signal Protocol, Web Crypto API)
5. **DO get a professional security audit** before shipping E2EE
6. **DO clearly communicate limitations** to users (metadata not protected, etc.)

## Implementation Prerequisites

Before implementing:
1. Security team review of design
2. Threat model documentation
3. Key management implementation tested in isolation
4. Migration plan approved
5. User education materials prepared
6. Professional security audit budget allocated

## References

- Signal Protocol Specification: https://signal.org/docs/
- Web Crypto API: https://www.w3.org/TR/WebCryptoAPI/
- Matrix E2EE Implementation: https://matrix.org/docs/guides/end-to-end-encryption-implementation-guide
- OWASP Cryptographic Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
