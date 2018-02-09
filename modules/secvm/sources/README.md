# Background
This module is part of a joint work between CLIQZ and EPFL with the goal to develop a privacy-preserving way of doing machine-learning.

# Motivation
The vanilla way of training a machine learning model is as follows: First, all data from the users' devices is collected in one place and afterwards a learning algorithm is run on said data. This requires convincing the users to trust you and to make sure the people who have access to the data actually deserve this trust. It also creates the risk of unwanted third-party access (hacker attacks, national security letters, ...) and the consequences of such an incident.
One alternative is to give the training algorithm only limited, noisy access to the data, so that it does not get to know anything about individual users (this approach is called differential privacy). But this still requires one trusted party that collects all individual users' data.
We, however, are interested in a distributed model where the data never leaves the users' devices.

# Our Solution
We decided to work on a solution to these problems that would allow for making use of user-held data while fully preserving user privacy. The result is SecVM (short for Secret Vector Machine), a protocol that is capable of training a support vector machine (SVM) classifier on an untrusted server on data that is spread among many clients. While doing so, it does not receive, nor can it infer, any information about individual users. This means the server ends up with a machine learning model that was trained on private data, but with nothing more -- it at no point has access to the privacy-relevant information itself. In particular, we aim to protect the feature vectors and feature-label combinations. While the whole information about a user is only contained in the combination of feature vector and label, a feature vector by itself could already contain sensitive information: if only a subset of the features sufficed to identify a user, then the other features would contain additional information. Likewise, if a single feature were unique to a certain user, the feature-label combination would give away their label.

As opposed to the traditional offline training, we do the training (using a subgradient method) in collaboration with the clients -- the owners of that data, that should be kept private. The current model is shipped to the clients, they compute a weight update based on their local data and send it back to the server, who updates the model. However, this approach would still allow a malicious server owner to reconstruct the feature vectors from the updates. To render this reconstruction impossible, the clients' messages are split up and routed through a proxy server infrastructure in such a way that the server cannot assign the different parts to a single vector. It, however, would still allow the server to associate single features with labels, which would give away private information if there were features that are unique to certain users. Therefore, as an initial step, the feature vectors are hashed into a much lower-dimensional space, which creates collisions between features and doesn't allow for distinguishing between individual features anymore.

While we use an SVM model here, our technique could also be extended to other machine learning models.

# Implementation
In this implementation of the protocol, the data we are protecting is that produced by the CLIQZ users’ browsers.

## Features and Labels
As one of the possible applications, here the features are either URLs the users have visited or the words contained in the corresponding websites' titles (both obtained from the browsing history). The label we want to predict in this experiment is the users' gender, which we extract from Facebook's main page once they visit it. One subset of the clients is used to train the model, and a different one to test its accuracy.

For each user, we randomly sample a number of URLs and/or words from the visited sites' titles from the user’s history and use them as features.

To make the privacy guarantee obtained by hashing more concrete, let’s say, the users have visited 1,000,000 unique URLs and we hash them into 1,000 bins. Then the expected number of URLs per bin is 1,000. This would mean that the server can’t distinguish between the 1,000 different URLs in a bin, and receiving a package containing an entry for one of those bins would only tell the server that one of the 1,000 URLs has been visited, but not which one. Because of the routing through the CLIQZ Human Web (see below), the server does not even know who the user visiting a URL in that bin was.

## Protocol
All communication happens through the CLIQZ Human Web, which anonymizes each package and thus prevents CLIQZ from determining from which IP address it was sent.

Every 10 minutes, each client fetches a configuration file from the CLIQZ servers, which contains data on the SVM experiments that are currently being run. Based on this data and based on the current parameters of the SVM -- the "weights", which are additionally fetched --, the updates are computed and then sent to the server.

However, the updates are not sent as entire vectors, but the value for each dimension of the vector (each bucket) is sent individually at random points in time. The vector (1, 4, 2), for example, would be sent as seven packages, one containing (index: 0, value: 1), four containing (index: 1, value: 1) and two containing (index: 2, value: 1).

## File fetched from the server

### configuration.json
```json
{
  "id": ["a", "b"],
  "features": [
    { "idHosts": "hosts_a",
      "numHosts": 10000,
      "numHashesHosts": 1,
      "hostsIndividually": true,
      "idTitleWords": "url_a",
      "numTitleWords": 5000,
      "numHashesTitleWords": 2,
      "titleWordsIndividually": false,
      "merged": true},
    { "idHosts": null,
      "numHosts": 0,
      "numHashesHosts": 0,
      "hostsIndividually": false,
      "idTitleWords": "url_b",
      "numTitleWords": 100,
      "numHashesTitleWords": 1,
      "merged": false}
  ],
  "featuresToDelete": [
    "id1",
    "id2",
    "id3",
    "id4"
  ],
  "diceRolls": [
    { "id": "diceRoll_a",
      "probs": [0.5, 0.3, 0.2],
      "test": [0, 2]}
    { "id": "diceRoll_b",
      "probs": [0.5, 0.5],
      "train": [0],
      "test": [1]}
  ],
  "weightVectorUrl": [
    "https://svm.cliqz.com/weights0.json",
    "https://svm.cliqz.com/weights1.json"
  ],
  "timeLeft": [
    73829132,
    789374893242
  ]
}
```

