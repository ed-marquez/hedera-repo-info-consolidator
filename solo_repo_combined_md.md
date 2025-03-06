<!-- Filename: .github/pull_request_template.md -->
## Description

This pull request changes the following:

* TBD

### Related Issues

* Closes #
<!-- Filename: DEV.md -->
# Instructions for developers working on solo project

Below we describe how you can set up a local environment and contribute to `solo`.

* Clone the repo
* In order to support ES6 modules with `jest`, set an env variable `NODE_OPTIONS` as below:
  * `export NODE_OPTIONS=--experimental-vm-modules >> ~/.zshrc`
* For Intellij users: enable `--experimental-vm-modules` for `Jest` as below:
  * Go to: `Run->Edit Configurations->Edit Configuration Templates->Jest`
  * Set: `--experimental-vm-modules` in `Node Options`.
* Run `npm i` to install the required packages
* Run `npm link` to install `solo` as the CLI
  * Note: you need to do it once. If `solo` already exists in your path, you will need to remove it first.
  * Alternative way would be to run `npm run solo-test -- <COMMAND> <ARGS>`
* Run `npm test` or `npm run test` to run the unit tests
* Run `solo` to access the CLI.
* Note that debug logs are stored at `$HOME/.solo/logs/solo.log`.
  * So you may use `tail -f $HOME/.solo/logs/solo.log | jq` in a separate terminal to keep an eye on the logs.
* Before making a commit run `npm run format`

## E2E tests

* In order to run E2E test, we need to set up cluster and install the chart.
  * Run `./test/e2e/setup-e2e.sh`
  * Run `npm run test-e2e-standard`, NOTE: this excludes some E2E tests that have their own command
  * You can check the section `scripts` in file `package.json` for more other test commands available.

* Tests are run in random order. The random seed value is shown as message such as:
  `Using timestamp seed 1711414247085 for random test order`

* If you like to rerun tests with the same seed, use environment variable `RANDOM_SEED=<integer_number>` with `npm run test-e2e-standard` command.
  * Example: `RANDOM_SEED=20 npm run test-e2e-standard`,
    and you should see an output like: `Using preset seed 20 for random test order`
<!-- Filename: README.md -->
# Solo

