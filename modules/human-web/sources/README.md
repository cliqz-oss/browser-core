# Human Web Overview

The Human Web was featured in our tech blog:
[Human Web - Collecting data in a socially responsible manner](https://0x65.dev/blog/2019-12-03/human-web-collecting-data-in-a-socially-responsible-manner.html).
We recommend to start with it first, as it is the most recent source of information (published: 3th Dec 2019).
If there are conflicts with the documentation below (copied from the
[older documentation](https://gist.github.com/solso/423a1104a9e3c1e3b8d7c9ca14e885e5))
the information from the tech blog article should be preferred.

## Motivation

Human Web is a methodology and system developed by Cliqz to collect data from users while protecting their privacy and anonymity.

Cliqz needs data to power the services it offers: search, tracking protection, anti-phishing,  etc. This data, provided by Cliqz users, is collected in a very different way than typical data collection. We want to depart from the current standard model, where users must trust that the company collecting the data will not miss-use it, ever, in any circumstance.

Legal obligations aside, there are many ways this trust model can fail. Hackers can steal data. Governments can issue subpoenas, or get direct access to the data. Unethical employees can dig on the data for personal interests. Companies can go bankrupt and the data auctioned to the highest bidder. Finally, companies can unilaterally decide to change their privacy policies. 

In the current model the user has little control. This is not something that we want to be part of, if only for selfish reasons. We use our own products, and consequently, our own data is collected. We are not comfortable with only a promise based on a Terms of Service and Privacy Policy agreement. It is not enough for us, should not be enough for our users either. As someone once said, if you do not like reality feel free to change it. The Human Web is our proposal for a more responsible and less invasive data collection from users. 


## Fundamentals

The fundamental idea of the Human Web data collection is simple: **to actively prevent [Record Linkage](https://en.wikipedia.org/wiki/Record_linkage)**.

Record linkage is basically the ability to know that multiple data elements, e.g. messages, records, come from the same user. This linkage leads to sessions, and these sessions, are very dangerous with regards to privacy. For instance, [Google Analytics data can be used to build sessions that can sometimes be de-anonymized by anyone that has access to them]( http://josepmpujol.net/public/papers/big_green_tracker.pdf). Was it intentional? Most likely not. Will Google Analytics try to de-anonymize the data? I bet not. But still, the session is there, stored somewhere, and trust that it is not going to be misused is the only protection we have.
The Human Web basically is a methodology and system designed to collect data, which cannot be turned into sessions once they reached Cliqz. How? Because any user-identifier that could be used to link records as belonging to the same person are strictly forbidden, not only explicit UID’s but also implicit ones. Consequently, aggregation of user’s data in the server-side (on Cliqz premises) is not technically feasible, as we have no means to know who is the original owner of the data.

This is a strong departure from the industry standard of data collections. Let us illustrate it with an example (a real one),

Since Cliqz is a search engine we need to know for which queries our results are not good enough. A very legitimate use-case, let’s call it **bad-queries**. How do we achieve this?

It is easy to do if the user’s help us with their data. Simply observe the event in which a user does a query **q** in Cliqz and then, within one hour, does the same query on a different search engine. That would be a good signal that Cliqz’s results for query **q** need to be improved. There are several approaches to collect the data needed for quality assesssment. We want to show you why the industry standard approach has privacy risks.

Let’s first start with the typical way to collect data: the **server-side aggregation**,

We would collect URLs for search engine result pages, the query and search engine can be extracted from the RUL. We would also need to keep a timestamp and a UID so that we know which queries were done by the same person. With this data. It is then straightforward to implement a script that finds the bad-queries we are looking for. 

The data that we would collect with the server-side aggregation approach would look like that, 

	...
	SERP=cliqz.com/q=firefox hq address, UID=X, TIMESTAMP=2016...
	SERP=google.com/q=firefox hq address, UID=X, TIMESTAMP=2016...
	SERP=google.com/q=facebook cristina grillo, UID=X, TIMESTAMP=2016...
	SERP=google.com/q=trump for president, UID=Y, TIMESTAMP=2016...
	...

A simple script would traverse the file(s) checking for the repetitions of the tuple UID and query within one hour interval. By doing so, in the example, we would find that the query **”firefox hq address”** seems to be problematic. Problem solved? Yes.

This data in fact can be used to solve many other use-cases. The problem is, that some of this additional use-cases are extremely privacy sensitive. 

With this data, we could build a session for a user, let’s say user with then anonymous UID *X*,

	user=XXX, queries={'firefox hq address','facebook cristina grillo'}

suddenly we have the full history of that persons search queries! On top of that, perhaps one of the queries contain personal identifiable information (PIII) that puts a real name to the user *X*. That was never the intention of whoever collected the data. But now the data exists, and the user can only trust that her search history is not going to be misused by the company that collected it.

This is what happens when you collect data that can be aggregated by UID on the server-side. It can be used to build sessions. And the scope of the session is virtually unbounded, for the good, solving many use-cases, and for the bad, compromising the user’s privacy.

### How does Cliqz solves the use-case then?

We do not want to aggregate the user’s data on the server due to privacy implications, and at some point, all the queries of the user in a certain timeframe must be accessible somewhere otherwise we cannot resolve the use-case. But that place does not need to be on the server-side, it can be done on the client, in the browser. We called it **Client-side aggregation**.

What we do is to move the script that detects **bad_queries** to the browser, run it against the queries that the user does in real-time and then, when all conditions are met, send the following data back to our servers,

	...
	type=bad_query,query=firefox hq address,target=google
	...

This is exactly what we were looking for, examples of bad queries. Nothing more, nothing less.

The aggregation of user’s data, can always be done on the client-side, i.e. the user device and therefore under the full control of the user. That is the place to do it. As a matter of fact, this is the only place where it should be allowed.

The snippet above satisfies the **bad_queries** use- and most likely will not be reusable for other use-cases, that is true, but it comes without any privacy implication or side-effect.

The query itself could contain sensitive information, of course, but even in that case, that we could associate that record to a real person, but that would be the only information that would be learned. Think what happens on the **server-side aggregation** model. The complete session of that user would be compromised, all the queries in her history. Or only a fraction of it is the company collecting that data was sensitive enough to not use permanent UIDs. Still, unnecessary. And sadly, server-side aggregation is the norm not the exception.

Client-side aggregation has some drawbacks, namely

* It requires a change on mindset by the developers.
* Processing and mining data implies code to be deployed and run on the client-side. 
* The data collected might not be suitable to satisfy other use-cases. Because data collected has been aggregated by users, it might not be reusable.
* Aggregating past data might not be possible as the data to be aggregated may no longer be available on the client.

However, these drawbacks are a very small price to pay in return to the ease of mind of knowing that the data being collected cannot be transformed into sessions with uncontrollable privacy side-effects.

The goal of Human Web is not so much to anonymize data, for that purpose there are good methods like differential privacy, l-diversity, etc. Rather than trying to preserve the privacy of a data-set that contains sensitive information, the aim of Human Web is to prevent those data-set to be collected in the first place. 


# UIDs are pervasive

We hope that we convinced you that there are alternatives to the standard server-side aggregation. We can get rid of UIDs and the session they generate by changing the approach of data collection to client-side. Such approach is general, it satisfies a wide-range of use-cases. As a matter of fact, we have yet to find a use-case that cannot be satisfied by client-side aggregation alone.
 
Client-side aggregation at Cliqz is done at the browser level. However, it is perfectly possible to do the same using only standard javascript and HTML5, check out a [prototype of a Google Analytics look-alike](http://site1.test.cliqz.com/) (part of the [Data Collection without Privacy Side-Effects](http://josepmpujol.net/public/papers/big_green_tracker.pdf) short paper.

The client-side aggregation is the approach to remove **explicit UIDs**. The UIDs that are added to make the data linkable on the server-side. However, even if you remove all explicit UIDs the job is not done. There are more UIDs than the explicit ones…

## Communication UIDs

Data needs to be transported from the user’s device to the data collection servers. This communication, if direct, can be used to establish record-linkage via network level information such as IP and other network level data, doubling as UIDs.

Anonymous communication is a well-studied problem that has off the shelf solutions like [TOR](https://www.torproject.org/). Unfortunately we cannot rely on TOR because it was not designed to account for message replays; a malicious actor could try to send multiple messages unlawfully inflating the popularity of page of their choice, and consequently, affecting the ranking of our search engine. To achieve replay protection and anonymous communication we had to devise an alternative sub-system called HPN (HumanWeb Proxy Network).

For instance, we want to collect the audience of a certain domain. When a user visits a web page whose domain has not been visited in the last natural day the following message will be emitted,

	{url-visited: 'http://josepmpujol.net/', timestamp: '2016-10-10'}

If all users are normative we can assume that if the above message is received 100 times, it means that 100 different users visited that domain on October 10th 2016. However, there is a non-zero chance that not all users are “normative”. 
 
A malicious actor can exploit this setup to artificially inflate the popularity of a site. He only needs to replay the message as much as he wants. Given that we have absolutely no information about the user sending the data, how can we known if 100 messages from the 100 different users and not from a single malicious one?
 
HPN solves this issue by filtering out this kind of attacks by heavy use of crypto, which allow us to filter out repeated messages from the same user without ever knowing anything about the user. 

Please check the paper [Preventing Attacks on Anonymous Data Collection](https://arxiv.org/abs/1812.07927). The source code is always available:

* [extension code](https://github.com/cliqz-oss/browser-core/tree/master/modules/hpnv2)
* [anonymous-credentials](https://github.com/cliqz-oss/anonymous-credentials) (the crypto part, implementing the paper)

## Implicit UIDs

We have seen that we get rid of the need to explicit UIDs by using client-side aggregation and communication UIDs by using the Human Web proxy network. However, there is still another big group of user identifiers: the implicit UIDs

**Content Independent Implicit UIDs**

Even in the case of anonymous communication, the way and time in which the data arrives can still be used to achieve certain record linkage, a weak one, but still a session. For instance, 

* Spatial correlations. Messages need to be atomic. If messages are grouped or batched on the same network request for efficiency, the receiver will be able to tag them as coming from the same user. 

* Temporal correlations. Even if messages are send atomically on different requests an attacker could still use the time on which messages arrive to probabilistically link multiple messages to the same user. Messages should be sent at random intervals to remove such correlations.

The Human Web already takes care of those two cases of implicit UIDs. Whenever a message is sent via `CliqzHumanWeb.sendMessage` it will be placed into a queue that is emptied at random intervals. Naturally, messages are not grouped or pipelined, each message (encrypted) will use a brand-new HTTP request. Keys used for encryption are always one time only, to avoid the key to become a UID.


**Content Dependent Implicit UIDs**

The content dependent implicit UIDs are, as the name suggest, specific to the content of the message, thus application dependent. For that reason, it is not possible to offer a general solution since it varies from message to message, or in other words, it varies from use-case to use-case.

We can, however, provide some examples of good practices and elaborate how we make sure that implicit UIDs, or other private information, never reaches Cliqz servers for some of our more complex messages.


## Examples of Human Web Messages

We will cover 3 different types of messages of user data collected by Cliqz putting special emphasis on how we prevent content dependent implicit UIDs. 

In this section, we will refer to the code deployed to our users at the time of writing of this document (October 2016, or version 2.2.). The snapshot of the code is available [here](https://gist.github.com/konark-cliqz/fd0e488f1ac691bbd5f557b59fb65766). 

The latest version of the Human Web is always available in our [open-source repo](https://github.com/cliqz-oss/browser-core/tree/master/modules/human-web/). Cliqz has a policy to open-source any released delivered to our users.


### 1. Telemetry Message

The first type of message generated by the user is is `hw.telemetry.actionstats`,  


    {"ver":"2.4",
    "ts":"20161128",
    "anti-duplicates":2399856,
    "action":"hw.telemetry.actionstats",
    "type":"humanweb",
    "payload":{
        "data":{
            "droppedLocalCheck":3,
            "tRcvd":16,
            "unknownerror-page":1,
            "unknownerror-attrack.safekey":1,
            "unknownerror-attrack.tokens":1,
            "hw.telemetry.actionstats":1,
            "attrack.safekey":2,
            "tSent":10,
            "itemsLocalValidation":6,
            "alive":3,
            "exactduplicate":3,
            "anon-ads_A":1,
            "anon-query":1,
            "total":62,
            "anon-ads_D":1,
            "page":4,
            "attrack.tokens":5,
            "mp":9
        }
    }}
	
This message is sent by the user once per day, with the aggregated counters of different message types sent. The content of the message can be found in the field `payload.data`. 

The content itself is not privacy sensitive at all. Even though the signature of the counters could be unique, there is no guarantee that it will be maintained across time, and even if so, linking two records of type `hw.telemetry.actionstats` would be harmless. 

Note that common sense is important. Record-linkage is to be avoided, when dangerous or unknown. For instance, in the message above we combined different telemetry attributed into a single message, but they could also be sent in different messages, with a loss with a loss of ability to do correlations between telemetry attributes. 

The person responsible of the data collection must consider the safeness of combining multiple data points on a single message and evaluate the risk. If there is risk and/or the repercussion of record-linkage are dangerous then caution advises to play it safe and keep the messages as small (low entropy) as possible. The content of the message is totally application specific, in this case the application was telemetry.


The struct,

	{"ver":"2.4",
    "ts":"20161128",
    "anti-duplicates":2399856,
    "action":"hw.telemetry.actionstats",
    "type":"humanweb",
    "payload": PAYLOAD}

is common to all HumanWeb Messages. It contains the version number, the timestamp capped to a day (to avoid temporal correlations on data), the type of message on field `action`. The field `anti-duplicates` is a random number, unique for each message (as a failsafe for message duplication, obsolete since the temporal uniqueness validation from HPN, it will be removed in following versions of Human Web).


### 2. Query Message

Let us go for more interesting message type, here you have a message of type `query`,


    {"ver":"2.2",
    "ts":"20161128",
    "anti-duplicates":9564913,
    "action":"query",
    "type":"humanweb",
    "payload":{
        "q":"ostern 2017",
        "qurl":"https://www.google.de/ (PROTECTED)",
        "ctry":"de",
        "r":{
            "1":{
                "u":"http://www.kalender-365.eu/feiertage/ostern.html",
                "t":"Ostern 2017, Ostern 2018 und weiter - Kalender 2016"
            },
            "0":{
                "u":"http://www.kalender-365.eu/feiertage/2017.html",
                "t":"Feiertage 2017 - Kalender 2016"
            },
            "3":{
                "u":"http://www.schulferien.org/Feiertage/Ostern/Ostern.html",
                "t":"Ostern 2016, 2017, 2018 - Schulferien.org"
            },
            "2":{
                "u":"http://www.schulferien.org/Schulferien_nach_Jahren/2017/schulferien_2017.html",
                "t":"Schulferien 2017 - Schulferien.org"
            },
            "5":{
                "u":"http://www.feiertage.net/uebersicht.php?year=2017",
                "t":"2017 - Aktuelle Feiertage 2013, 2014 bis 2037 - NRW, Bayern, Baden ..."
            },
            "4":{
                "u":"http://www.wann-ist.info/Termine/wann-ist-ostern.html",
                "t":"Wann ist Ostern 2017"
            },
            "7":{
                "u":"http://www.kleiner-kalender.de/event/ostern/03c.html",
                "t":"Ostern 2017 - 16.04.2017 - Kleiner Kalender"
            },
            "6":{
                "u":"http://www.ostern-2015.de/",
                "t":"Ostern 2017 - Termin und Datum"
            },
            "9":{
                "u":"http://www.aktuelle-kalenderwoche.com/feiertage-brueckentage-2017.html",
                "t":"Feiertage und Br\u00fcckentage 2017 - Die aktuelle Kalenderwoche"
            },
            "8":{
                "u":"http://www.feiertage.info/2017/ostern_2017.html",
                "t":"Ostern 2017 - Feiertage Deutschland 2015, 2016 und weitere Jahre"
            }
        }
    }
	}

This message type is generated every time a user visits a search engine result page (SERP). Each URL in the address bar is evaluated against a set of regular dynamically loaded ([patterns](https://cdn.cliqz.com/human-web/patterns)), which determines if the user is on a SERP of either Cliqz/Google/Bing/Yahoo/Linkedin.

Please allow us to emphasize that the message above is real, and that the data above is the only information we will receive. This message arrives to Cliqz data collection servers through the HPN anonymization layer.

The message does not contain anything that could be related to an individual person, it does not contain any sort of UID that could be used to build a session at the Cliqz backend. 

The only thing that we, as Cliqz, could learn is that someone who is a Cliqz user on the day *20161128* queried for *ostern 2017* at Google and the results that Google yielded. Sending any sort of explicit UID on that message, or not removing implicit UIDs, could lead to a session for the user that would contain all his queries, or at least a fraction of them. If any of the queries in the session would contain personal identifiable information (PII), for instance, the while session could be de-anonymized. Even though using UIDs is the industry standard we are not willing to take such a risk. We need the data, this is used to train our ranking algorithms, so it is crucial for us. But we only want the query, nothing else. Having the same message with a UID would be convenient, as the data could be repurposed for other use-cases but the risks to the user’s privacy are just not acceptable.

The message of type `query` is trickier than the previous `hw.telemetry.actionstats` message. It contains URLs and a fragment of a user input, we must ensure that no implicit UID is present in this data that is introduced by external actors, in this case Google and the user.

Let's go over how the message is build,

#### Send only what you need

The first and most important rule: send only what you need, not more. 

A typical SERP URL (can be found in your browser's address bar) looks like this,

	https://www.google.de/search?q=ostern+2017&ie=utf-8&oe=utf-8&client=firefox-b-ab&gfe_rd=cr&ei=2z44WO2pNdGo8weJooGADQ

 
One would be tempted to send this URL as is, and then extract the query on the server side. 

But that is `dangerous` as we cannot be certain that no UID is embedded in the query string. What is the purpose of   `&ie=utf-8&oe=utf-8&client=firefox-b-ab&gfe_rd=cr&ei=2z44WO2pNdGo8weJooGADQ`? Is any of that data specific to the user so that it could be used as a UID? 

It is always safer to sanitize any URL, instead of the raw SERP URL we would send this:
		
	"q":"ostern 2017",
    "qurl":"https://www.google.de/ (PROTECTED)",

The URL has been sanitized through (`CliqzHumanWeb.maskURL`). The query `q` itself is also subjected to some sanitization, always required when dealing with user input. In the case of a query, we apply some heuristics to evaluate the risk of the query (`CliqzHumanWeb.isSuspiciousQuery`). If the query is suspicious the full message will be discarded and nothing will be sent. The query heuristics cover things like,

* query too long (>50 characters)
* too many tokens (>7)
* contains a number longer than 7 digits, fuzzy, e.g. (090)90-2, 5555 3235
* contains and email, fuzzy 
* contains a URL with HTTP username or password
* contains a string longer than 12 characters that is classified as **Hash** (Markov Chain classifier defined at `CliqzHumanWeb.probHashLogM`)

Does the `CliqzHumanWeb.isSuspiciousQuery` guarantee that no personal information will ever be received? No. And that is also true for other heuristics that will be introduced later. That said, one must consider that even in the case that a PII would escape sanitization, either because of a bug or because of lack of coverage, the only thing compromised would be the PII and the record itself. Because sessions in Human Web are not allowed, the damage of a PII failure is contained. 

#### Never send data rendered to the user

The last part of the message is the field `r` which contains the results returned by Google. One could think that the data is safe, but that might not be always the case. 

We cannot rule out the possibility that the user was logged in and that the content of the page (in the case Google's SERP) was not customized/personalized. If that was the case, the content could contain elements that could be used as PII or UIDs. 

It is very dangerous to send any content extracted from a page that is rendered to the user. The only information that can be send is that information that is public, period.

To deal with this problem we rely on what we called `doubleFetch`. Which is basically an out of band HTTP request to the same URL (or a canonized version of the URL) without session,

* In Mozilla Firefox (`req.channel.loadFlags |= Ci.nsIRequest.LOAD_ANONYMOUS;`)
* In Chrome (using the `fetch` API)

By doing this the content is not user-specific as the site has no idea who is issuing the request, the anonymous request does not allow cookies or any other network session. If the site requires authentication, the response of the site will be a redirect to a login page. (There are some caveats to this that will be covered in the next section where we dig further on `doubleFetch`).

The results in field `r` are the ones scrapped from the content of the double-fetch rather than from the original content presented to the user. 

### 3. Page Message

Another example of message sent by HumanWeb is the message `page`,


	{"ver":"2.4",
    "ts":"20161128",
    "anti-duplicates":8441956,
    "action":"page",
    "type":"humanweb",
    "payload":{
        "a":252,
        "qr":{
            "q":"2 zone gasgrill",
            "t":"go",
            "d":1
        },
        "e":{
            "mm":35,
            "sc":16,
            "kp":0,
            "cp":0,
            "md":5
        },
        "url":"http://grill-profi-shop.de/",
        "st":"200",
        "x":{
            "ni":2,
            "pagel":"de",
            "nl":56,
            "lt":4472,
            "lh":27647,
            "ctry":"de",
            "nf":2,
            "iall":true,
            "ninh":2,
            "nip":0,
            "canonical_url":"http://grill-profi-shop.de/",
            "t":"\nEnders Gasgrill & Grill online kaufen\n"
        },
        "dur":160074,
        "red":null,
		"ref":null,
    }}


We use this message to learn that someone has visited the URL `http://grill-profi-shop.de/`. We also want to learn how users interact with the pages as a proxy to infer the page quality. The `page` messages are heavily aggregated, for instance,

* field `payload.a` tells us the amount of time the user was engaged with the page, 
* field `paylaod.e.mm` tells us the number of mouse movement,
* field `payload.e.sc` tells us the number of scrolling events,

The aggregated information about the page is very useful for us. CLIQZ crawling is a collaborative effort of CLIQZ users, and to gather data on how users interact with the page help us to figure out the quality and relevance of it.

All this information is aggregated as the user interacts with the page, once the user closes the page or the page becomes inactive for more than 20 minutes aggregation stops and the process to decide whether or not the message can be send starts (the proper lifecycle is better described in the section below, or if you prefer, go straight to the [source code](https://gist.github.com/konark-cliqz/fd0e488f1ac691bbd5f557b59fb65766) ).

Besides engagement the `page` message above also contains the field `payload.qr`, which is only present when the page was visited after a query on a search engine,

	"qr":{
    	"q":"2 zone gasgrill",
      	"t":"cl",
      	"d":1
  	},

in this case, the page was loaded after a request to CLIQZ for the query *2 zone gasgrill*. The field `t` stands for the search engine and `d` is the recursive depth. `qr` is only send if depth is 1, otherwise it could be used to build sessions. We will discuss how `payload.qr` and `payload.c.ref` (referral) can affect record linkage in a follow-up section.

At this point it should be evident why we are interested in the data contained in `page` messages. However, sending URLs (web pages) that users are visiting is very tricky and needs proper handling:
 
* a URL can contain information that can identify the user on the path or query-string. For instance, https://analytics.twitter.com/user/solso/home is only available if you can login as solso, which means that only the user solso can access that page, a clear PII leak.

* a URL can give access to a resource that was not meant to be public and that it can contain personal information or private content like personal pics, etc. Google docs, thank you for your purchase page, invoices, etc. are typical capability URL that should not ever be collected.

Sending all pages that a user visits is not possible without major privacy side-effects.

Even though we get rid of all explicit or communication UIDs the URL itself or the title of the page can contain plenty of implicit UIDs. That would allow record-linkage and sessions on the server side, yet it is true that sessions would be small or limited to certain domains they are sessions nonetheless. To make things worse, URLs can lead to resources with highly sensitive information. In the next section we describe how we prevent such pages (URLs) to be ever sent to CLIQZ.


#### Page Lifecycle

Let us describe the page lifecycle in more detail.

We detect a user visiting a web page by monitoring the `onLocationChange` change event. 

At this point we check if the user is in private mode. If so we stop. If not we get the URL on the current tab and check if it is acceptable using `CliqzHumanWeb.isSuspiciousURL`, which checks for:

* not on odd ports, only 80 and 443 allowed
* no HTTP auth URL
* no domain as IP
* protocol must be http or https
* no localhost
* no hash `#` in the URL unless it is a known SERP URL or the text after # is smaller than 10 characters.

If URL passes the first check we continue, otherwise we stop the process and ignore that page. 

The next step is to determine if the URL is a known SERP URL (`CliqzHumanWeb.checkSearchURL`). If it is, then a message type `query` is generated (described in the previous section). If it is not a SERP URL we continue our way to generate a `page` type message.

The URL under analysis is kept on memory at `CliqzHumanWeb.state['v']`. Additional data is aggregated to the object in memory as the user interacts with the page.  For instance, number of key presses, mouse movement, referral, whether the pages comes out of a query (field `payload.qr`), etc. We can also aggregate information than will be discarded later on. For instance, we still aggregate the links that the user follows when on the page. In prior versions (< 2.3) we used to send such links as `payload.c`, provided they meet certain criteria such as same-origin on domain, no query string, etc. Since version 2.3 the whole field is still aggregated but removed before the message is sent at the sanitization step.

Another important piece of data that will be kept is the page signature extracted from the content document after a timeout of 2 seconds. The signature looks like the field `payload.x` on the message above, however, the first signature will not be sent since it is generated from a page rendered to the user. The first page signature is a required input for the `doubleFetch` process that will be explained in a bit.

The page will stay in memory until, 

* the page is inactive for more than 20 minutes
* the user closes the tab containing the page, 
* the tab loads another page or 
* the user closes the browser (or window). 

when the page is unloaded from memory it will be persisted to disk (`CliqzHumanWeb.addURLtoDB`) and it will be considered as a pending page.

**Processing Pending Pages**

Up to this point, nothing has been sent yet. The information is either in memory on in the sqlite database (table `usafe` at `CliqzHumanWeb.dbConn`)

Every minute, an out-of-band process on the main thread (`CliqzHumanWeb.pacemaker`) will check for URLs that are no longer active and try to finalize the analysis.

The selection of the URLs to be processed is determined by (`CliqzHumanWeb.processUnchecks`), a queue that picks pending pages from storage. The number of URLs on the queue depends on the browsing activity of the user; the incoming rate is pages visited (URL on address bar, no 3rd parties or frames), and the outgoing rate is 1 per minute while the browser is opened.

We will evaluate `CliqzUtils.isPrivate` on the analyzed URL, which returns if the page has been seen before and flagged as private or whether it is unknown. If the URL was already marked as private in the past the process stops and no message is generated.

There are multiple ways a page can be classified as private:

* because `doubleFetch` process fails, either it cannot be completed or the signature of the pages after double fetch does not match (more on that later)
* because the URL comes out of a referrer that was private
* because the referral chain is too long (>10), typically suspicious pages with odd behaviors that we want to ignore

If the page is not private we will continue for the `doubleFetch` to assess whether it is public or not.

**Double Fetch**

On a `doubleFetch` the URL being analyzed will be fetched using an anonymous HTTP(s) request,

* In Mozilla Firefox (`req.channel.loadFlags |= Ci.nsIRequest.LOAD_ANONYMOUS;`)
* In Chrome based (using the `fetch` API)

The content will be anonymously fetched, parsed/rendered on a hidden window and finally we will obtain the signature of the page:

	"x":{
            "ni":2,
            "pagel":"de",
            "nl":56,
            "lt":4472,
            "lh":27647,
            "ctry":"de",
            "nf":2,
            "iall":true,
            "ninh":2,
            "nip":0,
            "canonical_url":"http://grill-profi-shop.de/",
            "t":"\nEnders Gasgrill & Grill online kaufen\n"
    },


the signature of the page contains the canonical URL (if exists); the title of the page); plus some structural information of the page such as number of input fields (`ni`), number of input fields of type password (`nip`), number of forms (`np`), number of iframes (`nif`), length of text without html (`lt`), etc.

At this point we have two page signatures for the URL: a) with the content rendered with the session of the user, `x_before`. And, b) with the content rendered without the session of the user, `x_after`, i.e. the content rendered as if some random guys had visited the same page.

If the signatures do not match it means that the content of the page is user-specific and that the page should be treated as private. It will be flagged as private and ignored forever. Of course, no message will be sent.

Matching the signatures is defined at `CliqzHumanWeb.validDoubleFetch`. Note that the match is fuzzy since signatures can differ a bit even in case of public pages. Furthermore, there are many pages that have co-existing private and public versions, e.g. *https://github.com/solso*, *https://twitter.com/solso* will have different `x_before` and `x_after` signatures depending the user *solso* was logged in or not. However, in both cases the public version of the page is indeed public. Long story short, the function `validDoubleFetch` controls whether the URL should be considered public or private depending on how the signatures of the pages depart.

Any page that require a login will fail on the double fetch validation for multiple different reasons: the URL requested anonymously will be unreachable due to redirect towards a login or error page; titles will not match; the structure of the page (e.g. number of passwords or forms) will be too different and so on. If validation fails the page will be flagged as private and never processed again. Furthermore, any URL whose referral is marked as private will also be considered as such.

There is one particular case in which the double fetch method is not effective: when the authorization is based on the fact that the user is on a private network. This setup is often encountered at home and in office environments; access to routers, company wikis, pages whose authorization relies on access through a VPN. In such cases the anonymous requests of double fetch has no effect, because the double fetch is done on the same. To detect such cases we rely on the Firefox DNS Service `Components.classes["@mozilla.org/network/dns-service;1"]` to detect if domain resolves to a private IP range (`CliqzHumanWeb.isLocalURL`). If so, the URL is marked as private.


**Capability URLS**

Another aspect to consider are capability URLs, some of which are not protected by any authorization process and simply rely on obfuscation. Google Docs, Github gists, dropbox links, thank you pages on e-commerce sites, etc. Some of these capability URLs are meant to be shared but others are not.

Some providers like *dropbox.com* or *github.com* are careful enough to mark pages that are meant to be private as `noindex` pages,

	<meta content="noindex">

We flagged as private any page that has been declared not indexable by the site owner. However, not all site owners are so careful. Google Docs for instance does not, and they can contain a fair amount of privacy sensitive and/or PII data.

To detect such URLs we rely on `CliqzHumanWeb.dropLongURL` that heuristically determines if the URL looks as a potentially capability URL (the name dropLongURL is somewhat legacy of the first version of HumanWeb where length of the URL was the only heuristic rule). Nowadays there are many more rules to increase coverage, for instance:

* query string (or post # data) is too long (>30)
* segments of the path or the query string are too long (>18)
* segments of the path or the query string as classified as Hashes (Markov Chain classifier defined at `CliqzHumanWeb.probHashLogM`)
* the url contains a long number on path or query string,
* the url contains an email look aline on path or query string
* query string or path contain certain keywords like: admin, share, Weblogic, token, logout, edit, uid, email, pwd, password, ref, track, share, login, session, etc.

The heuristics on `CliqzHumanWeb.dropLongURL` are quite conservative, meaning that a lot of pages get incorrectly classified as suspicious to be capability URLs and consequently flagged as private. False positives, however, are not such a big deal for our use-case.

However, there is no guarantee that a false negative does not slip through the cracks of the heuristics. We routinely check for URLs that reach us and from time to time, not often, but we still are able to find URLs that we rather not receive, we are talking about single digit figures in millions of records. 

It is worth noticing that both `CliqzHumanWeb.validDoubleFetch` and `CliqzHumanWeb.dropLongURL` have a variable strictness level, controlled by `CliqzHumanWeb.calculateStrictness`. Both functions are a bit less restrictive if the page has a canonical URL and that referral page contains the URL as a public link in the content loaded on an anonymous request. 

**Quorum Validation Check**

To reduce the probability of collecting capability URLs we have devised a quorum based approach by which a page message will only be sent if more than **k** people has already seen that URL. This approach if loosely based on *k-anonymity*, (see `CliqzHumanWeb.sendQuorumIncrement` and `CliqzHumanWeb.safeQuorumCheck` for the implementation details).

The browser will send to an external Quorum Service hosted by CLIQZ (accessible through the HPN anonymization layer):

* `INCR & SHA1(u) & oc` if it's the first time that he visits the URL `u` in a 30 days period, or,
* `SHA1(u) & oc` if the user has visited the URL `u` in the last 30 days

The field `INCR` will prevent that repeated visits from the same browser, same user, to increment the quorum counter more than once. Capability URLs are often shared in a certain context, when this context is the workplace or home network it is possible that all the computers have the same public IPv4 address (or a limited range of public IP addresses). That is why the last octet of the IPv4 address `oc` is also included in the request, so that visits from users in the same networks are only counted once. 

The quorum service will keep a tally on how many time someone has attempted to increment (`INCR`) while having a different last octet on their public IPv4 address, to exclude people on the same local network. 

Once the quorum threshold is reached, currently set at 5, the server will respond `true`. Note that the threshold is a lower bound given that the `oc` can have collisions.

Only when the quorum service responds `true` the message will proceed down the pipeline. We only apply quorum to URL of message type `page` that has not `qr` field and that have either path longer than `/` or that have query string, e.g. `https://github.com/` would not be subjected to quorum whereas `https://github.com/solso` would be. 


**Preparing the Message** 

The URL is declared not-private when: 1) double fetch validation passes, 2) URL is standard enough so that it does not look like a capability URL, and 3) the quorum check also passes.

At this point we are almost done with the analysis but there are some additional steps. 

We do one last additional double-fetch -- let's call it triple-fetch -- on a forcefully clean-up version of the URL in which we remove either the query string (if exists) or the last segment of the URL path. Let us give an example, a URL on the address bar could look like this,

	http://high-tech-gruenderfonds.de/en/cognex-acquires-3d-vision-company-enshape/?utm_source=CleverReach&utm_medium=email&utm_campaign=COGNEX+ACQUIRES+3D+VISION+COMPANY+EnShape&utm_content=Mailing_10747492

The query string might contain some redundant data that could be used as implicit UID, or perhaps the data in the query string is needed. There is no easy way to tell, but we can test it.

If we remove the query string `utm_source=CleverReach&utm_medium=email&utm_campaign=COGNEX+ACQUIRES+3D+VISION+COMPANY+EnShape&utm_content=Mailing_10747492`  the page signature of the page does not change, so it is safer to send the clean-up version of the URL,

	http://high-tech-gruenderfonds.de/en/cognex-acquires-3d-vision-company-enshape/

Incidentally, is also the canonical URL,

	<link rel="canonical" href="http://high-tech-gruenderfonds.de/en/cognex-acquires-3d-vision-company-enshape/" />

We always prefer to send the minimal version of the URL to minimize the risk of sending data that could be exploited as implicit UIDs.

We would like to emphasize that the signature of the page is not the signature from the original render to the user but the signature of the content of the double or triple fetch.

The triple fetch is introduced after the quorum check but it happens before. 

**Ready to Go**

At this point the message type `page` is ready to be sent. We apply one last check to sanitize the message (`CliqzHumanWeb.msgSanitize` which takes care of the last steps) such as:

* remove the referral is does not pass `CliqzHumanWeb.isSuspiciousURL`, mask it using `CliqzHumanWeb.maskURL` otherwise,
* remove any continuation (`payload.c`) since we do not really want to send this information
* check title with `CliqzHumanWeb.isSuspiciousTitle`, if contains long number, emails, etc. the whole message will be dropped,
* make sure the `payload.url` has been set to the cleanest URL available (the original, canonical, the forcefully cleaned URL on the triple-fetch)
* etc.

Most of the checks on `msgSanitize` are redundant as they are already taken care of on other parts of the code, however, having one last centralized place to do sanity checks is highly recommendable.


**Parallel History**

The lifecycle of the message type involves persistent storage, so we must be careful of not creating a parallel history of the user's browsing.

Table `usafe` in the `cliqz.dbhumanweb` sqlite database (kept of the user's profile directory) will store records with the visited URL as long as it was not already private plus the signature of the page. The record is created when the user visits the web page and removed once the record has been processed by `doubleFetch`, on average about 20 minutes. If double fetch were to fail due to network reasons it will be retried 3 times, if all 3 fail it will be considered as private and removed to avoid having the URL of the web page orphan in the database.

URLs flagged as private need to be kept forever, otherwise we would do unnecessary double fetch processing. To maintain the privacy of private URL we do not store them as plain text but rather we store the truncated MD5 on a bloom filter, 
	
	var hash = (md5(url)).substring(0,16);
	CliqzHumanWeb.bloomFilter.testSingle(hash);

The bloom filter provides plausible deniability to anyone that want to prove that the user visited a certain URL.

The same technique of bloom filters is used on the Quorum validation check to know if the URL has been visited in the last 30 days. In this case, an array of bloom filters (`CliqzHumanWeb.quorumBloomFilters`) is needed, one filter per natural day so that we can discount days older than 30 days ago. 

**Controlled Record Linkage**

Messages of type page are susceptible to very limited record linkage due to the fields: `qr` and `ref`.

For instance, the field `ref` can be used to probabilistically link two or more messages of type `page` but those sessions are bound to be small since `ref` is forced to pass `CliqzHumanWeb.isSuspiciousURL`, and if not suspicious, it will also be masked by `CliqzHumanWeb.maskURL`. So, in practice, referrals are kept at a very general level. For instance,, 

	CliqzHumanWeb.maskURL('http://high-tech-gruenderfonds.de/en/cognex-acquires-3d-vision-company-enshape/?utm_source=CleverReach&utm_medium=email&utm_campaign=COGNEX+ACQUIRES+3D+VISION+COMPANY+EnShape&utm_content=Mailing_10747492')

would yield, 

	"http://high-tech-gruenderfonds.de/ (PROTECTED)"

which will the URL finally used as `ref`. That still allows for some probabilistic record linkage, but the resulting session would be extremely small.
 
A similar argument goes for the field `qr`. The query in `qr.q` can be used to link the message of type `query` to the `page` type message that should follow. This type of two records sessions is in fact harmless since they do not provide additional information that was not already contained in one of the messages. 

# Final Words

Human Web is not a closed system, is constantly evolving to offer the maximum privacy guarantees to the users whose data is collected. From version 0.1 to the current 2.4 at the time of the writing.

We do firmly believe that this methodology is a major step forward from the typical server-side aggregation used by the industry. With our unique approach, we mitigate the risk of gathering information that we would rather not have. The risks for privacy leaks are close to zero, although there is no formal proof of privacy. We would never be able to know things like the list of queries a particular person has done in the last year. Not because our policy on security and privacy prevent us of doing so. But because it cannot be done, it is not technically possible even if we were asked to do so. In our opinion, the Human Web is a Copernican shift on the way data is collected.