#### Explanation
The i-th entry of each array corresponds to the i-th experiment that is being run
right now.

`id[i]`: The id of the i-th experiment. This will be sent back together with each update
for the server to be able to assign updates to SVMs.

***
`features[i].idHosts`: The id under which the hashed hosts should be stored in the
database. If a feature vector under this id already exists in the database, then
that one is used, otherwise a new one is computed and placed there.
Undefined if and only if the hosts shouldn't be used as features.

`features[i].numHosts`: The number of host names that should be used as features.

`features[i].numHashesHosts`: How often each host should be hashed.

 - same for title words

If exactly one of `features[i].idHosts` and `features[i].idTitleWords` is defined, then those features are used. If both are defined, the feature vector resulting from merging the two vectors is used.
***

`featuresToDelete`: The ids of feature vectors that might have been previously computed for other experiments but are no longer needed and can therefore be deleted from the database to save space.

`diceRolls[i].id`: The id of the dice roll that determines if the user is part of the training or testing set for the i-th experiment.

`diceRolls[i].probs`: The probabilities for the different outcomes of the i-th dice roll.

Exactly one of the following two can also be undefined:
`diceRolls[i].train`: The outcomes for which the user is part of the training set for the i-th experiment.
`diceRolls[i].test`: The outcomes for which the user is part of the testing set for the i-th experiment.

`weightVectorUrl[i]`: The URL at which the weight vector for the i-th experiment can be found.

`timeLeft[i]`: The time in milliseconds that the client has left to send all their updates for the i-th experiment to the server. Always needs to be underestimated by the server. We don't use the time at which the updates are due instead of the time left to avoid issues with clients whose clocks are wrongly set.

The number of bins is implicit in the weight vector's length.

### weights{n}.json
```json
{
  "weights": "j4kl32jo43ji8f9sdjfnjdosu89324uhuohnjfjhdsl"
}
```

#### Explanation
`weights`: the Base64 encoded weight vector for one of the experiments


## Packages sent from the client to the server
### Participation package
Announces that the client will send updates for the indicated experiment.
```json
{
  "experimentId": [3, 32],
  "packageId": "fdskl45"
}
```

### Train package
An update for one of the entries of the SVM's weight vector.

We would like to stress that the update vectors are split up into individual messages, i.e., each message contains only an update for one dimension of the weight vector. The only information transferred is therefore that there was one user with a certain label whose browsing history contains one URL or word which was hashed into this specific bin. The messages do not contain any explicit user-identifier (as you can see below) and the implicit identifiers based on network communication, such as IPs, are removed by the Human Web proxy network. Additionally, the packages are sent at random points in time, making it impossible to associate them with each other based on their arrival time. Therefore, it is not possible to reconstruct any user vector from the individual messages.
```json
{
  "experimentId": [3, 32],
  "packageId": "nmb43m",
  "index": 432432,
  "value": 1
}
```

### Test package
For testing the accuracy of the SVM trained so far and for knowing when to stop the training (when this accuracy doesn't increase significantly anymore), some users are used as test users for some experiments. They won't send updates but simply predict their own gender with the current SVM, check if this prediction is correct and send the information to the server.
```json
{
  "experimentId": [3, 32],
  "packageId": "jko5lk",
  "trueLabel": 1,
  "svmLabel": -1
}
```

### Explanation
`experimentId`: The id sent by the server that this package is a response to. It
consists of `[svm_id, iteration]`.

`packageId`: A random id generated by the client for each package that together with experimentId is used to uniquely identify packages and filter them out in case they are sent twice.

`trueLabel`: The true user label; this allows for the test to also be used to determine the distribution of -1/1 labels and the misclassification rate for each class.

`svmLabel`: The label predicted by the SVM.

`index`: The index of the weight vector entry to update.

`value`: The sign of the update (1 or -1) which contains all the information about the update since we only have 1 and -1 updates.

## Shortened Packages
We shorten the attribute names to make the packages smaller. This has a rather big impact on the overall amount of data sent since per 10 minute iteration a client typically sends out thousands of packages.

### Participation package
```json
{
  "e": [3, 32],
  "p": "fskl45"
}
```

### Train package
```json
{
  "e": [3, 32],
  "p": "nmb43m",
  "i": 432432,
  "v": 1
}
```

### Test package
```json
{
  "e": [3, 32],
  "p": "jko5lk",
  "l": 1,
  "s": 0
}
```

### Explanation
`e` (experimentId)

`p` (packageId)

`l` (trueLabel): 0 (-1) or 1 (1)

`s` (svmLabel): 0 (-1) or 1 (1)

`i` (index): no Base64 encoding since the numbers are small and we save the parentheses

`v` (value): 0 (-1) or 1 (1)