[![NPM Version](https://img.shields.io/npm/v/%40hashgraph%2Fsolo?logo=npm)](https://www.npmjs.com/package/@hashgraph/solo)
[![GitHub License](https://img.shields.io/github/license/hashgraph/solo?logo=apache\&logoColor=red)](LICENSE)
![node-lts](https://img.shields.io/node/v-lts/%40hashgraph%2Fsolo)
[![Build Application](https://github.com/hashgraph/solo/actions/workflows/flow-build-application.yaml/badge.svg)](https://github.com/hashgraph/solo/actions/workflows/flow-build-application.yaml)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/83a423a3a1c942459127b3aec62ab0b5)](https://app.codacy.com/gh/hashgraph/solo/dashboard?utm_source=gh\&utm_medium=referral\&utm_content=\&utm_campaign=Badge_grade)
[![codecov](https://codecov.io/gh/hashgraph/solo/graph/badge.svg?token=hBkQdB1XO5)](https://codecov.io/gh/hashgraph/solo)

> \[!WARNING]
> SPECIAL NOTICE: Introducing v0.32.0 comes with BREAKING CHANGES.  We have removed caching of the flags in the solo config file.  All commands will need required flags or user will need to answer the prompts.  See more details in our release notes: [release/tag/v0.32.0](https://github.com/hashgraph/solo/releases/tag/v0.32.0)

An opinionated CLI tool to deploy and manage standalone test networks.

## Requirements

| Solo Version | Node.js                   | Kind       | Solo Chart | Hedera               | Kubernetes | Kubectl    | Helm    | k9s        | Docker Resources        |
|--------------|---------------------------|------------|------------|----------------------|------------|------------|---------|------------|-------------------------|
| 0.29.0       | >= 20.14.0 (lts/hydrogen) | >= v1.29.1 | v0.30.0    | v0.53.0 – <= v0.57.0 | >= v1.27.3 | >= v1.27.3 | v3.14.2 | >= v0.27.4 | Memory >= 8GB, CPU >= 4 |
| 0.30.0       | >= 20.14.0 (lts/hydrogen) | >= v1.29.1 | v0.30.0    | v0.54.0 – <= v0.57.0 | >= v1.27.3 | >= v1.27.3 | v3.14.2 | >= v0.27.4 | Memory >= 8GB, CPU >= 4 |
| 0.31.4       | >= 20.18.0 (lts/iron)     | >= v1.29.1 | v0.31.4    | v0.54.0 – <= v0.57.0 | >= v1.27.3 | >= v1.27.3 | v3.14.2 | >= v0.27.4 | Memory >= 8GB, CPU >= 4 |
| 0.32.0       | >= 20.18.0 (lts/iron)     | >= v1.29.1 | v0.38.2    | v0.58.1 - <= v0.59.0 | >= v1.27.3 | >= v1.27.3 | v3.14.2 | >= v0.27.4 | Memory >= 8GB, CPU >= 4 |
| 0.33.0       | >= 20.18.0 (lts/iron)     | >= v1.29.1 | v0.38.2    | v0.58.1 - <= v0.59.0 | >= v1.27.3 | >= v1.27.3 | v3.14.2 | >= v0.27.4 | Memory >= 8GB, CPU >= 4 |
| 0.34.0       | >= 20.18.0 (lts/iron)     | >= v1.29.1 | v0.42.10   | v0.58.1+             | >= v1.27.3 | >= v1.27.3 | v3.14.2 | >= v0.27.4 | Memory >= 8GB, CPU >= 4 |
| 0.35.0       | >= 20.18.0 (lts/iron)     | >= v1.29.1 | v0.44.0    | v0.58.1+             | >= v1.27.3 | >= v1.27.3 | v3.14.2 | >= v0.27.4 | Memory >= 8GB, CPU >= 4 |

### Hardware Requirements

To run a three-node network, you will need to set up Docker Desktop with at least 8GB of memory and 4 CPUs.

![alt text](images/DockerDesktop.png)

## Setup

* Install [Node](https://nodejs.org/en/download). You may also use [nvm](https://github.com/nvm-sh/nvm) to manage different Node versions locally, some examples:

```
# install specific nodejs version
# nvm install <version>

# install nodejs version 20.18.0
nvm install v20.18.0

# lists available node versions already installed
nvm ls

# swith to selected node version
# nvm use <version>
nvm use v20.18.0

```

* Useful tools:
  * Install [kubectl](https://kubernetes.io/docs/tasks/tools/)
  * Install [k9s](https://k9scli.io/)

## Install Solo

* Run `npm install -g @hashgraph/solo`

## Documentation

[Getting Started](https://hashgraph.github.io/solo/)

## Support

If you have a question on how to use the product, please see our [support guide](https://github.com/hashgraph/.github/blob/main/SUPPORT.md).

## Contributing

Contributions are welcome. Please see the [contributing guide](https://github.com/hashgraph/.github/blob/main/CONTRIBUTING.md) to see how you can get involved.

## Code of Conduct

This project is governed by the [Contributor Covenant Code of Conduct](https://github.com/hashgraph/.github/blob/main/CODE_OF_CONDUCT.md). By participating, you are
expected to uphold this code of conduct.

## License

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
<!-- Filename: docs/site/content/Developer/DesignDocs/ArchitectureAndSystemDesign.md -->
## Architecture and System Design

{{< hint type=warning >}} Purpose: Defines the overall structure, key components, and interactions in the system.
Examples:

* Architecture Diagram – UML, C4 Model, or flowcharts showing high-level components (CLI, core engine, API integrations).
* Module Dependency Graph – Illustrates relationships between modules, especially for modular CLI apps.
* Event Flow Diagrams – If using event-driven architecture, diagrams showing event propagation. {{< /hint >}}
<!-- Filename: docs/site/content/Developer/DesignDocs/CLIDesignAndInteraction.md -->
## CLI Design and Interaction

{{< hint type=warning >}} Purpose: Documents the design and structure of the CLI, including commands, arguments, and output.
Examples:

* Command Structure Documentation – Details available commands, options, flags, and usage examples.
* Flow Diagrams for CLI Execution – Visualizes input-processing-output for key commands.
* User Interaction Mockups – Text-based representations of expected CLI responses.{{< /hint >}}
<!-- Filename: docs/site/content/Developer/DesignDocs/CodebaseAndModuleDocumentation.md -->
## Codebase and Module Documentation

{{< hint type=warning >}} Purpose: Provides technical details on specific modules, libraries, and their internal workings.
Examples:

* JSDoc / TypeDoc Documentation – Auto-generated API docs.
* Detailed Component Docs – Explanation of complex classes or utilities.
* Design Patterns Documentation – If using dependency injection (e.g., tsyringe-neo), factory patterns, etc.{{< /hint >}}
<!-- Filename: docs/site/content/Developer/DesignDocs/ErrorHandlingAndLogging.md -->
## Error Handling and Logging

{{< hint type=warning >}} Purpose: Defines how errors are managed and logged within the CLI.
Examples:

* Error Propagation Flowchart – How errors bubble up and are handled.
* Logging Strategy Documentation – Where logs are stored, log levels, structured logging format.{{< /hint >}}
<!-- Filename: docs/site/content/Developer/DesignDocs/InfrastructureAndDeployment.md -->
## Infrastructure and Deployment

{{< hint type=warning >}} Purpose: Describes how the system is deployed, including hosting environments, CI/CD pipelines, and external dependencies.
Examples:

* Infrastructure Diagram – Shows cloud services (e.g., AWS, Azure), databases, storage, networking, etc.
* CI/CD Pipeline Diagram – Depicts the automation for testing and deployment.
* Container & Orchestration Docs – If using Docker, Kubernetes, or another deployment method. {{< /hint >}}
<!-- Filename: docs/site/content/Developer/DesignDocs/ProjectOverviewAndHighLevelDocumentation.md -->
## Project Overview & High-Level Documentation

{{< hint type=warning >}} Purpose: Provides a top-level summary of the project, its objectives, and its main components.
Examples:

* Project README
* High-level architecture overview
* Feature roadmap
* User personas & use cases {{< /hint >}}
<!-- Filename: docs/site/content/Developer/DesignDocs/SecurityAndPermissions.md -->
## Security and Permissions

{{< hint type=warning >}} Purpose: Documents security-related concerns, including authentication, access control, and data safety.
Examples:

* Authentication & Authorization Flow – If CLI requires user authentication (e.g., OAuth, API keys).
* Data Handling & Encryption Documentation – Describes security measures for sensitive data.
  {{< /hint >}}
<!-- Filename: docs/site/content/Developer/DesignDocs/TestingAndQualityAssurance.md -->
## Testing and Quality Assurance

{{< hint type=warning >}} Purpose: Covers unit, integration, and end-to-end testing strategies.
Examples:

* Test Strategy Documentation – How different parts of the CLI are tested.
* Mocking & Stubbing Guide – If testing interactions with external services.{{< /hint >}}
<!-- Filename: docs/site/content/Developer/DesignDocs/_index.md -->
---
title: Collapse
geekdocCollapseSection: true
---
<!-- Filename: docs/site/content/Developer/_index.md -->
---
title: Collapse
geekdocCollapseSection: true
---
<!-- Filename: docs/site/content/User/AccessHederaServices.md -->
## Access Hedera Network Services

Once the nodes are up, you may now expose various services (using `k9s` (shift-f) or `kubectl port-forward`) and access. Below are most used services that you may expose.

* Node services: `network-<node ID>-svc`
* HAProxy: `haproxy-<node ID>-svc`
  ```bash
  # enable portforwarding for haproxy
  # node1 grpc port accessed by localhost:50211
  kubectl port-forward svc/haproxy-node1-svc -n "${SOLO_NAMESPACE}" 50211:50211 &
  # node2 grpc port accessed by localhost:51211
  kubectl port-forward svc/haproxy-node2-svc -n "${SOLO_NAMESPACE}" 51211:50211 &
  # node3 grpc port accessed by localhost:52211
  kubectl port-forward svc/haproxy-node3-svc -n "${SOLO_NAMESPACE}" 52211:50211 &
  ```
* Envoy Proxy: `envoy-proxy-<node ID>-svc`
  ```bash
  # enable portforwarding for envoy proxy
  kubectl port-forward svc/envoy-proxy-node1-svc -n "${SOLO_NAMESPACE}" 8181:8080 &
  kubectl port-forward svc/envoy-proxy-node2-svc -n "${SOLO_NAMESPACE}" 8281:8080 &
  kubectl port-forward svc/envoy-proxy-node3-svc -n "${SOLO_NAMESPACE}" 8381:8080 &
  ```
* Hedera explorer: `solo-deployment-hedera-explorer`
  ```bash
  #enable portforwarding for hedera explorer, can be access at http://localhost:8080/
  kubectl port-forward svc/hedera-explorer -n "${SOLO_NAMESPACE}" 8080:80 &
  ```
* JSON Rpc Relays

You can deploy JSON RPC relays for one or more nodes as below:

```bash
# deploy relay node first
solo relay deploy -i node1

# enable relay for node1
kubectl port-forward svc/relay-node1-hedera-json-rpc-relay -n "${SOLO_NAMESPACE}" 7546:7546 &
```
<!-- Filename: docs/site/content/User/DebugLog/HowToDebugHederaServicesAndPlatformSDK.md -->
## How to debug Hedera Services and Platform SDK

### 1. Using k9s to access running network nodes logs

Running the command `k9s -A` in terminal, and select one of the network nodes:

![alt text](select_network_node0.png)

Next, select the `root-container` and press the key `s` to enter the shell of the container.

![alt text](select_root_container.png)

Once inside the shell, you can change to directory `cd /opt/hgcapp/services-hedera/HapiApp2.0/`
to view all hedera related logs and properties files.

```bash
[root@network-node1-0 hgcapp]# cd /opt/hgcapp/services-hedera/HapiApp2.0/
[root@network-node1-0 HapiApp2.0]# pwd
/opt/hgcapp/services-hedera/HapiApp2.0
[root@network-node1-0 HapiApp2.0]# ls -ltr data/config/
total 0
lrwxrwxrwx 1 root root 27 Dec  4 02:05 bootstrap.properties -> ..data/bootstrap.properties
lrwxrwxrwx 1 root root 29 Dec  4 02:05 application.properties -> ..data/application.properties
lrwxrwxrwx 1 root root 32 Dec  4 02:05 api-permission.properties -> ..data/api-permission.properties
[root@network-node1-0 HapiApp2.0]# ls -ltr output/
total 1148
-rw-r--r-- 1 hedera hedera       0 Dec  4 02:06 hgcaa.log
-rw-r--r-- 1 hedera hedera       0 Dec  4 02:06 queries.log
drwxr-xr-x 2 hedera hedera    4096 Dec  4 02:06 transaction-state
drwxr-xr-x 2 hedera hedera    4096 Dec  4 02:06 state
-rw-r--r-- 1 hedera hedera     190 Dec  4 02:06 swirlds-vmap.log
drwxr-xr-x 2 hedera hedera    4096 Dec  4 16:01 swirlds-hashstream
-rw-r--r-- 1 hedera hedera 1151446 Dec  4 16:07 swirlds.log
```

Alternatively, you can use the following command to download hgcaa.log and
swirlds.log for further analysis.

```bash
# download logs as zip file from node1 and save in default ~/.solo/logs/solo-e2e/<timestamp/
solo node logs -i node1 -n solo-e2e
```

### 2. Using IntelliJ remote debug with Solo

NOTE: the hedera-services path referenced '../hedera-services/hedera-node/data' may
need to be updated based on what directory you are currently in.  This also assumes that you have done an assemble/build and the directory contents are up-to-date.

Setup a Intellij run/debug configuration for remote JVM Debug as shown in the below screenshot:

![alt text](jvm-hedera-app.png)

If you are working on platform testing application, you should use the following configuration
in intellij:

![alt text](jvm-platform-app.png)

Setup breakpoint if necessary.

From solo repo directory, run the following command from terminal to launch a three node network, assume we are trying to attach debug to `node2` .
Make sure the path following `local-build-path` points to the correct directory.

Example 1: attach jvm debugger to a hedera node

```bash
./test/e2e/setup-e2e.sh
solo node keys --gossip-keys --tls-keys -i node1,node2,node3
solo network deploy -i node1,node2,node3 --debug-node-alias node2 -n "${SOLO_NAMESPACE}"
solo node setup -i node1,node2,node3 --local-build-path ../hedera-services/hedera-node/data -n "${SOLO_NAMESPACE}"
solo node start -i node1,node2,node3 --debug-node-alias node2 -n "${SOLO_NAMESPACE}"
```

Once you see the following message, you can launch jvm debugger from Intellij

```
❯ Check all nodes are ACTIVE
  Check node: node1,
  Check node: node2,  Please attach JVM debugger now.
  Check node: node3,
```

The Hedera Application should stop at the breakpoint you set:

![alt text](hedera-breakpoint.png)
![alt text](platform-breakpoint.png)

Example 2: attach jvm debugger with node add operation

```bash
./test/e2e/setup-e2e.sh
solo node keys --gossip-keys --tls-keys -i node1,node2,node3
solo network deploy -i node1,node2,node3 --pvcs -n "${SOLO_NAMESPACE}"
solo node setup -i node1,node2,node3 --local-build-path ../hedera-services/hedera-node/data -n "${SOLO_NAMESPACE}"
solo node start -i node1,node2,node3 -n "${SOLO_NAMESPACE}"
solo node add --gossip-keys --tls-keys --debug-node-alias node4 --local-build-path ../hedera-services/hedera-node/data -n "${SOLO_NAMESPACE}" --pvcs true
```

Example 3: attach jvm debugger with node update operation

```bash
./test/e2e/setup-e2e.sh
solo node keys --gossip-keys --tls-keys -i node1,node2,node3
solo network deploy -i node1,node2,node3 -n "${SOLO_NAMESPACE}"
solo node setup -i node1,node2,node3 --local-build-path ../hedera-services/hedera-node/data -n "${SOLO_NAMESPACE}"
solo node start -i node1,node2,node3 -n "${SOLO_NAMESPACE}"
solo node update --node-alias node2  --debug-node-alias node2 --local-build-path ../hedera-services/hedera-node/data --new-account-number 0.0.7 --gossip-public-key ./s-public-node2.pem --gossip-private-key ./s-private-node2.pem  -n "${SOLO_NAMESPACE}"
```

Example 4: attach jvm debugger with node delete operation

```bash
./test/e2e/setup-e2e.sh
solo node keys --gossip-keys --tls-keys -i node1,node2,node3
solo network deploy -i node1,node2,node3,node4 -n "${SOLO_NAMESPACE}"
solo node setup -i node1,node2,node3,node4 --local-build-path ../hedera-services/hedera-node/data -n "${SOLO_NAMESPACE}"
solo node start -i node1,node2,node3,node4 -n "${SOLO_NAMESPACE}"
solo node delete --node-alias node2  --debug-node-alias node3 -n "${SOLO_NAMESPACE}"
```

### 3. Save and reuse network state files

With the following command you can save the network state to a file.

```bash
# must stop hedera node operation first
solo node stop -i node1,node2 -n solo-e2e

# download state file to default location at ~/.solo/logs/<namespace>
solo node states -i node1,node2 -n solo-e2e
```

By default, the state files are saved under `~/solo` directory

```bash
└── logs
    ├── solo-e2e
    │   ├── network-node1-0-state.zip
    │   └── network-node2-0-state.zip
    └── solo.log
```

Later, user can use the following command to upload the state files to the network and restart hedera nodes.

```bash
./test/e2e/setup-e2e.sh
solo node keys --gossip-keys --tls-keys -i node1,node2,node3
solo network deploy -i node1,node2,node3 -n "${SOLO_NAMESPACE}"
solo node setup -i node1,node2,node3 --local-build-path ../hedera-services/hedera-node/data -n "${SOLO_NAMESPACE}"

# start network with pre-existing state files
solo node start -i node1,node2 -n solo-e2e --state-file network-node1-0-state.zip
```
<!-- Filename: docs/site/content/User/Env.md -->
## Environment Variables Used in Solo

User can configure the following environment variables to customize the behavior of Solo.

### Table of environment variables

| Environment Variable               | Description                                                                                      | Default Value                                                                                      |
|------------------------------------|--------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| `SOLO_HOME`                        | Path to the Solo cache and log files                                                             | `~/.solo`                                                                                          |
| `SOLO_CHAIN_ID`                    | Chain id of solo network                                                                         | `298`                                                                                              |
| `SOLO_NODE_ACCOUNT_ID_START`       | First node account ID of solo test network                                                       | `0.0.3`                                                                                            |
| `SOLO_NODE_INTERNAL_GOSSIP_PORT`   | Internal gossip port number used by hedera network                                               | `50111`                                                                                            |
| `SOLO_NODE_EXTERNAL_GOSSIP_PORT`   | External port number used by hedera network                                                      | `50111`                                                                                            |
| `SOLO_NODE_DEFAULT_STAKE_AMOUNT`   | Default stake amount for node                                                                    | `500`                                                                                              |
| `SOLO_OPERATOR_ID`                 | Operator account ID for solo network                                                             | `0.0.2`                                                                                            |
| `SOLO_OPERATOR_KEY`                | Operator private key for solo network                                                            | `302e020100300506032b65700422042091132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137` |
| `SOLO_OPERATOR_PUBLIC_KEY`         | Operator public key for solo network                                                             | `302a300506032b65700321000aa8e21064c61eab86e2a9c164565b4e7a9a4146106e0a6cd03a8c395a110e92`         |
| `FREEZE_ADMIN_ACCOUNT`             | Freeze admin account ID for solo network                                                         | `0.0.58`                                                                                           |
| `GENESIS_KEY`                      | Genesis private key for solo network                                                             | `302e020100300506032b65700422042091132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137` |
| `LOCAL_NODE_START_PORT`            | Local node start port for solo network                                                           | `30212`                                                                                            |
| `NODE_CLIENT_MIN_BACKOFF`          | The minimum amount of time to wait between retries.                                              | `1000`                                                                                             |
| `NODE_CLIENT_MAX_BACKOFF`          | The maximum amount of time to wait between retries.                                              | `1000`                                                                                             |
| `NODE_CLIENT_REQUEST_TIMEOUT`      | The period of time a transaction or query request will retry from a "busy" network response      | `600000`                                                                                           |
| `PODS_RUNNING_MAX_ATTEMPTS`        | The maximum number of attempts to check if pods are running.                                     | `900`                                                                                              |
| `PODS_RUNNING_DELAY`               | The interval between attempts to check if pods are running, in the unit of milliseconds.         | `1000`                                                                                             |
| `NETWORK_NODE_ACTIVE_MAX_ATTEMPTS` | The maximum number of attempts to check if network nodes are active.                             | `120`                                                                                              |
| `NETWORK_NODE_ACTIVE_DELAY`        | The interval between attempts to check if network nodes are active, in the unit of milliseconds. | `1000`                                                                                             |
| `NETWORK_NODE_ACTIVE_TIMEOUT`      | The period of time to wait for network nodes to become active, in the unit of milliseconds.      | `60000`                                                                                            |
| `NETWORK_PROXY_MAX_ATTEMPTS`       | The maximum number of attempts to check if network proxy is running.                             | `300`                                                                                              |
| `NETWORK_PROXY_DELAY`              | The interval between attempts to check if network proxy is running, in the unit of milliseconds. | `2000`                                                                                             |
| `PODS_READY_MAX_ATTEMPTS`          | The maximum number of attempts to check if pods are ready.                                       | `300`                                                                                              |
| `PODS_READY_DELAY`                 | The interval between attempts to check if pods are ready, in the unit of milliseconds.           | `2000`                                                                                             |
| `RELAY_PODS_RUNNING_MAX_ATTEMPTS`  | The maximum number of attempts to check if relay pods are running.                               | `900`                                                                                              |
| `RELAY_PODS_RUNNING_DELAY`         | The interval between attempts to check if relay pods are running, in the unit of milliseconds.   | `1000`                                                                                             |
| `RELAY_PODS_READY_MAX_ATTEMPTS`    | The maximum number of attempts to check if relay pods are ready.                                 | `100`                                                                                              |
| `RELAY_PODS_READY_DELAY`           | The interval between attempts to check if relay pods are ready, in the unit of milliseconds.     | `120`                                                                                              |
| `NETWORK_DESTROY_WAIT_TIMEOUT`     | The period of time to wait for network to be destroyed, in the unit of milliseconds.             | `60000`                                                                                            |
<!-- Filename: docs/site/content/User/FAQ.md -->
### How can I avoid using genesis keys ?

You can run `solo account init` anytime after `solo node start`

### Where can I find the default account keys ?

It is the well known default genesis key [Link](https://github.com/hiero-ledger/hiero-consensus-node/blob/develop/hedera-node/data/onboard/GenesisPrivKey.txt)

### How do I get the key for an account?

Use the following command to get account balance and private key of the account `0.0.1007`:

```bash
# get account info of 0.0.1007 and also show the private key
solo account get --account-id 0.0.1007 -n solo-e2e --private-key
```

The output would be similar to the following:

```bash
{
 "accountId": "0.0.1007",
 "privateKey": "302e020100300506032b657004220420cfea706dd9ed2d3c1660ba98acf4fdb74d247cce289ef6ef47486e055e0b9508",
 "publicKey": "302a300506032b65700321001d8978e647aca1195c54a4d3d5dc469b95666de14e9b6edde8ed337917b96013",
 "balance": 100
}
```
<!-- Filename: docs/site/content/User/GetStarted.md -->
## Table of Contents

Quick start:

* [Start solo network with single command](TaskTool.md)

For Developers working on Hedera Application and platform development:

* [Hedera developer](HederaDeveloper.md)
* [Platform developer](PlatformDeveloper.md)
* [Attach JVM debugger and retrieve logs](DebugLog/HowToDebugHederaServicesAndPlatformSDK.md)

For Hedera JavaScript SDK users:

* [Using Solo with Hedera JavaScript SDK](SDK.md)

For Hedera extended users:

* [Using Solo with mirror node](SoloWithMirrorNode.md)
* [Access Hedera Network Services](AccessHederaServices.md)
* [Using Environment Variables](Env.md)

FAQ:

* [Frequently Asked Questions](FAQ.md)

For curious mind:

* [Step-by-step guide](StepByStepGuide.md)
* [Solo CLI manual](SoloCLI.md)
<!-- Filename: docs/site/content/User/HederaDeveloper.md -->
### Use solo with local build hedera service code

First, please clone hedera service repo `https://github.com/hiero-ledger/hiero-consensus-node/` and build the code
with `./gradlew assemble`. If need to running multiple nodes with different versions or releases, please duplicate the repo or build directories in
multiple directories, checkout to the respective version and build the code.

Then you can start customized built hedera network with the following command:

```bash
SOLO_CLUSTER_NAME=solo-cluster
SOLO_NAMESPACE=solo-e2e
SOLO_CLUSTER_SETUP_NAMESPACE=solo-setup
SOLO_DEVELOPMENT=solo-deployment

kind delete cluster -n "${SOLO_CLUSTER_NAME}" 
kind create cluster -n "${SOLO_CLUSTER_NAME}"
solo init
solo cluster setup -s "${SOLO_CLUSTER_SETUP_NAMESPACE}"
solo node keys --gossip-keys --tls-keys -i node1,node2,node3 
solo deployment create --namespace "${SOLO_NAMESPACE}"  --context kind-"${SOLO_CLUSTER_NAME}" --email john@doe.com --deployment-clusters kind-"${SOLO_CLUSTER_NAME}" --cluster-ref kind-"${SOLO_CLUSTER_NAME}" --deployment "${SOLO_DEVELOPMENT}" --node-aliases node1,node2,node3
solo network deploy --deployment "${SOLO_DEVELOPMENT}" -i node1,node2,node3 

# option 1) if all nodes are running the same version of Hedera app
solo node setup --deployment "${SOLO_DEVELOPMENT}" -i node1,node2,node3 --local-build-path ../hedera-services/hedera-node/data/

# option 2) if each node is running different version of Hedera app, please provide different paths to the local repositories
solo node setup --deployment "${SOLO_DEVELOPMENT}" -i node1,node2,node3 --local-build-path node1=../hedera-services/hedera-node/data/,node1=<path2>,node3=<path3>

solo node start --deployment "${SOLO_DEVELOPMENT}" -i node1,node2,node3 

```

It is possible that different nodes are running different versions of Hedera app, as long as in the above
setup command, each node0, or node1 is given different paths to the local repositories.

If need to provide customized configuration files for Hedera application, please use the following flags with network deploy command:

* `--settings-txt` - to provide custom settings.txt file
* `--api-permission-properties` - to provide custom api-permission.properties file
* `--bootstrap-properties` - to provide custom bootstrap.properties file
* `--application-properties` - to provide custom application.properties file

For example:

```bash
solo network deploy --deployment "${SOLO_DEVELOPMENT}" -i node1,node2,node3 --settings-txt <path-to-settings-txt> 
```
<!-- Filename: docs/site/content/User/PlatformDeveloper.md -->
### Use solo with local build platform code

First, please clone hedera service repo `https://github.com/hiero-ledger/hiero-consensus-node/` and build the code
with `./gradlew assemble`. If need to run nodes with different versions or releases, please duplicate the repo or build directories in
multiple directories, checkout to the respective version and build the code.

Then you can start customized built platform testing application with the following command:

```bash
SOLO_CLUSTER_NAME=solo-cluster
SOLO_NAMESPACE=solo-e2e
SOLO_CLUSTER_SETUP_NAMESPACE=solo-setup
SOLO_DEVELOPMENT=solo-deployment

kind delete cluster -n "${SOLO_CLUSTER_NAME}" 
kind create cluster -n "${SOLO_CLUSTER_NAME}"
solo init
solo cluster setup -s "${SOLO_CLUSTER_SETUP_NAMESPACE}"
solo node keys --gossip-keys --tls-keys -i node1,node2,node3 
solo deployment create --namespace "${SOLO_NAMESPACE}"  --context kind-"${SOLO_CLUSTER_NAME}" --email john@doe.com --deployment-clusters kind-"${SOLO_CLUSTER_NAME}" --cluster-ref kind-"${SOLO_CLUSTER_NAME}" --deployment "${SOLO_DEVELOPMENT}" --node-aliases node1,node2,node3
solo network deploy --deployment "${SOLO_DEVELOPMENT}" -i node1,node2,node3 --app PlatformTestingTool.jar

# option 1) if all nodes are running the same version of platform testing app
solo node setup --deployment "${SOLO_DEVELOPMENT}" -i node1,node2,node3 --local-build-path ../hedera-services/platform-sdk/sdk/data

# option 2) if each node is running different version of platform testing app, please provide different paths to the local repositories
solo node setup --deployment "${SOLO_DEVELOPMENT}" -i node1,node2,node3 --local-build-path node1=../hedera-services/platform-sdk/sdk/data,node1=<path2>,node3=<path3>

solo node start --deployment "${SOLO_DEVELOPMENT}" -i node1,node2,node3 --app PlatformTestingTool.jar
```
<!-- Filename: docs/site/content/User/SDK.md -->
## Using Solo with Hedera JavaScript SDK

First, please follow solo repository README to install solo and Docker Desktop.
You also need to install the Taskfile tool following the instructions [here](https://taskfile.dev/installation/).

Then we start with launching a local Solo network with the following commands:

```bash
# launch a local Solo network with mirror node and hedera explorer
task default-with-mirror
```

Then create a new test account with the following command:

```
npm run solo-test -- account create -n solo-e2e --hbar-amount 100
```

The output would be similar to the following:

```bash
 *** new account created ***
-------------------------------------------------------------------------------
{
 "accountId": "0.0.1007",
 "publicKey": "302a300506032b65700321001d8978e647aca1195c54a4d3d5dc469b95666de14e9b6edde8ed337917b96013",
 "balance": 100
}
```

Then use the following command to get private key of the account `0.0.1007`:

```bash
 npm run solo-test -- account get --account-id 0.0.1007 -n solo-e2e --private-key
```

The output would be similar to the following:

```bash
{
 "accountId": "0.0.1007",
 "privateKey": "302e020100300506032b657004220420cfea706dd9ed2d3c1660ba98acf4fdb74d247cce289ef6ef47486e055e0b9508",
 "publicKey": "302a300506032b65700321001d8978e647aca1195c54a4d3d5dc469b95666de14e9b6edde8ed337917b96013",
 "balance": 100
}
```

Next step please clone the Hedera Javascript SDK repository https://github.com/hashgraph/hedera-sdk-js.
At the root of the project `hedera-sdk-js`,  create a file `.env` and add the following content:

```bash
# Hedera Operator Account ID
OPERATOR_ID="0.0.1007"

# Hedera Operator Private Key
OPERATOR_KEY="302a300506032b65700321001d8978e647aca1195c54a4d3d5dc469b95666de14e9b6edde8ed337917b96013"

# Hedera Network
HEDERA_NETWORK="local-node"
```

Make sure to assign the value of accountId to `OPERATOR_ID` and the value of privateKey to `OPERATOR_KEY`.

Then try the following command to run the test

```bash
node examples/create-account.js 
```

The output should be similar to the following:

```bash
private key = 302e020100300506032b6570042204208a3c1093c4df779c4aa980d20731899e0b509c7a55733beac41857a9dd3f1193
public key = 302a300506032b6570032100c55adafae7e85608ea893d0e2c77e2dae3df90ba8ee7af2f16a023ba2258c143
account id = 0.0.1009
```

Or try the topic creation example:

```bash
node examples/create-topic.js
```

The output should be similar to the following:

```bash
topic id = 0.0.1008
topic sequence number = 1


```

You can use Hedera explorer to check transactions and topics created in the Solo network:
http://localhost:8080/localnet/dashboard

Finally, after done with using solo, using the following command to tear down the Solo network:

```bash
task clean
```

### Retrieving Logs

You can find log for running solo command under the directory ~/.solo/logs/

The file solo.log contains the logs for the solo command.
The file hashgraph-sdk.log contains the logs from Solo client when sending transactions to network nodes.
<!-- Filename: docs/site/content/User/SoloCLI.md -->
## Solo command line user manual

Solo has a series of commands to use, and some commands have subcommands.
User can get help information by running with the following methods:

`solo --help` will return the help information for the `solo` command to show which commands
are available.

`solo command --help` will return the help information for the specific command to show which options

```text
solo account --help

Manage Hedera accounts in solo network

Commands:
  account init     Initialize system accounts with new keys
  account create   Creates a new account with a new key and stores the key in the Kubernetes secrets, if you supply no k
                   ey one will be generated for you, otherwise you may supply either a ECDSA or ED25519 private key
  account update   Updates an existing account with the provided info, if you want to update the private key, you can su
                   pply either ECDSA or ED25519 but not both

  account get      Gets the account info including the current amount of HBAR

Options:
      --dev      Enable developer mode                                                                         [boolean]
  -h, --help     Show help                                                                                     [boolean]
  -v, --version  Show version number                                                                           [boolean]
```

`solo command subcommand --help` will return the help information for the specific subcommand to show which options

```text
solo account create --help
Creates a new account with a new key and stores the key in the Kubernetes secrets, if you supply no key one will be gene
rated for you, otherwise you may supply either a ECDSA or ED25519 private key

Options:
      --dev                  Enable developer mode                                                             [boolean]
      --hbar-amount          Amount of HBAR to add                                                              [number]
      --create-amount        Amount of new account to create                                                    [number]
      --ecdsa-private-key    ECDSA private key for the Hedera account                                           [string]
  -n, --namespace            Namespace                                                                          [string]
      --ed25519-private-key  ED25519 private key for the Hedera account                                         [string]
      --generate-ecdsa-key   Generate ECDSA private key for the Hedera account                                 [boolean]
      --set-alias            Sets the alias for the Hedera account when it is created, requires --ecdsa-private-key
                                                                                                               [boolean]
  -h, --help                 Show help                                                                         [boolean]
  -v, --version              Show version number                                                               [boolean]
```

## For more information see: [SoloCommands.md](SoloCommands.md)

```
```
<!-- Filename: docs/site/content/User/SoloCommands.md -->
# Solo Command Reference

## Table of Contents

* [Root Help Output](#root-help-output)

* [init](#init)

* [account](#account)

  * [account init](#account-init)

  * [account create](#account-create)

  * [account update](#account-update)

  * [account get](#account-get)

* [cluster](#cluster)

  * [cluster connect](#cluster-connect)

  * [cluster list](#cluster-list)

  * [cluster info](#cluster-info)

  * [cluster setup](#cluster-setup)

  * [cluster reset](#cluster-reset)

* [network](#network)

  * [network deploy](#network-deploy)

  * [network destroy](#network-destroy)

  * [network refresh](#network-refresh)

* [node](#node)

  * [node setup](#node-setup)

  * [node start](#node-start)

  * [node stop](#node-stop)

  * [node keys](#node-keys)

  * [node refresh](#node-refresh)

  * [node logs](#node-logs)

  * [node states](#node-states)

  * [node add](#node-add)

  * [node add-prepare](#node-add-prepare)

  * [node add-submit-transactions](#node-add-submit-transactions)

  * [node add-execute](#node-add-execute)

  * [node update](#node-update)

  * [node update-prepare](#node-update-prepare)

  * [node update-submit-transactions](#node-update-submit-transactions)

  * [node update-execute](#node-update-execute)

  * [node delete](#node-delete)

  * [node delete-prepare](#node-delete-prepare)

  * [node delete-submit-transactions](#node-delete-submit-transactions)

  * [node delete-execute](#node-delete-execute)

  * [node prepare-upgrade](#node-prepare-upgrade)

  * [node freeze-upgrade](#node-freeze-upgrade)

  * [node upgrade](#node-upgrade)

  * [node upgrade-prepare](#node-upgrade-prepare)

  * [node upgrade-submit-transactions](#node-upgrade-submit-transactions)

  * [node upgrade-execute](#node-upgrade-execute)

  * [node download-generated-files](#node-download-generated-files)

* [relay](#relay)

  * [relay deploy](#relay-deploy)

  * [relay destroy](#relay-destroy)

* [mirror-node](#mirror-node)

  * [mirror-node deploy](#mirror-node-deploy)

  * [mirror-node destroy](#mirror-node-destroy)

* [explorer](#explorer)

  * [explorer deploy](#explorer-deploy)

  * [explorer destroy](#explorer-destroy)

* [deployment](#deployment)

  * [deployment create](#deployment-create)

  * [deployment list](#deployment-list)

## Root Help Output

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js --help

Usage:
  solo <command> [options]

Commands:
  init         Initialize local environment
  account      Manage Hedera accounts in solo network
  cluster      Manage solo testing cluster
  network      Manage solo network deployment
  node         Manage Hedera platform node in solo network
  relay        Manage JSON RPC relays in solo network
  mirror-node  Manage Hedera Mirror Node in solo network
  explorer     Manage Explorer in solo network
  deployment   Manage solo network deployment

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

## init

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js init --help

 init

Initialize local environment

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

## account

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js account --help

 account

Manage Hedera accounts in solo network

Commands:
  account init     Initialize system accounts with new keys
  account create   Creates a new account with a new key and stores the key in th
                   e Kubernetes secrets, if you supply no key one will be genera
                   ted for you, otherwise you may supply either a ECDSA or ED255
                   19 private key
  account update   Updates an existing account with the provided info, if you wa
                   nt to update the private key, you can supply either ECDSA or
                   ED25519 but not both

  account get      Gets the account info including the current amount of HBAR

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### account init

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js account init --help

 account init

Initialize system accounts with new keys

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -i, --node-aliases        Comma separated node aliases (empty means all nodes)
                                                                        [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### account create

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js account create --help

 account create

Creates a new account with a new key and stores the key in the Kubernetes secret
s, if you supply no key one will be generated for you, otherwise you may supply
either a ECDSA or ED25519 private key

Options:
      --dev                  Enable developer mode                     [boolean]
      --force-port-forward   Force port forward to access the network services
                                                                       [boolean]
      --hbar-amount          Amount of HBAR to add                      [number]
      --create-amount        Amount of new account to create            [number]
      --ecdsa-private-key    ECDSA private key for the Hedera account   [string]
  -d, --deployment           The name the user will reference locally to link to
                              a deployment                              [string]
      --ed25519-private-key  ED25519 private key for the Hedera account [string]
      --generate-ecdsa-key   Generate ECDSA private key for the Hedera account
                                                                       [boolean]
      --set-alias            Sets the alias for the Hedera account when it is cr
                             eated, requires --ecdsa-private-key       [boolean]
  -h, --help                 Show help                                 [boolean]
  -v, --version              Show version number                       [boolean]
```

### account update

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js account update --help

 account update

Updates an existing account with the provided info, if you want to update the pr
ivate key, you can supply either ECDSA or ED25519 but not both


Options:
      --dev                  Enable developer mode                     [boolean]
      --force-port-forward   Force port forward to access the network services
                                                                       [boolean]
      --account-id           The Hedera account id, e.g.: 0.0.1001      [string]
      --hbar-amount          Amount of HBAR to add                      [number]
  -d, --deployment           The name the user will reference locally to link to
                              a deployment                              [string]
      --ecdsa-private-key    ECDSA private key for the Hedera account   [string]
      --ed25519-private-key  ED25519 private key for the Hedera account [string]
  -h, --help                 Show help                                 [boolean]
  -v, --version              Show version number                       [boolean]
```

### account get

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js account get --help

 account get

Gets the account info including the current amount of HBAR

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --account-id          The Hedera account id, e.g.: 0.0.1001       [string]
      --private-key         Show private key information               [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

## cluster

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js cluster --help

 cluster

Manage solo testing cluster

Commands:
  cluster connect   updates the local configuration by connecting a deployment t
                    o a k8s context
  cluster list      List all available clusters
  cluster info      Get cluster info
  cluster setup     Setup cluster with shared components
  cluster reset     Uninstall shared components from cluster

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### cluster connect

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js cluster connect --help

 cluster connect

updates the local configuration by connecting a deployment to a k8s context

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
  -c, --cluster-ref         The cluster reference that will be used for referenc
                            ing the Kubernetes cluster and stored in the local a
                            nd remote configuration for the deployment.  For com
                            mands that take multiple clusters they can be separa
                            ted by commas.                              [string]
      --context             The Kubernetes context name to be used. Multiple con
                            texts can be separated by a comma           [string]
  -n, --namespace           Namespace                                   [string]
      --email               User email address used for local configuration
                                                                        [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### cluster list

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js cluster list --help

 cluster list

List all available clusters

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### cluster info

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js cluster info --help

 cluster info

Get cluster info

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### cluster setup

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js cluster setup --help

 cluster setup

Setup cluster with shared components

Options:
      --dev                      Enable developer mode                 [boolean]
      --force-port-forward       Force port forward to access the network servic
                                 es                                    [boolean]
      --chart-dir                Local chart directory path (e.g. ~/solo-charts/
                                 charts                                 [string]
  -c, --cluster-ref              The cluster reference that will be used for ref
                                 erencing the Kubernetes cluster and stored in t
                                 he local and remote configuration for the deplo
                                 yment.  For commands that take multiple cluster
                                 s they can be separated by commas.     [string]
  -s, --cluster-setup-namespace  Cluster Setup Namespace                [string]
      --cert-manager             Deploy cert manager, also deploys acme-cluster-
                                 issuer                                [boolean]
      --cert-manager-crds        Deploy cert manager CRDs              [boolean]
      --minio                    Deploy minio operator                 [boolean]
      --prometheus-stack         Deploy prometheus stack               [boolean]
  -q, --quiet-mode               Quiet mode, do not prompt for confirmation
                                                                       [boolean]
      --solo-chart-version       Solo testing chart version             [string]
  -h, --help                     Show help                             [boolean]
  -v, --version                  Show version number                   [boolean]
```

### cluster reset

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js cluster reset --help

 cluster reset

Uninstall shared components from cluster

Options:
      --dev                      Enable developer mode                 [boolean]
      --force-port-forward       Force port forward to access the network servic
                                 es                                    [boolean]
  -c, --cluster-ref              The cluster reference that will be used for ref
                                 erencing the Kubernetes cluster and stored in t
                                 he local and remote configuration for the deplo
                                 yment.  For commands that take multiple cluster
                                 s they can be separated by commas.     [string]
  -s, --cluster-setup-namespace  Cluster Setup Namespace                [string]
  -f, --force                    Force actions even if those can be skipped
                                                                       [boolean]
  -q, --quiet-mode               Quiet mode, do not prompt for confirmation
                                                                       [boolean]
  -h, --help                     Show help                             [boolean]
  -v, --version                  Show version number                   [boolean]
```

## network

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js network --help

 network

Manage solo network deployment

Commands:
  network deploy    Deploy solo network.  Requires the chart `solo-cluster-setup
                    ` to have been installed in the cluster.  If it hasn't the f
                    ollowing command can be ran: `solo cluster setup`
  network destroy   Destroy solo network
  network refresh   Refresh solo network deployment

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### network deploy

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js network deploy --help

 network deploy

Deploy solo network.  Requires the chart `solo-cluster-setup` to have been insta
lled in the cluster.  If it hasn't the following command can be ran: `solo clust
er setup`

Options:
      --dev                        Enable developer mode               [boolean]
      --force-port-forward         Force port forward to access the network serv
                                   ices                                [boolean]
      --api-permission-properties  api-permission.properties file for node
                                                                        [string]
      --app                        Testing app name                     [string]
      --application-env            the application.env file for the node provide
                                   s environment variables to the solo-container
                                    to be used when the hedera platform is start
                                   ed                                   [string]
      --application-properties     application.properties file for node [string]
      --bootstrap-properties       bootstrap.properties file for node   [string]
      --genesis-throttles-file     throttles.json file used during network genes
                                   is                                   [string]
      --cache-dir                  Local cache directory                [string]
  -l, --ledger-id                  Ledger ID (a.k.a. Chain ID)          [string]
      --chart-dir                  Local chart directory path (e.g. ~/solo-chart
                                   s/charts                             [string]
      --prometheus-svc-monitor     Enable prometheus service monitor for the net
                                   work nodes                          [boolean]
      --solo-chart-version         Solo testing chart version           [string]
      --debug-node-alias           Enable default jvm debug port (5005) for the
                                   given node id                        [string]
      --load-balancer              Enable load balancer for network node proxies
                                                                       [boolean]
      --log4j2-xml                 log4j2.xml file for node             [string]
  -d, --deployment                 The name the user will reference locally to l
                                   ink to a deployment                  [string]
  -i, --node-aliases               Comma separated node aliases (empty means all
                                    nodes)                              [string]
      --pvcs                       Enable persistent volume claims to store data
                                    outside the pod, required for node add
                                                                       [boolean]
      --profile-file               Resource profile definition (e.g. custom-spec
                                   .yaml)                               [string]
      --profile                    Resource profile (local | tiny | small | medi
                                   um | large)                          [string]
  -q, --quiet-mode                 Quiet mode, do not prompt for confirmation
                                                                       [boolean]
  -t, --release-tag                Release tag to be used (e.g. v0.58.10)
                                                                        [string]
      --settings-txt               settings.txt file for node           [string]
  -f, --values-file                Comma separated chart values file paths for e
                                   ach cluster (e.g. values.yaml,cluster-1=./a/b
                                   /values1.yaml,cluster-2=./a/b/values2.yaml)
                                                                        [string]
      --grpc-tls-cert              TLS Certificate path for the gRPC (e.g. "node
                                   1=/Users/username/node1-grpc.cert" with multi
                                   ple nodes comma separated)           [string]
      --grpc-web-tls-cert          TLS Certificate path for gRPC Web (e.g. "node
                                   1=/Users/username/node1-grpc-web.cert" with m
                                   ultiple nodes comma separated)       [string]
      --grpc-tls-key               TLS Certificate key path for the gRPC (e.g. "
                                   node1=/Users/username/node1-grpc.key" with mu
                                   ltiple nodes comma separated)        [string]
      --grpc-web-tls-key           TLC Certificate key path for gRPC Web (e.g. "
                                   node1=/Users/username/node1-grpc-web.key" wit
                                   h multiple nodes comma separated)    [string]
      --haproxy-ips                IP mapping where key = value is node alias an
                                   d static ip for haproxy, (e.g.: --haproxy-ips
                                    node1=127.0.0.1,node2=127.0.0.1)    [string]
      --envoy-ips                  IP mapping where key = value is node alias an
                                   d static ip for envoy proxy, (e.g.: --envoy-i
                                   ps node1=127.0.0.1,node2=127.0.0.1)  [string]
      --storage-type               storage type for saving stream files, availab
                                   le options are minio_only, aws_only, gcs_only
                                   , aws_and_gcs
      --gcs-access-key             gcs storage access key               [string]
      --gcs-secrets                gcs storage secret key               [string]
      --gcs-endpoint               gcs storage endpoint URL             [string]
      --gcs-bucket                 name of gcs storage bucket           [string]
      --gcs-bucket-prefix          path prefix of google storage bucket [string]
      --aws-access-key             aws storage access key               [string]
      --aws-secrets                aws storage secret key               [string]
      --aws-endpoint               aws storage endpoint URL             [string]
      --aws-bucket                 name of aws storage bucket           [string]
      --aws-bucket-prefix          path prefix of aws storage bucket    [string]
      --backup-bucket              name of bucket for backing up state files
                                                                        [string]
      --google-credential          path of google credential file in json format
                                                                        [string]
  -h, --help                       Show help                           [boolean]
  -v, --version                    Show version number                 [boolean]
```

### network destroy

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js network destroy --help

 network destroy

Destroy solo network

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --delete-pvcs         Delete the persistent volume claims        [boolean]
      --delete-secrets      Delete the network secrets                 [boolean]
      --enable-timeout      enable time out for running a command      [boolean]
  -f, --force               Force actions even if those can be skipped [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### network refresh

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js network refresh --help

 network refresh

Refresh solo network deployment

Options:
      --dev                        Enable developer mode               [boolean]
      --force-port-forward         Force port forward to access the network serv
                                   ices                                [boolean]
      --api-permission-properties  api-permission.properties file for node
                                                                        [string]
      --app                        Testing app name                     [string]
      --application-env            the application.env file for the node provide
                                   s environment variables to the solo-container
                                    to be used when the hedera platform is start
                                   ed                                   [string]
      --application-properties     application.properties file for node [string]
      --bootstrap-properties       bootstrap.properties file for node   [string]
      --genesis-throttles-file     throttles.json file used during network genes
                                   is                                   [string]
      --cache-dir                  Local cache directory                [string]
  -l, --ledger-id                  Ledger ID (a.k.a. Chain ID)          [string]
      --chart-dir                  Local chart directory path (e.g. ~/solo-chart
                                   s/charts                             [string]
      --prometheus-svc-monitor     Enable prometheus service monitor for the net
                                   work nodes                          [boolean]
      --solo-chart-version         Solo testing chart version           [string]
      --debug-node-alias           Enable default jvm debug port (5005) for the
                                   given node id                        [string]
      --load-balancer              Enable load balancer for network node proxies
                                                                       [boolean]
      --log4j2-xml                 log4j2.xml file for node             [string]
  -d, --deployment                 The name the user will reference locally to l
                                   ink to a deployment                  [string]
  -i, --node-aliases               Comma separated node aliases (empty means all
                                    nodes)                              [string]
      --pvcs                       Enable persistent volume claims to store data
                                    outside the pod, required for node add
                                                                       [boolean]
      --profile-file               Resource profile definition (e.g. custom-spec
                                   .yaml)                               [string]
      --profile                    Resource profile (local | tiny | small | medi
                                   um | large)                          [string]
  -q, --quiet-mode                 Quiet mode, do not prompt for confirmation
                                                                       [boolean]
  -t, --release-tag                Release tag to be used (e.g. v0.58.10)
                                                                        [string]
      --settings-txt               settings.txt file for node           [string]
  -f, --values-file                Comma separated chart values file paths for e
                                   ach cluster (e.g. values.yaml,cluster-1=./a/b
                                   /values1.yaml,cluster-2=./a/b/values2.yaml)
                                                                        [string]
      --grpc-tls-cert              TLS Certificate path for the gRPC (e.g. "node
                                   1=/Users/username/node1-grpc.cert" with multi
                                   ple nodes comma separated)           [string]
      --grpc-web-tls-cert          TLS Certificate path for gRPC Web (e.g. "node
                                   1=/Users/username/node1-grpc-web.cert" with m
                                   ultiple nodes comma separated)       [string]
      --grpc-tls-key               TLS Certificate key path for the gRPC (e.g. "
                                   node1=/Users/username/node1-grpc.key" with mu
                                   ltiple nodes comma separated)        [string]
      --grpc-web-tls-key           TLC Certificate key path for gRPC Web (e.g. "
                                   node1=/Users/username/node1-grpc-web.key" wit
                                   h multiple nodes comma separated)    [string]
      --haproxy-ips                IP mapping where key = value is node alias an
                                   d static ip for haproxy, (e.g.: --haproxy-ips
                                    node1=127.0.0.1,node2=127.0.0.1)    [string]
      --envoy-ips                  IP mapping where key = value is node alias an
                                   d static ip for envoy proxy, (e.g.: --envoy-i
                                   ps node1=127.0.0.1,node2=127.0.0.1)  [string]
      --storage-type               storage type for saving stream files, availab
                                   le options are minio_only, aws_only, gcs_only
                                   , aws_and_gcs
      --gcs-access-key             gcs storage access key               [string]
      --gcs-secrets                gcs storage secret key               [string]
      --gcs-endpoint               gcs storage endpoint URL             [string]
      --gcs-bucket                 name of gcs storage bucket           [string]
      --gcs-bucket-prefix          path prefix of google storage bucket [string]
      --aws-access-key             aws storage access key               [string]
      --aws-secrets                aws storage secret key               [string]
      --aws-endpoint               aws storage endpoint URL             [string]
      --aws-bucket                 name of aws storage bucket           [string]
      --aws-bucket-prefix          path prefix of aws storage bucket    [string]
      --backup-bucket              name of bucket for backing up state files
                                                                        [string]
      --google-credential          path of google credential file in json format
                                                                        [string]
  -h, --help                       Show help                           [boolean]
  -v, --version                    Show version number                 [boolean]
```

## node

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node --help

 node

Manage Hedera platform node in solo network

Commands:
  node setup                         Setup node with a specific version of Heder
                                     a platform
  node start                         Start a node
  node stop                          Stop a node
  node keys                          Generate node keys
  node refresh                       Reset and restart a node
  node logs                          Download application logs from the network
                                     nodes and stores them in <SOLO_LOGS_DIR>/<n
                                     amespace>/<podName>/ directory
  node states                        Download hedera states from the network nod
                                     es and stores them in <SOLO_LOGS_DIR>/<name
                                     space>/<podName>/ directory
  node add                           Adds a node with a specific version of Hede
                                     ra platform
  node add-prepare                   Prepares the addition of a node with a spec
                                     ific version of Hedera platform
  node add-submit-transactions       Submits NodeCreateTransaction and Upgrade t
                                     ransactions to the network nodes
  node add-execute                   Executes the addition of a previously prepa
                                     red node
  node update                        Update a node with a specific version of He
                                     dera platform
  node update-prepare                Prepare the deployment to update a node wit
                                     h a specific version of Hedera platform
  node update-submit-transactions    Submit transactions for updating a node wit
                                     h a specific version of Hedera platform
  node update-execute                Executes the updating of a node with a spec
                                     ific version of Hedera platform
  node delete                        Delete a node with a specific version of He
                                     dera platform
  node delete-prepare                Prepares the deletion of a node with a spec
                                     ific version of Hedera platform
  node delete-submit-transactions    Submits transactions to the network nodes f
                                     or deleting a node
  node delete-execute                Executes the deletion of a previously prepa
                                     red node
  node prepare-upgrade               Prepare the network for a Freeze Upgrade op
                                     eration
  node freeze-upgrade                Performs a Freeze Upgrade operation with on
                                      the network after it has been prepared wit
                                     h prepare-upgrade
  node upgrade                       upgrades all nodes on the network
  node upgrade-prepare               Prepare the deployment to upgrade network
  node upgrade-submit-transactions   Submit transactions for upgrading network
  node upgrade-execute               Executes the upgrading the network
  node download-generated-files      Downloads the generated files from an exist
                                     ing node

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node setup

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node setup --help

 node setup

Setup node with a specific version of Hedera platform

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --app                 Testing app name                            [string]
      --app-config          json config file of testing app             [string]
  -i, --node-aliases        Comma separated node aliases (empty means all nodes)
                                                                        [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
      --local-build-path    path of hedera local repo                   [string]
      --admin-public-keys   Comma separated list of DER encoded ED25519 public k
                            eys and must match the order of the node aliases
                                                                        [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node start

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node start --help

 node start

Start a node

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --app                 Testing app name                            [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
  -i, --node-aliases        Comma separated node aliases (empty means all nodes)
                                                                        [string]
      --debug-node-alias    Enable default jvm debug port (5005) for the given n
                            ode id                                      [string]
      --state-file          A zipped state file to be used for the network
                                                                        [string]
      --stake-amounts       The amount to be staked in the same order you list t
                            he node aliases with multiple node staked values com
                            ma separated                                [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node stop

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node stop --help

 node stop

Stop a node

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -i, --node-aliases        Comma separated node aliases (empty means all nodes)
                                                                        [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node keys

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node keys --help

 node keys

Generate node keys

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
      --gossip-keys         Generate gossip keys for nodes             [boolean]
      --tls-keys            Generate gRPC TLS keys for nodes           [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
  -i, --node-aliases        Comma separated node aliases (empty means all nodes)
                                                                        [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node refresh

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node refresh --help

 node refresh

Reset and restart a node

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -i, --node-aliases        Comma separated node aliases (empty means all nodes)
                                                                        [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --app                 Testing app name                            [string]
      --local-build-path    path of hedera local repo                   [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node logs

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node logs --help

 node logs

Download application logs from the network nodes and stores them in <SOLO_LOGS_D
IR>/<namespace>/<podName>/ directory

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -i, --node-aliases        Comma separated node aliases (empty means all nodes)
                                                                        [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node states

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node states --help

 node states

Download hedera states from the network nodes and stores them in <SOLO_LOGS_DIR>
/<namespace>/<podName>/ directory

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -i, --node-aliases        Comma separated node aliases (empty means all nodes)
                                                                        [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node add

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node add --help

 node add

Adds a node with a specific version of Hedera platform

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
      --endpoint-type       Endpoint type (IP or FQDN)                  [string]
      --gossip-keys         Generate gossip keys for nodes             [boolean]
      --tls-keys            Generate gRPC TLS keys for nodes           [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --app                 Testing app name                            [string]
  -l, --ledger-id           Ledger ID (a.k.a. Chain ID)                 [string]
      --debug-node-alias    Enable default jvm debug port (5005) for the given n
                            ode id                                      [string]
      --solo-chart-version  Solo testing chart version                  [string]
      --pvcs                Enable persistent volume claims to store data outsid
                            e the pod, required for node add           [boolean]
      --grpc-tls-cert       TLS Certificate path for the gRPC (e.g. "node1=/User
                            s/username/node1-grpc.cert" with multiple nodes comm
                            a separated)                                [string]
      --grpc-web-tls-cert   TLS Certificate path for gRPC Web (e.g. "node1=/User
                            s/username/node1-grpc-web.cert" with multiple nodes
                            comma separated)                            [string]
      --grpc-tls-key        TLS Certificate key path for the gRPC (e.g. "node1=/
                            Users/username/node1-grpc.key" with multiple nodes c
                            omma separated)                             [string]
      --grpc-web-tls-key    TLC Certificate key path for gRPC Web (e.g. "node1=/
                            Users/username/node1-grpc-web.key" with multiple nod
                            es comma separated)                         [string]
      --gossip-endpoints    Comma separated gossip endpoints of the node(e.g. fi
                            rst one is internal, second one is external)[string]
      --grpc-endpoints      Comma separated gRPC endpoints of the node (at most
                            8)                                          [string]
  -f, --force               Force actions even if those can be skipped [boolean]
      --local-build-path    path of hedera local repo                   [string]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
      --admin-key           Admin key                                   [string]
      --haproxy-ips         IP mapping where key = value is node alias and stati
                            c ip for haproxy, (e.g.: --haproxy-ips node1=127.0.0
                            .1,node2=127.0.0.1)                         [string]
      --envoy-ips           IP mapping where key = value is node alias and stati
                            c ip for envoy proxy, (e.g.: --envoy-ips node1=127.0
                            .0.1,node2=127.0.0.1)                       [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node add-prepare

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node add-prepare --help

 node add-prepare

Prepares the addition of a node with a specific version of Hedera platform

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
      --endpoint-type       Endpoint type (IP or FQDN)                  [string]
      --gossip-keys         Generate gossip keys for nodes             [boolean]
      --tls-keys            Generate gRPC TLS keys for nodes           [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --output-dir          Path to the directory where the command context will
                             be saved to                                [string]
      --app                 Testing app name                            [string]
  -l, --ledger-id           Ledger ID (a.k.a. Chain ID)                 [string]
      --debug-node-alias    Enable default jvm debug port (5005) for the given n
                            ode id                                      [string]
      --solo-chart-version  Solo testing chart version                  [string]
      --pvcs                Enable persistent volume claims to store data outsid
                            e the pod, required for node add           [boolean]
      --grpc-tls-cert       TLS Certificate path for the gRPC (e.g. "node1=/User
                            s/username/node1-grpc.cert" with multiple nodes comm
                            a separated)                                [string]
      --grpc-web-tls-cert   TLS Certificate path for gRPC Web (e.g. "node1=/User
                            s/username/node1-grpc-web.cert" with multiple nodes
                            comma separated)                            [string]
      --grpc-tls-key        TLS Certificate key path for the gRPC (e.g. "node1=/
                            Users/username/node1-grpc.key" with multiple nodes c
                            omma separated)                             [string]
      --grpc-web-tls-key    TLC Certificate key path for gRPC Web (e.g. "node1=/
                            Users/username/node1-grpc-web.key" with multiple nod
                            es comma separated)                         [string]
      --gossip-endpoints    Comma separated gossip endpoints of the node(e.g. fi
                            rst one is internal, second one is external)[string]
      --grpc-endpoints      Comma separated gRPC endpoints of the node (at most
                            8)                                          [string]
  -f, --force               Force actions even if those can be skipped [boolean]
      --local-build-path    path of hedera local repo                   [string]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
      --admin-key           Admin key                                   [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node add-submit-transactions

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node add-submit-transactions --help

 node add-submit-transactions

Submits NodeCreateTransaction and Upgrade transactions to the network nodes

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
      --endpoint-type       Endpoint type (IP or FQDN)                  [string]
      --gossip-keys         Generate gossip keys for nodes             [boolean]
      --tls-keys            Generate gRPC TLS keys for nodes           [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --input-dir           Path to the directory where the command context will
                             be loaded from                             [string]
      --app                 Testing app name                            [string]
  -l, --ledger-id           Ledger ID (a.k.a. Chain ID)                 [string]
      --debug-node-alias    Enable default jvm debug port (5005) for the given n
                            ode id                                      [string]
      --solo-chart-version  Solo testing chart version                  [string]
      --pvcs                Enable persistent volume claims to store data outsid
                            e the pod, required for node add           [boolean]
      --grpc-tls-cert       TLS Certificate path for the gRPC (e.g. "node1=/User
                            s/username/node1-grpc.cert" with multiple nodes comm
                            a separated)                                [string]
      --grpc-web-tls-cert   TLS Certificate path for gRPC Web (e.g. "node1=/User
                            s/username/node1-grpc-web.cert" with multiple nodes
                            comma separated)                            [string]
      --grpc-tls-key        TLS Certificate key path for the gRPC (e.g. "node1=/
                            Users/username/node1-grpc.key" with multiple nodes c
                            omma separated)                             [string]
      --grpc-web-tls-key    TLC Certificate key path for gRPC Web (e.g. "node1=/
                            Users/username/node1-grpc-web.key" with multiple nod
                            es comma separated)                         [string]
      --gossip-endpoints    Comma separated gossip endpoints of the node(e.g. fi
                            rst one is internal, second one is external)[string]
      --grpc-endpoints      Comma separated gRPC endpoints of the node (at most
                            8)                                          [string]
  -f, --force               Force actions even if those can be skipped [boolean]
      --local-build-path    path of hedera local repo                   [string]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node add-execute

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node add-execute --help

 node add-execute

Executes the addition of a previously prepared node

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
      --endpoint-type       Endpoint type (IP or FQDN)                  [string]
      --gossip-keys         Generate gossip keys for nodes             [boolean]
      --tls-keys            Generate gRPC TLS keys for nodes           [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --input-dir           Path to the directory where the command context will
                             be loaded from                             [string]
      --app                 Testing app name                            [string]
  -l, --ledger-id           Ledger ID (a.k.a. Chain ID)                 [string]
      --debug-node-alias    Enable default jvm debug port (5005) for the given n
                            ode id                                      [string]
      --solo-chart-version  Solo testing chart version                  [string]
      --pvcs                Enable persistent volume claims to store data outsid
                            e the pod, required for node add           [boolean]
      --grpc-tls-cert       TLS Certificate path for the gRPC (e.g. "node1=/User
                            s/username/node1-grpc.cert" with multiple nodes comm
                            a separated)                                [string]
      --grpc-web-tls-cert   TLS Certificate path for gRPC Web (e.g. "node1=/User
                            s/username/node1-grpc-web.cert" with multiple nodes
                            comma separated)                            [string]
      --grpc-tls-key        TLS Certificate key path for the gRPC (e.g. "node1=/
                            Users/username/node1-grpc.key" with multiple nodes c
                            omma separated)                             [string]
      --grpc-web-tls-key    TLC Certificate key path for gRPC Web (e.g. "node1=/
                            Users/username/node1-grpc-web.key" with multiple nod
                            es comma separated)                         [string]
      --gossip-endpoints    Comma separated gossip endpoints of the node(e.g. fi
                            rst one is internal, second one is external)[string]
      --grpc-endpoints      Comma separated gRPC endpoints of the node (at most
                            8)                                          [string]
  -f, --force               Force actions even if those can be skipped [boolean]
      --local-build-path    path of hedera local repo                   [string]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
      --haproxy-ips         IP mapping where key = value is node alias and stati
                            c ip for haproxy, (e.g.: --haproxy-ips node1=127.0.0
                            .1,node2=127.0.0.1)                         [string]
      --envoy-ips           IP mapping where key = value is node alias and stati
                            c ip for envoy proxy, (e.g.: --envoy-ips node1=127.0
                            .0.1,node2=127.0.0.1)                       [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node update

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node update --help

 node update

Update a node with a specific version of Hedera platform

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --node-alias          Node alias (e.g. node99)                    [string]
      --app                 Testing app name                            [string]
      --debug-node-alias    Enable default jvm debug port (5005) for the given n
                            ode id                                      [string]
      --endpoint-type       Endpoint type (IP or FQDN)                  [string]
      --solo-chart-version  Solo testing chart version                  [string]
      --new-admin-key       new admin key for the Hedera account        [string]
      --new-account-number  new account number for node update transaction
                                                                        [string]
      --tls-public-key      path and file name of the public TLS key to be used
                                                                        [string]
      --gossip-private-key  path and file name of the private key for signing go
                            ssip in PEM key format to be used           [string]
      --gossip-public-key   path and file name of the public key for signing gos
                            sip in PEM key format to be used            [string]
      --tls-private-key     path and file name of the private TLS key to be used
                                                                        [string]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
      --local-build-path    path of hedera local repo                   [string]
  -f, --force               Force actions even if those can be skipped [boolean]
      --gossip-endpoints    Comma separated gossip endpoints of the node(e.g. fi
                            rst one is internal, second one is external)[string]
      --grpc-endpoints      Comma separated gRPC endpoints of the node (at most
                            8)                                          [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node update-prepare

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node update-prepare --help

 node update-prepare

Prepare the deployment to update a node with a specific version of Hedera platfo
rm

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --output-dir          Path to the directory where the command context will
                             be saved to                                [string]
      --node-alias          Node alias (e.g. node99)                    [string]
      --app                 Testing app name                            [string]
      --debug-node-alias    Enable default jvm debug port (5005) for the given n
                            ode id                                      [string]
      --endpoint-type       Endpoint type (IP or FQDN)                  [string]
      --solo-chart-version  Solo testing chart version                  [string]
      --new-admin-key       new admin key for the Hedera account        [string]
      --new-account-number  new account number for node update transaction
                                                                        [string]
      --tls-public-key      path and file name of the public TLS key to be used
                                                                        [string]
      --gossip-private-key  path and file name of the private key for signing go
                            ssip in PEM key format to be used           [string]
      --gossip-public-key   path and file name of the public key for signing gos
                            sip in PEM key format to be used            [string]
      --tls-private-key     path and file name of the private TLS key to be used
                                                                        [string]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
      --local-build-path    path of hedera local repo                   [string]
  -f, --force               Force actions even if those can be skipped [boolean]
      --gossip-endpoints    Comma separated gossip endpoints of the node(e.g. fi
                            rst one is internal, second one is external)[string]
      --grpc-endpoints      Comma separated gRPC endpoints of the node (at most
                            8)                                          [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node update-submit-transactions

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node update-submit-transactions --help

 node update-submit-transactions

Submit transactions for updating a node with a specific version of Hedera platfo
rm

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --input-dir           Path to the directory where the command context will
                             be loaded from                             [string]
      --app                 Testing app name                            [string]
      --debug-node-alias    Enable default jvm debug port (5005) for the given n
                            ode id                                      [string]
      --endpoint-type       Endpoint type (IP or FQDN)                  [string]
      --solo-chart-version  Solo testing chart version                  [string]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
      --local-build-path    path of hedera local repo                   [string]
  -f, --force               Force actions even if those can be skipped [boolean]
      --gossip-endpoints    Comma separated gossip endpoints of the node(e.g. fi
                            rst one is internal, second one is external)[string]
      --grpc-endpoints      Comma separated gRPC endpoints of the node (at most
                            8)                                          [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node update-execute

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node update-execute --help

 node update-execute

Executes the updating of a node with a specific version of Hedera platform

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --input-dir           Path to the directory where the command context will
                             be loaded from                             [string]
      --app                 Testing app name                            [string]
      --debug-node-alias    Enable default jvm debug port (5005) for the given n
                            ode id                                      [string]
      --endpoint-type       Endpoint type (IP or FQDN)                  [string]
      --solo-chart-version  Solo testing chart version                  [string]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
      --local-build-path    path of hedera local repo                   [string]
  -f, --force               Force actions even if those can be skipped [boolean]
      --gossip-endpoints    Comma separated gossip endpoints of the node(e.g. fi
                            rst one is internal, second one is external)[string]
      --grpc-endpoints      Comma separated gRPC endpoints of the node (at most
                            8)                                          [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node delete

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node delete --help

 node delete

Delete a node with a specific version of Hedera platform

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
      --node-alias          Node alias (e.g. node99)                    [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --app                 Testing app name                            [string]
  -l, --ledger-id           Ledger ID (a.k.a. Chain ID)                 [string]
      --debug-node-alias    Enable default jvm debug port (5005) for the given n
                            ode id                                      [string]
      --endpoint-type       Endpoint type (IP or FQDN)                  [string]
      --solo-chart-version  Solo testing chart version                  [string]
  -f, --force               Force actions even if those can be skipped [boolean]
      --local-build-path    path of hedera local repo                   [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node delete-prepare

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node delete-prepare --help

 node delete-prepare

Prepares the deletion of a node with a specific version of Hedera platform

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
      --node-alias          Node alias (e.g. node99)                    [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --output-dir          Path to the directory where the command context will
                             be saved to                                [string]
      --app                 Testing app name                            [string]
  -l, --ledger-id           Ledger ID (a.k.a. Chain ID)                 [string]
      --debug-node-alias    Enable default jvm debug port (5005) for the given n
                            ode id                                      [string]
      --endpoint-type       Endpoint type (IP or FQDN)                  [string]
      --solo-chart-version  Solo testing chart version                  [string]
  -f, --force               Force actions even if those can be skipped [boolean]
      --local-build-path    path of hedera local repo                   [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node delete-submit-transactions

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node delete-submit-transactions --help

 node delete-submit-transactions

Submits transactions to the network nodes for deleting a node

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
      --node-alias          Node alias (e.g. node99)                    [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --input-dir           Path to the directory where the command context will
                             be loaded from                             [string]
      --app                 Testing app name                            [string]
  -l, --ledger-id           Ledger ID (a.k.a. Chain ID)                 [string]
      --debug-node-alias    Enable default jvm debug port (5005) for the given n
                            ode id                                      [string]
      --endpoint-type       Endpoint type (IP or FQDN)                  [string]
      --solo-chart-version  Solo testing chart version                  [string]
  -f, --force               Force actions even if those can be skipped [boolean]
      --local-build-path    path of hedera local repo                   [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node delete-execute

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node delete-execute --help

 node delete-execute

Executes the deletion of a previously prepared node

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
      --node-alias          Node alias (e.g. node99)                    [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --input-dir           Path to the directory where the command context will
                             be loaded from                             [string]
      --app                 Testing app name                            [string]
  -l, --ledger-id           Ledger ID (a.k.a. Chain ID)                 [string]
      --debug-node-alias    Enable default jvm debug port (5005) for the given n
                            ode id                                      [string]
      --endpoint-type       Endpoint type (IP or FQDN)                  [string]
      --solo-chart-version  Solo testing chart version                  [string]
  -f, --force               Force actions even if those can be skipped [boolean]
      --local-build-path    path of hedera local repo                   [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node prepare-upgrade

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node prepare-upgrade --help

 node prepare-upgrade

Prepare the network for a Freeze Upgrade operation

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
      --cache-dir           Local cache directory                       [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node freeze-upgrade

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node freeze-upgrade --help

 node freeze-upgrade

Performs a Freeze Upgrade operation with on the network after it has been prepar
ed with prepare-upgrade

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
      --cache-dir           Local cache directory                       [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node upgrade

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node upgrade --help

 node upgrade

upgrades all nodes on the network

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --upgrade-zip-file    A zipped file used for network upgrade      [string]
      --app                 Testing app name                            [string]
      --debug-node-alias    Enable default jvm debug port (5005) for the given n
                            ode id                                      [string]
  -i, --node-aliases        Comma separated node aliases (empty means all nodes)
                                                                        [string]
      --solo-chart-version  Solo testing chart version                  [string]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
      --local-build-path    path of hedera local repo                   [string]
  -f, --force               Force actions even if those can be skipped [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node upgrade-prepare

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node upgrade-prepare --help

 node upgrade-prepare

Prepare the deployment to upgrade network

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --upgrade-zip-file    A zipped file used for network upgrade      [string]
      --output-dir          Path to the directory where the command context will
                             be saved to                                [string]
      --app                 Testing app name                            [string]
      --debug-node-alias    Enable default jvm debug port (5005) for the given n
                            ode id                                      [string]
  -i, --node-aliases        Comma separated node aliases (empty means all nodes)
                                                                        [string]
      --solo-chart-version  Solo testing chart version                  [string]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
      --local-build-path    path of hedera local repo                   [string]
  -f, --force               Force actions even if those can be skipped [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node upgrade-submit-transactions

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node upgrade-submit-transactions --help

 node upgrade-submit-transactions

Submit transactions for upgrading network

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --input-dir           Path to the directory where the command context will
                             be loaded from                             [string]
      --app                 Testing app name                            [string]
      --debug-node-alias    Enable default jvm debug port (5005) for the given n
                            ode id                                      [string]
  -i, --node-aliases        Comma separated node aliases (empty means all nodes)
                                                                        [string]
      --solo-chart-version  Solo testing chart version                  [string]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
      --local-build-path    path of hedera local repo                   [string]
  -f, --force               Force actions even if those can be skipped [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node upgrade-execute

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node upgrade-execute --help

 node upgrade-execute

Executes the upgrading the network

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --cache-dir           Local cache directory                       [string]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
      --input-dir           Path to the directory where the command context will
                             be loaded from                             [string]
      --app                 Testing app name                            [string]
      --debug-node-alias    Enable default jvm debug port (5005) for the given n
                            ode id                                      [string]
  -i, --node-aliases        Comma separated node aliases (empty means all nodes)
                                                                        [string]
      --solo-chart-version  Solo testing chart version                  [string]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
      --local-build-path    path of hedera local repo                   [string]
  -f, --force               Force actions even if those can be skipped [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### node download-generated-files

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js node download-generated-files --help

 node download-generated-files

Downloads the generated files from an existing node

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
      --cache-dir           Local cache directory                       [string]
  -t, --release-tag         Release tag to be used (e.g. v0.58.10)      [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

## relay

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js relay --help

 relay

Manage JSON RPC relays in solo network

Commands:
  relay deploy    Deploy a JSON RPC relay
  relay destroy   Destroy JSON RPC relay

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### relay deploy

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js relay deploy --help

 relay deploy

Deploy a JSON RPC relay

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -l, --ledger-id           Ledger ID (a.k.a. Chain ID)                 [string]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -c, --cluster-ref         The cluster reference that will be used for referenc
                            ing the Kubernetes cluster and stored in the local a
                            nd remote configuration for the deployment.  For com
                            mands that take multiple clusters they can be separa
                            ted by commas.                              [string]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -i, --node-aliases        Comma separated node aliases (empty means all nodes)
                                                                        [string]
      --operator-id         Operator ID                                 [string]
      --operator-key        Operator Key                                [string]
      --profile-file        Resource profile definition (e.g. custom-spec.yaml)
                                                                        [string]
      --profile             Resource profile (local | tiny | small | medium | la
                            rge)                                        [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
      --relay-release       Relay release tag to be used (e.g. v0.48.0) [string]
      --replica-count       Replica count                               [number]
  -f, --values-file         Comma separated chart values file           [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### relay destroy

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js relay destroy --help

 relay destroy

Destroy JSON RPC relay

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
  -i, --node-aliases        Comma separated node aliases (empty means all nodes)
                                                                        [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

## mirror-node

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js mirror-node --help

 mirror-node

Manage Hedera Mirror Node in solo network

Commands:
  mirror-node deploy    Deploy mirror-node and its components
  mirror-node destroy   Destroy mirror-node components and database

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### mirror-node deploy

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js mirror-node deploy --help

 mirror-node deploy

Deploy mirror-node and its components

Options:
      --dev                               Enable developer mode        [boolean]
      --force-port-forward                Force port forward to access the netwo
                                          rk services                  [boolean]
  -c, --cluster-ref                       The cluster reference that will be use
                                          d for referencing the Kubernetes clust
                                          er and stored in the local and remote
                                          configuration for the deployment.  For
                                           commands that take multiple clusters
                                          they can be separated by commas.
                                                                        [string]
      --chart-dir                         Local chart directory path (e.g. ~/sol
                                          o-charts/charts               [string]
  -d, --deployment                        The name the user will reference local
                                          ly to link to a deployment    [string]
      --profile-file                      Resource profile definition (e.g. cust
                                          om-spec.yaml)                 [string]
      --profile                           Resource profile (local | tiny | small
                                           | medium | large)            [string]
  -q, --quiet-mode                        Quiet mode, do not prompt for confirma
                                          tion                         [boolean]
  -f, --values-file                       Comma separated chart values file
                                                                        [string]
      --mirror-node-version               Mirror node chart version     [string]
      --pinger                            Enable Pinger service in the Mirror no
                                          de monitor                   [boolean]
      --use-external-database             Set to true if you have an external da
                                          tabase to use instead of the database
                                          that the Mirror Node Helm chart suppli
                                          es                           [boolean]
      --operator-id                       Operator ID                   [string]
      --operator-key                      Operator Key                  [string]
      --storage-type                      storage type for saving stream files,
                                          available options are minio_only, aws_
                                          only, gcs_only, aws_and_gcs
      --storage-access-key                storage access key for mirror node imp
                                          orter                         [string]
      --storage-secrets                   storage secret key for mirror node imp
                                          orter                         [string]
      --storage-endpoint                  storage endpoint URL for mirror node i
                                          mporter                       [string]
      --storage-bucket                    name of storage bucket for mirror node
                                           importer                     [string]
      --storage-bucket-prefix             path prefix of storage bucket mirror n
                                          ode importer                  [string]
      --external-database-host            Use to provide the external database h
                                          ost if the '--use-external-database' i
                                          s passed                      [string]
      --external-database-owner-username  Use to provide the external database o
                                          wner's username if the '--use-external
                                          -database' is passed          [string]
      --external-database-owner-password  Use to provide the external database o
                                          wner's password if the '--use-external
                                          -database' is passed          [string]
      --external-database-read-username   Use to provide the external database r
                                          eadonly user's username if the '--use-
                                          external-database' is passed  [string]
      --external-database-read-password   Use to provide the external database r
                                          eadonly user's password if the '--use-
                                          external-database' is passed  [string]
  -h, --help                              Show help                    [boolean]
  -v, --version                           Show version number          [boolean]
```

### mirror-node destroy

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js mirror-node destroy --help

 mirror-node destroy

Destroy mirror-node components and database

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -c, --cluster-ref         The cluster reference that will be used for referenc
                            ing the Kubernetes cluster and stored in the local a
                            nd remote configuration for the deployment.  For com
                            mands that take multiple clusters they can be separa
                            ted by commas.                              [string]
  -f, --force               Force actions even if those can be skipped [boolean]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

## explorer

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js explorer --help

 explorer

Manage Explorer in solo network

Commands:
  explorer deploy    Deploy explorer
  explorer destroy   Destroy explorer

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### explorer deploy

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js explorer deploy --help

 explorer deploy

Deploy explorer

Options:
      --dev                            Enable developer mode           [boolean]
      --force-port-forward             Force port forward to access the network
                                       services                        [boolean]
      --chart-dir                      Local chart directory path (e.g. ~/solo-c
                                       harts/charts                     [string]
  -c, --cluster-ref                    The cluster reference that will be used f
                                       or referencing the Kubernetes cluster and
                                        stored in the local and remote configura
                                       tion for the deployment.  For commands th
                                       at take multiple clusters they can be sep
                                       arated by commas.                [string]
      --enable-ingress                 enable ingress on the component/pod
                                                                       [boolean]
      --enable-hedera-explorer-tls     Enable the Hedera Explorer TLS, defaults
                                       to false, requires certManager and certMa
                                       nagerCrds, which can be deployed through
                                       solo-cluster-setup chart or standalone
                                                                       [boolean]
      --hedera-explorer-tls-host-name  The host name to use for the Hedera Explo
                                       rer TLS, defaults to "explorer.solo.local
                                       "                                [string]
      --hedera-explorer-static-ip      The static IP address to use for the Hede
                                       ra Explorer load balancer, defaults to ""
                                                                        [string]
      --hedera-explorer-version        Hedera explorer chart version    [string]
      --mirror-static-ip               static IP address for the mirror node
                                                                        [string]
  -n, --namespace                      Namespace                        [string]
  -d, --deployment                     The name the user will reference locally
                                       to link to a deployment          [string]
      --profile-file                   Resource profile definition (e.g. custom-
                                       spec.yaml)                       [string]
      --profile                        Resource profile (local | tiny | small |
                                       medium | large)                  [string]
  -q, --quiet-mode                     Quiet mode, do not prompt for confirmatio
                                       n                               [boolean]
  -s, --cluster-setup-namespace        Cluster Setup Namespace          [string]
      --solo-chart-version             Solo testing chart version       [string]
      --tls-cluster-issuer-type        The TLS cluster issuer type to use for he
                                       dera explorer, defaults to "self-signed",
                                        the available options are: "acme-staging
                                       ", "acme-prod", or "self-signed" [string]
  -f, --values-file                    Comma separated chart values file[string]
  -h, --help                           Show help                       [boolean]
  -v, --version                        Show version number             [boolean]
```

### explorer destroy

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js explorer destroy --help

 explorer destroy

Destroy explorer

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
      --chart-dir           Local chart directory path (e.g. ~/solo-charts/chart
                            s                                           [string]
  -c, --cluster-ref         The cluster reference that will be used for referenc
                            ing the Kubernetes cluster and stored in the local a
                            nd remote configuration for the deployment.  For com
                            mands that take multiple clusters they can be separa
                            ted by commas.                              [string]
  -f, --force               Force actions even if those can be skipped [boolean]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
  -d, --deployment          The name the user will reference locally to link to
                            a deployment                                [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

## deployment

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js deployment --help

 deployment

Manage solo network deployment

Commands:
  deployment create   Creates solo deployment
  deployment list     List solo deployments inside a cluster

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```

### deployment create

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js deployment create --help

 deployment create

Creates solo deployment

Options:
      --dev                  Enable developer mode                     [boolean]
      --force-port-forward   Force port forward to access the network services
                                                                       [boolean]
  -q, --quiet-mode           Quiet mode, do not prompt for confirmation[boolean]
      --context              The Kubernetes context name to be used. Multiple co
                             ntexts can be separated by a comma         [string]
  -n, --namespace            Namespace                                  [string]
  -c, --cluster-ref          The cluster reference that will be used for referen
                             cing the Kubernetes cluster and stored in the local
                              and remote configuration for the deployment.  For
                             commands that take multiple clusters they can be se
                             parated by commas.                         [string]
      --email                User email address used for local configuration
                                                                        [string]
  -d, --deployment           The name the user will reference locally to link to
                              a deployment                              [string]
      --deployment-clusters  Solo deployment cluster list (comma separated)
                                                                        [string]
  -i, --node-aliases         Comma separated node aliases (empty means all nodes
                             )                                          [string]
  -h, --help                 Show help                                 [boolean]
  -v, --version              Show version number                       [boolean]
```

### deployment list

```

> @hashgraph/solo@0.35.0 solo
> node --no-deprecation --no-warnings dist/solo.js deployment list --help

 deployment list

List solo deployments inside a cluster

Options:
      --dev                 Enable developer mode                      [boolean]
      --force-port-forward  Force port forward to access the network services
                                                                       [boolean]
  -q, --quiet-mode          Quiet mode, do not prompt for confirmation [boolean]
  -c, --cluster-ref         The cluster reference that will be used for referenc
                            ing the Kubernetes cluster and stored in the local a
                            nd remote configuration for the deployment.  For com
                            mands that take multiple clusters they can be separa
                            ted by commas.                              [string]
  -h, --help                Show help                                  [boolean]
  -v, --version             Show version number                        [boolean]
```
<!-- Filename: docs/site/content/User/SoloWithMirrorNode.md -->
## Using Solo with mirror node

User can deploy a solo network with mirror node by running the following command:

```bash
export SOLO_CLUSTER_NAME=solo-cluster
export SOLO_NAMESPACE=solo-e2e
export SOLO_CLUSTER_SETUP_NAMESPACE=solo-cluster-setup
export SOLO_DEVELOPMENT=solo-deployment

kind delete cluster -n "${SOLO_CLUSTER_NAME}"
kind create cluster -n "${SOLO_CLUSTER_NAME}"
solo init
solo node keys --gossip-keys --tls-keys -i node1,node2
solo cluster setup --cluster-setup-namespace "${SOLO_CLUSTER_SETUP_NAMESPACE}"
solo deployment create --namespace "${SOLO_NAMESPACE}"  --context kind-"${SOLO_CLUSTER_NAME}" --email john@doe.com --deployment-clusters kind-"${SOLO_CLUSTER_NAME}" --cluster-ref kind-"${SOLO_CLUSTER_NAME}" --deployment "${SOLO_DEVELOPMENT}" --node-aliases node1,node2

solo network deploy --deployment "${SOLO_DEVELOPMENT}" -i node1,node2
solo node setup     --deployment "${SOLO_DEVELOPMENT}" -i node1,node2
solo node start     --deployment "${SOLO_DEVELOPMENT}" -i node1,node2

solo mirror-node deploy --deployment "${SOLO_DEVELOPMENT}"  

kubectl port-forward svc/haproxy-node1-svc -n "${SOLO_NAMESPACE}" 50211:50211 > /dev/null 2>&1 &
```

Then you can access the hedera explorer at `http://localhost:8080`

Or you can use Task tool to deploy solo network with mirror node with a single command [link](TaskTool.md)

Next, you can try to create a few accounts with solo and see the transactions in the explorer.

```bash
solo account create -n solo-e2e --hbar-amount 100
solo account create -n solo-e2e --hbar-amount 100
```

Or you can use Hedera JavaScript SDK examples to create topic, submit message and subscribe to the topic.

<!---
Add SDK.md link here
-->

* [Instructions for using Solo with Hedera JavaScript SDK](SDK.md)
<!-- Filename: docs/site/content/User/StepByStepGuide.md -->
<!-- Filename: docs/site/content/User/TaskTool.md -->
## Use the Task tool to launch Solo

For users who want to quickly deploy a standalone solo network without needing to know what is under the hood,
they can use the Task tool to launch the network with a single command.

NOTE: this requires cloning the GitHub repository: https://github.com/hashgraph/solo

First, install the cluster tool `kind` with this [link](https://kind.sigs.k8s.io/docs/user/quick-start#installation)

Then, install the task tool `task` with this [link](https://taskfile.dev/installation/)

`task` will install dependencies and build the solo project.

### Start solo network

User can use one of the following three commands to quickly deploy a standalone solo network.

```bash
# Option 1) deploy solo network with two nodes `task` is the same as `task default`
task

# Option 2) deploy solo network with two nodes, and mirror node
task default-with-mirror

# Option 3) deploy solo network with two nodes, mirror node, and JSON RPC relay
task default-with-relay
```

If mirror node or relay node is deployed, user can access the hedera explorer at http://localhost:8080

### Stop solo network

To tear down the solo network

```bash
task clean
```
<!-- Filename: docs/site/content/User/_index.md -->
---
title: Collapse
geekdocCollapseSection: true
---
<!-- Filename: docs/site/content/_index.md -->
---
title: Welcome to Solo Documentation
geekdocNav: true
geekdocAlign: center
geekdocAnchor: false
geekdocDescription: Home page for Solo Documentation
---

<!-- markdownlint-capture -->

<!-- markdownlint-disable MD033 -->

<!-- markdownlint-restore -->

[![NPM Version](https://img.shields.io/npm/v/%40hashgraph%2Fsolo?logo=npm)](https://www.npmjs.com/package/@hashgraph/solo)
[![GitHub License](https://img.shields.io/github/license/hashgraph/solo?logo=apache\&logoColor=red)](LICENSE)
![node-lts](https://img.shields.io/node/v-lts/%40hashgraph%2Fsolo)
[![Build Application](https://github.com/hashgraph/solo/actions/workflows/flow-build-application.yaml/badge.svg)](https://github.com/hashgraph/solo/actions/workflows/flow-build-application.yaml)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/83a423a3a1c942459127b3aec62ab0b5)](https://app.codacy.com/gh/hashgraph/solo/dashboard?utm_source=gh\&utm_medium=referral\&utm_content=\&utm_campaign=Badge_grade)
[![codecov](https://codecov.io/gh/hashgraph/solo/graph/badge.svg?token=hBkQdB1XO5)](https://codecov.io/gh/hashgraph/solo)

Solo is an opinionated CLI tool to deploy and manage standalone test networks.

{{< button size="large" relref="User/README/README.md" >}}Getting Started{{< /button >}}

## Feature overview

{{< columns >}}

### Clean and simple design

Stay focused on deployment and don't get overwhelmed by a complex design.

{{< /columns >}}

{{< columns >}}

### Easy configuration

Getting started in minutes. Solo comes with easy to use configuration.

{{< /columns >}}
<!-- Filename: examples/README.md -->
# The usage of examples in Solo

## Prerequisites

* install taskfile: `npm install -g taskfile-cli`

## Running the examples with Taskfile

* `cd` into the directory under `examples` that has the `Taskfile.yml`, e.g. (from solo repo root directory) `cd examples/solo-gke-test/`
* make sure that your current kubeconfig context is pointing to the cluster that you want to deploy to
* run `task` which will do the rest and deploy the network and take care of many of the pre-requisites

NOTES:

* Some of these examples are for running against large clusters with a lot of resources available.
* the `env` environment variables if set in your shell will take precedence over what is in the Taskfile.yml. e.g. `export HEDERA_SERVICES_ROOT=<path-to-hedera-services-root>`

## Customizing the examples

* take a look at the Taskfile.yml sitting in the subdirectory for the deployment you want to run
* make sure your cluster can handle the number in SOLO\_NETWORK\_SIZE, if not, then you will have to update that and make it match the number of nodes in the `init-containers-values.yaml`: `hedera.nodes[]`
* take a look at the `init-containers-values.yaml` file and make sure the values are correct for your deployment with special attention to:
  * resources
  * nodeSelector
  * tolerations
* the `env` environment variables can be changed in the `Taskfile.yml` file as needed
* some are commented out just for awareness, but would need missing files or extra steps if you tried to run them as-is

## Provided examples for Consensus nodes

* examples/performance-tuning/solo-perf-test/init-containers-values.yaml (Solo on Google Cloud, for 4-core/32Gb 7-node )
* examples/performance-tuning/Latitude/init-containers-values.yaml (Latitude, 128Gb, 10-node)
* examples/solo-gke-test (Solo on Google Cloud, for 4-core/32Gb 5-node )

## Add corresponding NetworkLoadGenerator templates

* examples/performance-tuning/solo-perf-test/nlg-values.yaml
* examples/performance-tuning/Latitude/nlg-values.yaml

Start as the following, while in the directory of the nlg-values.yaml and updating the namespace to match your Taskfile.yml:

> helm upgrade --install nlg oci://swirldslabs.jfrog.io/load-generator-helm-release-local/network-load-generator --version 0.2.1 --values nlg-values.yaml -n solo-perf-test
<!-- Filename: examples/address-book/README.md -->
# Yahcli Address Book Example

This is an example of how to use Yahcli to pull the ledger and mirror node address book.  And to update the ledger address book.  It updates File 101 (the ledger address book file) and File 102 (the ledger node details file).

NOTE: Mirror Node refers to File 102 as its address book.

## Usage

To get the address book from the ledger, this requires a port forward to be setup on port 50211 to consensus node with node ID = 0.

```bash
# try and detect if the port forward is already setup
netstat -na | grep 50211
ps -ef | grep 50211 | grep -v grep

# setup a port forward if you need to
kubectl port-forward -n "${SOLO_NAMESPACE}" pod/network-node1-0 50211:50211
```

To get the address book from the ledger, run the following command:

```bash
cd <solo-root>/examples/address-book
task get:ledger:addressbook
```

It will output the address book in JSON format to:

* `examples/address-book/localhost/sysfiles/addressBook.json`
* `examples/address-book/localhost/sysfiles/nodeDetails.json`

You can update the address book files with your favorite text editor.

Once the files are ready, you can upload them to the ledger by running the following command:

```bash
cd <solo-root>/examples/address-book
task update:ledger:addressbook
```

To get the address book from the mirror node, run the following command:

```bash
cd <solo-root>/examples/address-book
task get:mirror:addressbook
```

NOTE: Mirror Node may not pick up the changes automatically, it might require running some transactions through, example:

```bash
cd <solo-root>
npm run solo -- account create
npm run solo -- account create
npm run solo -- account create
npm run solo -- account create
npm run solo -- account create
npm run solo -- account update -n solo-e2e --account-id 0.0.1004 --hbar-amount 78910 
```
<!-- Filename: examples/sdk-network-connection/README.md -->
# Solo Network Connection Example

## pre-requirements:

1. fork or download the solo repository: https://github.com/hashgraph/solo
2. have NodeJS 20+ and NPM installed: https://nodejs.org/en/download/package-manager
3. have Taskfile installed: https://taskfile.dev/installation/

## running the Solo connection example:

1. open a terminal and cd into the root of the solo repo directory
2. run: `task default-with-mirror`
3. run: `cd examples/sdk-network-connection`
4. run: `npm install`
5. run: `node solo-network-connection.js`
<!-- Filename: test/e2e/dual-cluster/README.md -->
# Local Dual Cluster Testing

This document describes how to test the dual cluster setup locally.

## Prerequisites

* Make sure you give your Docker sufficient resources
  * ? CPUs
  * ? GB RAM
  * ? GB Swap
  * ? GB Disk Space
* If you are tight on resources you might want to make sure that no other Kind clusters are running or anything that is resource heavy on your machine.

## Calling

```bash
# from your Solo root directory run:
./test/e2e/dual-cluster/setup-dual-e2e.sh
```

Output:

```bash
SOLO_CHARTS_DIR:
Deleting cluster "solo-e2e-c1" ...
Deleting cluster "solo-e2e-c2" ...
1051ed73cb755a017c3d578e5c324eef1cae95c606164f97228781db126f80b6
"metrics-server" has been added to your repositories
"metallb" has been added to your repositories
Creating cluster "solo-e2e-c1" ...
 ✓ Ensuring node image (kindest/node:v1.31.4) 🖼
 ✓ Preparing nodes 📦
 ✓ Writing configuration 📜
 ✓ Starting control-plane 🕹️
 ✓ Installing CNI 🔌
 ✓ Installing StorageClass 💾
Set kubectl context to "kind-solo-e2e-c1"
You can now use your cluster with:

kubectl cluster-info --context kind-solo-e2e-c1

Thanks for using kind! 😊
Release "metrics-server" does not exist. Installing it now.
NAME: metrics-server
LAST DEPLOYED: Fri Feb 14 16:04:15 2025
NAMESPACE: kube-system
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
***********************************************************************
* Metrics Server                                                      *
***********************************************************************
  Chart version: 3.12.2
  App version:   0.7.2
  Image tag:     registry.k8s.io/metrics-server/metrics-server:v0.7.2
***********************************************************************
Release "metallb" does not exist. Installing it now.
NAME: metallb
LAST DEPLOYED: Fri Feb 14 16:04:16 2025
NAMESPACE: metallb-system
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
MetalLB is now running in the cluster.

Now you can configure it via its CRs. Please refer to the metallb official docs
on how to use the CRs.
ipaddresspool.metallb.io/local created
l2advertisement.metallb.io/local created
namespace/cluster-diagnostics created
configmap/cluster-diagnostics-cm created
service/cluster-diagnostics-svc created
deployment.apps/cluster-diagnostics created
Creating cluster "solo-e2e-c2" ...
 ✓ Ensuring node image (kindest/node:v1.31.4) 🖼
 ✓ Preparing nodes 📦
 ✓ Writing configuration 📜
 ✓ Starting control-plane 🕹️
 ✓ Installing CNI 🔌
 ✓ Installing StorageClass 💾
Set kubectl context to "kind-solo-e2e-c2"
You can now use your cluster with:

kubectl cluster-info --context kind-solo-e2e-c2

Have a question, bug, or feature request? Let us know! https://kind.sigs.k8s.io/#community 🙂
Release "metrics-server" does not exist. Installing it now.
NAME: metrics-server
LAST DEPLOYED: Fri Feb 14 16:05:07 2025
NAMESPACE: kube-system
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
***********************************************************************
* Metrics Server                                                      *
***********************************************************************
  Chart version: 3.12.2
  App version:   0.7.2
  Image tag:     registry.k8s.io/metrics-server/metrics-server:v0.7.2
***********************************************************************
Release "metallb" does not exist. Installing it now.
NAME: metallb
LAST DEPLOYED: Fri Feb 14 16:05:08 2025
NAMESPACE: metallb-system
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
MetalLB is now running in the cluster.

Now you can configure it via its CRs. Please refer to the metallb official docs
on how to use the CRs.
ipaddresspool.metallb.io/local created
l2advertisement.metallb.io/local created
namespace/cluster-diagnostics created
configmap/cluster-diagnostics-cm created
service/cluster-diagnostics-svc created
deployment.apps/cluster-diagnostics created

> @hashgraph/solo@0.34.0 build
> rm -Rf dist && tsc && node resources/post-build-script.js


> @hashgraph/solo@0.34.0 solo
> node --no-deprecation --no-warnings dist/solo.js init


******************************* Solo *********************************************
Version			: 0.34.0
Kubernetes Context	: kind-solo-e2e-c2
Kubernetes Cluster	: kind-solo-e2e-c2
Current Command		: init
**********************************************************************************
✔ Setup home directory and cache
✔ Check dependencies
  ✔ Check dependency: helm [OS: darwin, Release: 23.6.0, Arch: arm64]
✔ Setup chart manager [1s]
✔ Copy templates in '/Users/user/.solo/cache'


***************************************************************************************
Note: solo stores various artifacts (config, logs, keys etc.) in its home directory: /Users/user/.solo
If a full reset is needed, delete the directory or relevant sub-directories before running 'solo init'.
***************************************************************************************
Switched to context "kind-solo-e2e-c1".

> @hashgraph/solo@0.34.0 solo
> node --no-deprecation --no-warnings dist/solo.js cluster setup -s solo-setup


******************************* Solo *********************************************
Version			: 0.34.0
Kubernetes Context	: kind-solo-e2e-c1
Kubernetes Cluster	: kind-solo-e2e-c1
Current Command		: cluster setup
**********************************************************************************
✔ Initialize
✔ Prepare chart values
✔ Install 'solo-cluster-setup' chart [2s]
NAME              	NAMESPACE     	REVISION	UPDATED                             	STATUS  	CHART                    	APP VERSION
metallb           	metallb-system	1       	2025-02-14 16:04:16.785411 +0000 UTC	deployed	metallb-0.14.9           	v0.14.9
metrics-server    	kube-system   	1       	2025-02-14 16:04:15.593138 +0000 UTC	deployed	metrics-server-3.12.2    	0.7.2
solo-cluster-setup	solo-setup    	1       	2025-02-14 16:05:54.334181 +0000 UTC	deployed	solo-cluster-setup-0.44.0	0.44.0
Switched to context "kind-solo-e2e-c2".

> @hashgraph/solo@0.34.0 solo
> node --no-deprecation --no-warnings dist/solo.js cluster setup -s solo-setup


******************************* Solo *********************************************
Version			: 0.34.0
Kubernetes Context	: kind-solo-e2e-c2
Kubernetes Cluster	: kind-solo-e2e-c2
Current Command		: cluster setup
**********************************************************************************
✔ Initialize
✔ Prepare chart values
✔ Install 'solo-cluster-setup' chart [2s]
NAME              	NAMESPACE     	REVISION	UPDATED                             	STATUS  	CHART                    	APP VERSION
metallb           	metallb-system	1       	2025-02-14 16:05:08.226466 +0000 UTC	deployed	metallb-0.14.9           	v0.14.9
metrics-server    	kube-system   	1       	2025-02-14 16:05:07.217358 +0000 UTC	deployed	metrics-server-3.12.2    	0.7.2
solo-cluster-setup	solo-setup    	1       	2025-02-14 16:05:58.114619 +0000 UTC	deployed	solo-cluster-setup-0.44.0	0.44.0
Switched to context "kind-solo-e2e-c1".
```

## Diagnostics

The `./diagnostics/cluster/deploy.sh` deploys a `cluster-diagnostics` deployment (and its pod) with a service that has its external IP exposed.  It is deployed to both clusters, runs Ubuntu, and has most diagnostic software installed.  After ran you can shell into the pod and use the container to run your own troubleshooting commands for verifying network connectivity between the two clusters or DNS resolution, etc.

Calling

```bash
# from your Solo root directory run:
$ ./test/e2e/dual-cluster/diagnostics/cluster/deploy.sh
```

Output:

```bash
namespace/cluster-diagnostics unchanged
configmap/cluster-diagnostics-cm unchanged
service/cluster-diagnostics-svc unchanged
deployment.apps/cluster-diagnostics unchanged
```

## Cleanup

Calling

```bash
# from your Solo root directory run:
kind delete clusters cluster1 cluster2
```

Output:

```bash
Deleted clusters: ["cluster1" "cluster2"]
```
<!-- Filename: test/scripts/README.md -->
# Node key generation

There are two scripts to generate node gossip keys and grpc TLS keys as below:

* `test/scripts/gen-legacy-keys.sh`: It generates keys using `keytool` in legacy PFX format where each nodes keys are combined into a single `pfx` file.
* `test/scripts/gen-openssl-keys.sh`: It generates keys using `openssl` where each private and public keys are separate `pem` files.

## Usage

In order to generate keys in PEM format for 3 nodes (`node0,node1,node3`), run as below:

```
$ mkdir keys
$ ./gen-openssl-keys.sh node0,node1,node3 ./keys
```

View the certificate using command below:

```
$ ls keys 
a-private-node0.pem a-public-node0.pem  backup              hedera-node0.crt    hedera-node0.key    s-private-node0.pem s-public-node0.pem
$ openssl x509 -in keys/s-public-node0.pem -noout -text
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number:
            6d:df:e0:3c:a9:4c:ed:a0:95:a5:77:2a:74:92:29:93:1d:72:87:41
        Signature Algorithm: sha384WithRSAEncryption
        Issuer: CN=s-node0
        Validity
            Not Before: Oct  2 02:27:21 2024 GMT
            Not After : Oct  2 02:27:21 2124 GMT
        Subject: CN=s-node0
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                Public-Key: (3072 bit)
                Modulus:
                    00:98:1b:2c:ad:c0:24:de:d5:14:1c:ec:4c:c6:7b:
                    63:f9:c9:24:85:27:ec:ed:c3:35:22:2e:cb:d3:81:
                    c2:58:27:3e:d3:bb:f1:3c:7f:ba:fd:ba:b1:63:26:
                    57:d0:db:cf:71:40:24:92:2f:fc:2e:cb:5f:c8:e6:
                    ab:c1:48:87:23:2e:0d:c8:10:6d:5f:ca:3f:1d:e9:
                    c2:5a:45:87:87:61:44:1b:96:8f:36:50:25:80:47:
                    80:cb:40:63:33:7a:c1:da:fd:ec:59:1b:0a:11:ee:
                    08:b7:1f:77:16:06:69:b1:1a:88:fd:da:9c:ce:74:
                    f9:7c:6c:c8:9e:11:32:6b:42:74:c7:ec:c0:24:ac:
                    a7:b9:b3:83:2b:f8:8c:4c:2f:7a:0f:3c:4d:d1:f9:
                    8f:98:98:b6:ec:13:06:8e:d7:be:f9:5c:42:81:8b:
                    06:9c:55:dc:2a:e7:d1:f8:dd:f3:fd:7c:3c:ce:4e:
                    91:4a:a3:2b:70:26:65:58:19:35:52:68:99:ef:37:
                    6c:32:73:0a:4c:5a:b3:17:b3:3b:17:39:12:c1:0e:
                    4e:24:4d:32:9d:54:5b:a0:0c:f1:18:43:0d:70:61:
                    1c:3b:aa:13:57:5b:13:47:e6:65:61:65:20:8e:f2:
                    5f:8f:e0:dd:84:f0:d4:4f:2e:77:a3:cd:6b:6c:58:
                    bd:e7:8b:f6:b0:a4:80:27:f5:3d:67:ac:44:9f:17:
                    95:9c:d7:12:96:e9:ad:5d:2b:ee:90:75:19:c3:7a:
                    52:05:df:ad:94:e7:da:4d:d3:4b:62:d9:b7:44:7c:
                    e6:6b:b2:0e:44:db:69:81:aa:64:88:b8:a3:9c:d5:
                    c3:b1:88:ba:85:db:58:bc:ec:d8:f7:4a:db:d3:0e:
                    5e:28:d3:ab:8d:69:6c:25:01:45:61:1d:7a:68:6f:
                    ad:e2:81:e9:34:c3:94:29:b8:7e:77:8d:fd:eb:1b:
                    38:1f:86:d0:bd:aa:db:2f:e2:4f:7d:05:52:3d:25:
                    96:27:aa:67:a7:c8:5d:17:3b:d7
                Exponent: 65537 (0x10001)
        X509v3 extensions:
            X509v3 Subject Key Identifier: 
                BA:25:24:4E:2C:94:2E:7B:B0:40:05:3C:4C:EC:F5:9F:AE:02:B2:A6
    Signature Algorithm: sha384WithRSAEncryption
    Signature Value:
        34:e7:0c:0d:c8:de:5d:50:ca:ca:78:b5:b5:af:38:24:9e:99:
        0d:c9:d5:da:2c:c7:63:20:fa:26:41:c6:4c:9b:ca:71:8c:e2:
        19:f1:22:87:92:1a:0d:c3:6a:87:69:90:45:33:e9:06:93:75:
        d0:56:8b:84:b8:61:7d:6c:09:3b:37:b6:c9:46:e8:bd:97:bc:
        d8:9f:ff:c8:07:13:85:e7:42:31:12:f7:ea:38:87:81:2f:48:
        5c:a5:96:67:d6:52:df:f9:e1:54:d5:42:cc:5c:49:33:27:15:
        55:9a:4f:29:e6:90:f5:8e:6e:bf:b7:c1:1d:1f:b1:bd:65:05:
        55:57:72:0e:31:b8:32:31:04:98:ad:1d:6e:0d:9d:46:87:36:
        6e:6c:24:9e:dc:f4:3b:0f:ec:9b:09:d4:97:13:3c:83:2e:65:
        4a:cc:29:95:76:fa:7a:2e:1e:ad:03:e3:a7:36:29:9b:31:21:
        00:02:59:82:c4:f6:a0:fc:07:cf:0f:20:13:6b:12:78:01:e7:
        00:68:55:ed:e5:a8:6c:ae:64:15:8f:c9:f8:7e:4f:1d:00:34:
        f0:1d:60:d1:c5:9f:47:05:1a:45:8a:50:a8:69:3a:6c:d9:2f:
        a6:ed:0c:f7:cf:38:b6:24:8b:14:c0:b1:f0:12:75:f0:0c:a9:
        d3:91:0f:0c:52:b1:7f:5e:6b:59:9f:ab:68:56:ed:a9:ff:ac:
        28:9d:f7:04:88:41:e2:8f:57:52:15:f8:35:44:77:fb:c8:13:
        73:38:c0:19:8d:3d:ab:41:f3:5f:75:d9:19:b7:15:b1:63:7e:
        94:ec:44:08:21:2e:2d:5c:c8:f2:f3:cc:61:c8:f9:48:65:1f:
        39:b8:d4:3c:96:1e:df:dc:83:d1:0c:e7:e5:41:d5:f9:58:8a:
        7d:8c:6e:04:da:de:e1:30:76:e0:54:60:62:da:bd:a6:79:81:
        0a:01:26:d2:22:cf:82:5e:1b:4c:7e:da:2a:32:2a:5d:89:c5:
        8d:ce:22:9a:37:33
```

### Useful commands for reference

* Generate pkcs12 file using keytool

```
keytool -genkeypair -alias "s-node0" -keystore "private-node0.pfx" -storetype "pkcs12" -storepass "password" -dname "cn=s-node0" -keyalg "rsa" -sigalg "SHA384withRSA" -keysize "3072" -validity "36524"
```

* Inspect pkcs12 file using openssl

```
openssl pkcs12 -info -in private-node0.pfx -passin pass:password -passout pass:password
```

* extract private key from .pfx

```
openssl pkcs12 -in a-private-node0.pfx -nocerts -out a-test-key.pem -nodes
```

* Extract only client certificate from .pfx

```
openssl pkcs12 -in a-private-node0.pfx -clcerts -nokeys -out a-test-cert.pem
```

* Extract certificate chain from .pfx

```
openssl pkcs12 -in a-private-node0.pfx -nokeys -out a-test-cert.pem
```
