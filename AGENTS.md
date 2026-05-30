# AGENTS.md

Guidance for AI agents working in this repo. Read this before making changes.

## What Pop is

**Pop** is a decentralized guestbook for events, built on [Nostr](https://nostr.com).
A host spins up a guestbook for an event (wedding, conference, birthday, meetup);
guests leave notes, drop photos, and zap the host a little money. There is no
central server holding the data — every entry is a Nostr event, signed by its
author and replicated across relays.

Core ideas:

- **No central server owns the data.** Entries live on Nostr relays, signed by the guest who wrote them.
- **Guestbooks are portable.** A guestbook is addressable by its Nostr event, readable by any Nostr-aware client.
- **Tips are native.** Sending money to the host is a Lightning zap ([NIP-57](https://github.com/nostr-protocol/nips/blob/master/57.md)) — no processor, no account, no chargebacks.

> Status: early scaffold. Only the shell exists — it connects to relays via NDK
> and shows connection status. Most flows in the roadmap are unbuilt.

## Tech stack

- **React 19 + TypeScript** — UI
- **Vite** — build / dev server
- **Tailwind CSS v4** — styling (via `@tailwindcss/vite`)
- **[NDK](https://github.com/nostr-dev-kit/ndk)** (`@nostr-dev-kit/ndk`) — Nostr client: relay pool, subscriptions, signing, zaps
- **Bun** — package manager and runtime

## Architecture & layout

```
src/
  main.tsx        # React entry, mounts <App> in StrictMode
  App.tsx         # current UI: connects to relays, renders connection status
  lib/ndk.ts      # shared NDK singleton — relays, signing, zaps all flow through here
  index.css       # Tailwind entry
index.html        # Vite HTML entry
public/           # favicon + icons
```

Key conventions:

- **One shared NDK instance.** Everything Nostr goes through the singleton in
  [`src/lib/ndk.ts`](src/lib/ndk.ts). Don't construct new `NDK` instances per component.
  `connectNdk()` is idempotent — it caches the connect promise.
- **Relays are configured via env.** `VITE_RELAYS` (comma-separated `wss://` URLs);
  defaults to `wss://relay.damus.io,wss://nos.lol`.
- Tailwind is utility-first inline; no component CSS files.

## Commands

```bash
bun install      # install deps
bun dev          # dev server
bun run build    # tsc -b && vite build
bun run preview  # preview production build
bun run lint     # eslint
```

---

## Nostr primer (how the infra works)

Nostr = **Notes and Other Stuff Transmitted by Relays**. The whole protocol is
small; capability comes from layering conventions (NIPs) on top of two pieces:

- **Events** — every piece of data is a JSON object: `{ id, pubkey, created_at, kind, tags, content, sig }`.
  `id` is the sha256 of the serialized event; `sig` is a Schnorr signature over `id`
  by the author's secp256k1 key. The `kind` (an integer) decides what the event *means*.
- **Relays** — dumb WebSocket servers that store events and serve them by filter.
  Clients publish to many relays and subscribe across many relays. Relays don't
  trust each other or talk to each other; redundancy comes from clients fanning out.

Identity is a keypair. `npub.../nsec...` are bech32 encodings ([NIP-19](https://github.com/nostr-protocol/nips/blob/master/19.md))
of the public/secret key. There are no accounts — your key *is* your identity, on
every relay and every client.

**Event-kind ranges** (rough rules from [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md)):

- `1000–9999`: regular (relays store all of them)
- `10000–19999`: **replaceable** (relay keeps only the newest per `pubkey`+`kind`) — e.g. profile, relay list
- `20000–29999`: **ephemeral** (relays don't store; used for transient signaling)
- `30000–39999`: **addressable / parameterized-replaceable** (newest per `pubkey`+`kind`+`d`-tag) — the basis for "documents" like long-form posts, lists, and **likely Pop's guestbook + entries**

## NIPs that power what Nostr can do

NIP = *Nostr Implementation Possibility*. Full index:
<https://github.com/nostr-protocol/nips>. They're an à-la-carte menu — implement
only what a use case needs. Distilled by capability:

### Foundation (almost everything builds on these)

| NIP | Capability |
| --- | --- |
| [01](https://github.com/nostr-protocol/nips/blob/master/01.md) | Core protocol: event format, signatures, relay REQ/EVENT/EOSE messages, filters, kind ranges |
| [11](https://github.com/nostr-protocol/nips/blob/master/11.md) | Relay Information Document — a relay advertises its limits, supported NIPs, fees |
| [19](https://github.com/nostr-protocol/nips/blob/master/19.md) | `npub`/`nsec`/`note`/`naddr`/`nevent` bech32 entities — shareable, self-describing references |
| [21](https://github.com/nostr-protocol/nips/blob/master/21.md) | `nostr:` URI scheme for deep-linking entities |
| [65](https://github.com/nostr-protocol/nips/blob/master/65.md) | Relay List Metadata — where a user reads/writes, so clients know which relays to hit ("outbox model") |

### Identity, profiles, social graph

| NIP | Capability |
| --- | --- |
| [02](https://github.com/nostr-protocol/nips/blob/master/02.md) | Follow list |
| [05](https://github.com/nostr-protocol/nips/blob/master/05.md) | Human-readable `name@domain` verification mapped to a pubkey via DNS/HTTPS |
| [39](https://github.com/nostr-protocol/nips/blob/master/39.md) | Link external identities (GitHub, Twitter) to a profile |
| [51](https://github.com/nostr-protocol/nips/blob/master/51.md) | Lists / sets (mute, pin, bookmarks, custom curated sets) |

### Signing & key management (relevant to Pop's sign-in)

| NIP | Capability |
| --- | --- |
| [07](https://github.com/nostr-protocol/nips/blob/master/07.md) | `window.nostr` browser-extension signer (Alby, nos2x). **Pop's primary host login.** Key never touches the app |
| [46](https://github.com/nostr-protocol/nips/blob/master/46.md) | Remote signing ("Nostr Connect") — sign from a separate device/app |
| [49](https://github.com/nostr-protocol/nips/blob/master/49.md) | Encrypt an `nsec` with a passphrase for at-rest storage |
| [42](https://github.com/nostr-protocol/nips/blob/master/42.md) | Client→relay authentication (for relays that gate read/write) |

### Content kinds (what guestbook entries could be)

| NIP | Capability |
| --- | --- |
| [10](https://github.com/nostr-protocol/nips/blob/master/10.md) | Text notes & threads (`e`/`p` tag reply conventions) |
| [22](https://github.com/nostr-protocol/nips/blob/master/22.md) | Generic threaded **comments** (kind `1111`) on any addressable object — a strong fit for guestbook entries |
| [23](https://github.com/nostr-protocol/nips/blob/master/23.md) | Long-form addressable content |
| [25](https://github.com/nostr-protocol/nips/blob/master/25.md) | Reactions (likes/emoji) |
| [18](https://github.com/nostr-protocol/nips/blob/master/18.md) | Reposts |
| [27](https://github.com/nostr-protocol/nips/blob/master/27.md) | Inline `nostr:` mentions/references in note content |

### Media / images (relevant to "drop photos")

| NIP | Capability |
| --- | --- |
| [B7](https://github.com/nostr-protocol/nips/blob/master/B7.md) | **Blossom** — content-addressed blob storage on media servers. Current recommended way to host images |
| [94](https://github.com/nostr-protocol/nips/blob/master/94.md) | File Metadata events (hash, mime, dimensions) describing a hosted file |
| [92](https://github.com/nostr-protocol/nips/blob/master/92.md) | `imeta` tags — attach media metadata inline on a note |
| [98](https://github.com/nostr-protocol/nips/blob/master/98.md) | HTTP Auth — sign an HTTP request with your Nostr key (used by media servers) |

> Note: [NIP-96](https://github.com/nostr-protocol/nips/blob/master/96.md) (HTTP file storage) is deprecated in favor of Blossom.

### Money / Lightning (relevant to "zap the host")

| NIP | Capability |
| --- | --- |
| [57](https://github.com/nostr-protocol/nips/blob/master/57.md) | **Lightning Zaps** — public, verifiable Lightning tips attached to a note/profile. **Pop's tipping mechanism.** Needs a Lightning address on the host's profile (kind `0` `lud16`) |
| [75](https://github.com/nostr-protocol/nips/blob/master/75.md) | Zap Goals — fundraising targets |
| [47](https://github.com/nostr-protocol/nips/blob/master/47.md) | Nostr Wallet Connect — remote-control a Lightning wallet to *send* zaps |
| [60](https://github.com/nostr-protocol/nips/blob/master/60.md) / [61](https://github.com/nostr-protocol/nips/blob/master/61.md) | Cashu ecash wallet + "nutzaps" (token-based tips) |

### Privacy & encryption

| NIP | Capability |
| --- | --- |
| [44](https://github.com/nostr-protocol/nips/blob/master/44.md) | Versioned encrypted payloads (modern crypto; replaces NIP-04) |
| [59](https://github.com/nostr-protocol/nips/blob/master/59.md) | Gift Wrap — hide metadata (sender, kind) by nesting sealed events |
| [17](https://github.com/nostr-protocol/nips/blob/master/17.md) | Private DMs (built on 44 + 59) |

### Moderation / housekeeping (relevant to host moderation tools + export)

| NIP | Capability |
| --- | --- |
| [09](https://github.com/nostr-protocol/nips/blob/master/09.md) | Event deletion *requests* (advisory — relays may honor) |
| [56](https://github.com/nostr-protocol/nips/blob/master/56.md) | Reporting events/users |
| [36](https://github.com/nostr-protocol/nips/blob/master/36.md) | Content warnings / sensitive-content tagging |
| [40](https://github.com/nostr-protocol/nips/blob/master/40.md) | Expiration timestamps — events that self-expire |
| [70](https://github.com/nostr-protocol/nips/blob/master/70.md) | Protected events — only the author may publish them |
| [50](https://github.com/nostr-protocol/nips/blob/master/50.md) | Search capability (relay-side full-text) |

### Discovery / app glue

| NIP | Capability |
| --- | --- |
| [89](https://github.com/nostr-protocol/nips/blob/master/89.md) | Recommended application handlers — "open this kind in app X" |
| [78](https://github.com/nostr-protocol/nips/blob/master/78.md) | App-specific data (kind `30078`) — store private app config/state as an addressable event |

## How the NIPs map onto Pop

| Pop feature | Likely NIP(s) |
| --- | --- |
| Sign in (host) | [07](https://github.com/nostr-protocol/nips/blob/master/07.md), fallback generated key + [49](https://github.com/nostr-protocol/nips/blob/master/49.md) |
| Create a guestbook | addressable event (kind `30000`-range) with a `d` tag; reference via [19](https://github.com/nostr-protocol/nips/blob/master/19.md) `naddr` |
| Leave a note | [22](https://github.com/nostr-protocol/nips/blob/master/22.md) comment tagged to the guestbook `naddr`, or a plain note |
| Attach a photo | [B7](https://github.com/nostr-protocol/nips/blob/master/B7.md) Blossom upload + [92](https://github.com/nostr-protocol/nips/blob/master/92.md)/[94](https://github.com/nostr-protocol/nips/blob/master/94.md) metadata |
| Zap the host | [57](https://github.com/nostr-protocol/nips/blob/master/57.md) (host needs `lud16` on kind `0`) |
| Shareable link / QR | [19](https://github.com/nostr-protocol/nips/blob/master/19.md) `naddr` + [21](https://github.com/nostr-protocol/nips/blob/master/21.md) `nostr:` URI |
| Knowing which relays to hit | [65](https://github.com/nostr-protocol/nips/blob/master/65.md) relay lists |
| Host moderation | [09](https://github.com/nostr-protocol/nips/blob/master/09.md) deletion requests, [56](https://github.com/nostr-protocol/nips/blob/master/56.md) reporting |

> These are design directions, not yet implemented. Confirm the kind/tag scheme
> before building a flow — pick the smallest set of NIPs that satisfies it.

## Working agreements for agents

- Keep all Nostr access flowing through the single NDK instance in [`src/lib/ndk.ts`](src/lib/ndk.ts).
- Don't hardcode relay URLs in components; use the env-driven list.
- Prefer existing NDK helpers (signers, zapper, fetchEvents/subscribe) over hand-rolling relay messages.
- When introducing a new event kind or tag scheme, document the choice and cite the NIP.
- Match the existing style: TypeScript, functional React components, Tailwind utilities inline. Run `bun run lint` before finishing.
- This is a WIP scaffold — don't assume flows exist; check the code.
