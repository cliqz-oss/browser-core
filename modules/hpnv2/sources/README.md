# Human Web Proxy Network (HPN)

We published a blog post on [Human Web Proxy Network (HPN)](https://0x65.dev/blog/2019-12-04/human-web-proxy-network-hpn.html).
It explains why we need HPN and gives an overview of how the protocol works.

There are some aspects that did not made it into the blog post,
but are relevant on a technical level.

## Detecting and Auto-Correcting Clock Drift

When sending messages, we need an accurate clock; otherwise, users
could potentially be de-anonymized based on their clock drift.

The general idea on how to detect and auto-correct it in hpnv2 is as follows:

* Every client fetches the clock time from the server (which each `/config` request).
  The server's clock is the source of truth and can be used to compute the clock drift.
* In parallel, clients run a timer (`setInterval`) which fires every minute.
  As long as the system clock is in sync with the estimated
  time - based on server time plus elapsed minutes - the clock on the client
  can be trusted.

The clock can get out-of-sync for two reasons:

1. The system clock on the user's machine is consistently off
2. The system clock is temporarily outdated after the machine awoke from suspend mode

In case 1, it is easy to correct, as the clock drift remains constant.
Case 2 will force the client to synchronize with the server again.

The code can be found in `trusted-clock.es`.

## Client Side Burst Mitigation

There are recurring situations when clients will send messages
in a coordinated fashion. The effect can be like a
distributed DoS attack on our infrastructure.
As a mitigation, clients can randomly delay messages following
recommendations that we can tuned from the server side.

Ideally, clients should not send messages all at once and these
throttling rules should not be necessary. Still, it can happen
and the mechanism helps us to deal with spikes, without having
to push new releases.

More details can be found in the comments in the code (`message-throttler.es`).
