<!-- Filename: .github/pull_request_template.md -->
## Description

This pull request changes the following:

* TBD

### Related Issues

* Closes #
<!-- Filename: .github/workflows/autogen/README.md -->
# Solo autogen tool

## Description

The Solo autogen tool is used to add e2e test cases that need to be ran independently as their own job into the GitHub workflows and into the solo package.json

## Usage

from solo root directory:

```bash
cd .github/workflows/autogen
npm install
npm run autogen
```

Use git to detect file changes and validate that they are correct.

The templates need to be maintained, you can either make changes directly to the templates and then run the tool, or make changes in both the workflow yaml files and the templates.  Should the templates fall out of sync, then you can update the templates so that when autogen runs again, the git diff will better match.

```bash
template.flow-build-application.yaml
template.flow-pull-request-checks.yaml
template.zxc-code-analysis.yaml
template.zxc-env-vars.yaml
```

For new e2e test jobs update the `<solo-root>/.github/workflows/templates/config.yaml`, adding a new item to the tests object with a name and mochaPostfix attribute.

NOTE: IntelliJ copy/paste will alter the escape sequences, you might have to manually type it in, clone a line, or use an external text editor.

e.g.:

```yaml
  - name: Mirror Node
    mochaPostfix: "--ignore '.*\\/unit\\/.*'"

```

## Development

To run lint fix:

```bash
cd .github/workflows/autogen
eslint --fix .
```
<!-- Filename: DEV.md -->
# Developer instructions

Below we describe how you can set up local environment and contribute to `solo`.

* Clone the repo
* In order to support ES6 modules with `jest`, set an env variable `NODE_OPTIONS` as below:
  * `export NODE_OPTIONS=--experimental-vm-modules >> ~/.zshrc`
* For Intellij users: enable `--experimental-vm-modules` for `Jest` as below:
  * Go to: `Run->Edit Configurations->Edit Configuration Templates->Jest`
  * Set: `--experimental-vm-modules` in `Node Options`.
* Run `npm i` to install the required packages
* Run `npm link` to install `solo` as the CLI
  * Note: you need to do it once. If `solo` already exists in your path, you will need to remove it first.
  * Alternative way would be to run `npm run solo -- <COMMAND> <ARGS>`
* Run `npm test` or `npm run test` to run the unit tests
* Run `solo` to access the CLI.
* Note that debug logs are stored at `$HOME/.solo/logs/solo.log`.
  * So you may use `tail -f $HOME/.solo/logs/solo.log | jq` in a separate terminal to keep an eye on the logs.
* Before making a commit run `npm run format`

## E2E tests

* In order to run E2E test, we need to set up cluster and install the chart.
  * Run `./test/e2e/setup-e2e.sh`
  * Run `npm run test-e2e-standard`, NOTE: this excludes some E2E tests that have their own command

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

An opinionated CLI tool to deploy and manage standalone test networks.

## Table of Contents

* [Requirements](#requirements)
* [Setup](#setup)
* [Install Solo](#install-solo)
* [Setup Kubernetes cluster](#setup-kubernetes-cluster)
* [Generate Node Keys](#generate-node-keys)
  * [Standard keys (.pem file)](#standard-keys-pem-file)
* [Examples](#examples)
  * [Example - 1: Deploy a standalone test network (version `0.54.0-alpha.4`)](#example---1-deploy-a-standalone-test-network-version-0540-alpha4)
* [Support](#support)
* [Contributing](#contributing)
* [Code of Conduct](#code-of-conduct)
* [License](#license)

## Requirements

| Solo Version | Node.js                   | Kind       | Solo Chart | Hedera   | Kubernetes | Kubectl    | Helm    | k9s        | Docker Resources        | Java         |
|--------------|---------------------------|------------|-----------|----------|------------|------------|---------|------------|-------------------------|--------------|
| 0.29.0       | >= 20.14.0 (lts/hydrogen) | >= v1.29.1 | v0.30.0   | v0.53.0+ | >= v1.27.3 | >= v1.27.3 | v3.14.2 | >= v0.27.4 | Memory >= 8GB, CPU >= 4 | >= 21.0.1+12 |
| 0.30.0       | >= 20.14.0 (lts/hydrogen) | >= v1.29.1 | v0.30.0   | v0.54.0+ | >= v1.27.3 | >= v1.27.3 | v3.14.2 | >= v0.27.4 | Memory >= 8GB, CPU >= 4 | >= 21.0.1+12 |

## Setup

* Install [Node](https://nodejs.org/en/download). You may also use [nvm](https://github.com/nvm-sh/nvm) to manage different Node versions locally:

```
nvm install lts/hydrogen
nvm use lts/hydrogen
```

* Useful tools:
  * Install [kubectl](https://kubernetes.io/docs/tasks/tools/)
  * Install [k9s](https://k9scli.io/)

## Install Solo

* Run `npm install -g @hashgraph/solo`

## Setup Kubernetes cluster

### Remote cluster

* You may use remote kubernetes cluster. In this case, ensure kubernetes context is set up correctly.

```
kubectl config use-context <context-name>
```

### Local cluster

* You may use [kind](https://kind.sigs.k8s.io/) or [microk8s](https://microk8s.io/) to create a cluster. In this case,
  ensure your Docker engine has enough resources (e.g. Memory >=8Gb, CPU: >=4). Below we show how you can use `kind` to create a cluster

First, use the following command to set up the environment variables:

```
export SOLO_CLUSTER_NAME=solo
export SOLO_NAMESPACE=solo
export SOLO_CLUSTER_SETUP_NAMESPACE=solo-cluster
```

Then run the following command to set the kubectl context to the new cluster:

```bash
kind create cluster -n "${SOLO_CLUSTER_NAME}"
```

Example output

```
Creating cluster "solo" ...
 ✓ Ensuring node image (kindest/node:v1.29.1) 🖼
 ✓ Preparing nodes 📦 
 ✓ Writing configuration 📜
 ✓ Starting control-plane 🕹️
 ✓ Installing CNI 🔌
 ✓ Installing StorageClass 💾
Set kubectl context to "kind-solo"
You can now use your cluster with:

kubectl cluster-info --context kind-solo

Have a nice day! 👋
```

You may now view pods in your cluster using `k9s -A` as below:

```
 Context: kind-solo                                <0> all   <a>       Attach       <ctr… ____  __.________
 Cluster: kind-solo                                          <ctrl-d>  Delete       <l>  |    |/ _/   __   \______
 User:    kind-solo                                          <d>       Describe     <p>  |      < \____    /  ___/
 K9s Rev: v0.32.5                                            <e>       Edit         <shif|    |  \   /    /\___ \
 K8s Rev: v1.27.3                                            <?>       Help         <z>  |____|__ \ /____//____  >
 CPU:     n/a                                                <shift-j> Jump Owner   <s>          \/            \/
 MEM:     n/a
┌───────────────────────────────────────────────── Pods(all)[11] ─────────────────────────────────────────────────┐
│ NAMESPACE↑          NAME                                        PF READY STATUS   RESTARTS IP          NODE     │
│ solo-setup     console-557956d575-4r5xm                    ●  1/1   Running         0 10.244.0.5  solo-con │
│ solo-setup     minio-operator-7d575c5f84-8shc9             ●  1/1   Running         0 10.244.0.6  solo-con │
│ kube-system         coredns-5d78c9869d-6cfbg                    ●  1/1   Running         0 10.244.0.4  solo-con │
│ kube-system         coredns-5d78c9869d-gxcjz                    ●  1/1   Running         0 10.244.0.3  solo-con │
│ kube-system         etcd-solo-control-plane                     ●  1/1   Running         0 172.18.0.2  solo-con │
│ kube-system         kindnet-k75z6                               ●  1/1   Running         0 172.18.0.2  solo-con │
│ kube-system         kube-apiserver-solo-control-plane           ●  1/1   Running         0 172.18.0.2  solo-con │
│ kube-system         kube-controller-manager-solo-control-plane  ●  1/1   Running         0 172.18.0.2  solo-con │
│ kube-system         kube-proxy-cct7t                            ●  1/1   Running         0 172.18.0.2  solo-con │
│ kube-system         kube-scheduler-solo-control-plane           ●  1/1   Running         0 172.18.0.2  solo-con │
│ local-path-storage  local-path-provisioner-6bc4bddd6b-gwdp6     ●  1/1   Running         0 10.244.0.2  solo-con │
│                                                                                                                 │
│                                                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Examples

### Example - 1: Deploy a standalone test network (version `0.54.0-alpha.4`)

* Initialize `solo` with tag `v0.54.0-alpha.4` and list of node names `node1,node2,node3`:

```
# reset .solo directory
rm -rf ~/.solo

solo init -t v0.54.0-alpha.4 -i node1,node2,node3 -n "${SOLO_NAMESPACE}" -s "${SOLO_CLUSTER_SETUP_NAMESPACE}"
```

* Example output

```

******************************* Solo *********************************************
Version			: 0.31.0
Kubernetes Context	: kind-solo
Kubernetes Cluster	: kind-solo
Kubernetes Namespace	: solo
**********************************************************************************
✔ Setup home directory and cache
✔ Check dependency: helm [OS: linux, Release: 5.15.0-119-generic, Arch: x64]
✔ Check dependencies
✔ Setup chart manager

***************************************************************************************
Note: solo stores various artifacts (config, logs, keys etc.) in its home directory: /home/runner/.solo
If a full reset is needed, delete the directory or relevant sub-directories before running 'solo init'.
***************************************************************************************
✔ Copy templates in '/home/runner/.solo/cache'
```

* Generate `pem` formatted node keys

```
solo node keys --gossip-keys --tls-keys
```

* Example output

```

******************************* Solo *********************************************
Version			: 0.31.0
Kubernetes Context	: kind-solo
Kubernetes Cluster	: kind-solo
Kubernetes Namespace	: solo
**********************************************************************************
✔ Initialize
✔ Backup old files
✔ Gossip key for node: node1
✔ Gossip key for node: node2
✔ Gossip key for node: node3
✔ Generate gossip keys
✔ Backup old files
✔ TLS key for node: node1
✔ TLS key for node: node2
✔ TLS key for node: node3
✔ Generate gRPC TLS keys
✔ Finalize
```

PEM key files are generated in `~/.solo/keys` directory.

```
hedera-node1.crt    hedera-node3.crt    s-private-node1.pem s-public-node1.pem  unused-gossip-pem
hedera-node1.key    hedera-node3.key    s-private-node2.pem s-public-node2.pem  unused-tls
hedera-node2.crt    hedera-node4.crt    s-private-node3.pem s-public-node3.pem
hedera-node2.key    hedera-node4.key    s-private-node4.pem s-public-node4.pem
```

* Setup cluster with shared components

```
solo cluster setup
```

* Example output

```

******************************* Solo *********************************************
Version			: 0.31.0
Kubernetes Context	: kind-solo
Kubernetes Cluster	: kind-solo
Kubernetes Namespace	: solo
**********************************************************************************
✔ Initialize
✔ Prepare chart values
✔ Install 'solo-cluster-setup' chart
```

In a separate terminal, you may run `k9s` to view the pod status.

* Deploy helm chart with Hedera network components
  * It may take a while (5~15 minutes depending on your internet speed) to download various docker images and get the pods started.
  * If it fails, ensure you have enough resources allocated for Docker engine and retry the command.

```
solo network deploy
```

* Example output

```

******************************* Solo *********************************************
Version			: 0.31.0
Kubernetes Context	: kind-solo
Kubernetes Cluster	: kind-solo
Kubernetes Namespace	: solo
**********************************************************************************
✔ Initialize
✔ Copy Gossip keys to staging
✔ Copy gRPC TLS keys to staging
✔ Prepare staging directory
✔ Copy Gossip keys
✔ Node: node1
✔ Copy Gossip keys
✔ Node: node3
✔ Copy TLS keys
✔ Copy Gossip keys
✔ Node: node2
✔ Copy node keys to secrets
✔ Install chart 'solo-deployment'
✔ Check Node: node1
✔ Check Node: node2
✔ Check Node: node3
✔ Check node pods are running
✔ Check Envoy Proxy for: node2
✔ Check Envoy Proxy for: node1
✔ Check Envoy Proxy for: node3
✔ Check HAProxy for: node1
✔ Check HAProxy for: node3
✔ Check HAProxy for: node2
✔ Check proxy pods are running
✔ Check MinIO
✔ Check auxiliary pods are ready
```

* Setup node with Hedera platform software.
  * It may take a while as it download the hedera platform code from <https://builds.hedera.com/>

```
solo node setup
```

* Example output

```

******************************* Solo *********************************************
Version			: 0.31.0
Kubernetes Context	: kind-solo
Kubernetes Cluster	: kind-solo
Kubernetes Namespace	: solo
**********************************************************************************
✔ Initialize
✔ Check network pod: node1
✔ Check network pod: node3
✔ Check network pod: node2
✔ Identify network pods
✔ Update node: node3 [ platformVersion = v0.54.0-alpha.4 ]
✔ Update node: node2 [ platformVersion = v0.54.0-alpha.4 ]
✔ Update node: node1 [ platformVersion = v0.54.0-alpha.4 ]
✔ Fetch platform software into network nodes
✔ Set file permissions
✔ Node: node1
✔ Set file permissions
✔ Node: node3
✔ Set file permissions
✔ Node: node2
✔ Setup network nodes
```

* Start the nodes

```
solo node start
```

* Example output

```

******************************* Solo *********************************************
Version			: 0.31.0
Kubernetes Context	: kind-solo
Kubernetes Cluster	: kind-solo
Kubernetes Namespace	: solo
**********************************************************************************
✔ Initialize
✔ Check network pod: node3
✔ Check network pod: node1
✔ Check network pod: node2
✔ Identify existing network nodes
✔ Start node: node1
✔ Start node: node3
✔ Start node: node2
✔ Starting nodes
✔ Check network pod: node1  - status ACTIVE, attempt: 16/120
✔ Check network pod: node2  - status ACTIVE, attempt: 17/120
✔ Check network pod: node3  - status ACTIVE, attempt: 17/120
✔ Check nodes are ACTIVE
✔ Check proxy for node: node1
✔ Check proxy for node: node2
✔ Check proxy for node: node3
✔ Check node proxies are ACTIVE
✔ Adding stake for node: node1
✔ Adding stake for node: node2
✔ Adding stake for node: node3
✔ Add node stakes
```

* Deploy mirror node

```
solo mirror-node deploy
```

* Example output

```

******************************* Solo *********************************************
Version			: 0.31.0
Kubernetes Context	: kind-solo
Kubernetes Cluster	: kind-solo
Kubernetes Namespace	: solo
**********************************************************************************
✔ Initialize
✔ Prepare address book
✔ Deploy mirror-node
✔ Enable mirror-node
✔ Check Hedera Explorer
✔ Check Postgres DB
✔ Check GRPC
✔ Check Monitor
✔ Check Importer
✔ Check REST API
✔ Check pods are ready
✔ Insert data in public.file_data
✔ Seed DB data
```

* Deploy a JSON RPC relay

```
solo relay deploy
```

* Example output

```

******************************* Solo *********************************************
Version			: 0.31.0
Kubernetes Context	: kind-solo
Kubernetes Cluster	: kind-solo
Kubernetes Namespace	: solo
**********************************************************************************
[?25l
```

You may view the list of pods using `k9s` as below:

```
Context: kind-solo                                <0> all   <a>       Attach       <ctr… ____  __.________
 Cluster: kind-solo                                          <ctrl-d>  Delete       <l>  |    |/ _/   __   \______
 User:    kind-solo                                          <d>       Describe     <p>  |      < \____    /  ___/
 K9s Rev: v0.32.5                                            <e>       Edit         <shif|    |  \   /    /\___ \
 K8s Rev: v1.27.3                                            <?>       Help         <z>  |____|__ \ /____//____  >
 CPU:     n/a                                                <shift-j> Jump Owner   <s>          \/            \/
 MEM:     n/a
┌───────────────────────────────────────────────── Pods(all)[31] ─────────────────────────────────────────────────┐
│ NAMESPACE↑          NAME                                                           PF READY STATUS   RESTARTS I │
│ kube-system         coredns-5d78c9869d-994t4                                       ●  1/1   Running         0 1 │
│ kube-system         coredns-5d78c9869d-vgt4q                                       ●  1/1   Running         0 1 │
│ kube-system         etcd-solo-control-plane                                        ●  1/1   Running         0 1 │
│ kube-system         kindnet-q26c9                                                  ●  1/1   Running         0 1 │
│ kube-system         kube-apiserver-solo-control-plane                              ●  1/1   Running         0 1 │
│ kube-system         kube-controller-manager-solo-control-plane                     ●  1/1   Running         0 1 │
│ kube-system         kube-proxy-9b27j                                               ●  1/1   Running         0 1 │
│ kube-system         kube-scheduler-solo-control-plane                              ●  1/1   Running         0 1 │
│ local-path-storage  local-path-provisioner-6bc4bddd6b-4mv8c                        ●  1/1   Running         0 1 │
│ solo                envoy-proxy-node1-65f8879dcc-rwg97                             ●  1/1   Running         0 1 │
│ solo                envoy-proxy-node2-667f848689-628cx                             ●  1/1   Running         0 1 │
│ solo                envoy-proxy-node3-6bb4b4cbdf-dmwtr                             ●  1/1   Running         0 1 │
│ solo                solo-deployment-grpc-75bb9c6c55-l7kvt                     ●  1/1   Running         0 1 │
│ solo                solo-deployment-hedera-explorer-6565ccb4cb-9dbw2          ●  1/1   Running         0 1 │
│ solo                solo-deployment-importer-dd74fd466-vs4mb                  ●  1/1   Running         0 1 │
│ solo                solo-deployment-monitor-54b8f57db9-fn5qq                  ●  1/1   Running         0 1 │
│ solo                solo-deployment-postgres-postgresql-0                     ●  1/1   Running         0 1 │
│ solo                solo-deployment-redis-node-0                              ●  2/2   Running         0 1 │
│ solo                solo-deployment-rest-6d48f8dbfc-plbp2                     ●  1/1   Running         0 1 │
│ solo                solo-deployment-restjava-5d6c4cb648-r597f                 ●  1/1   Running         0 1 │
│ solo                solo-deployment-web3-55fdfbc7f7-lzhfl                     ●  1/1   Running         0 1 │
│ solo                haproxy-node1-785b9b6f9b-676mr                                 ●  1/1   Running         1 1 │
│ solo                haproxy-node2-644b8c76d-v9mg6                                  ●  1/1   Running         1 1 │
│ solo                haproxy-node3-fbffdb64-272t2                                   ●  1/1   Running         1 1 │
│ solo                minio-pool-1-0                                                 ●  2/2   Running         1 1 │
│ solo                network-node1-0                                                ●  5/5   Running         2 1 │
│ solo                network-node2-0                                                ●  5/5   Running         2 1 │
│ solo                network-node3-0                                                ●  5/5   Running         2 1 │
│ solo                relay-node1-node2-node3-hedera-json-rpc-relay-ddd4c8d8b-hdlpb  ●  1/1   Running         0 1 │
│ solo-cluster        console-557956d575-c5qp7                                       ●  1/1   Running         0 1 │
│ solo-cluster        minio-operator-7d575c5f84-xdwwz                                ●  1/1   Running         0 1 │
│                                                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
  <pod>
```

#### Access Hedera Network services

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
* Hedera explorer: `solo-deployment-hedera-explorer`
* JSON Rpc Relays
  * You can deploy JSON RPC relays for one or more nodes as below:
  ```bash
  solo relay deploy -i node1
  # enable relay for node1
  kubectl port-forward svc/relay-node1-hedera-json-rpc-relay -n "${SOLO_NAMESPACE}" 7546:7546 &
  ```

Example output

```

******************************* Solo *********************************************
Version			: 0.31.0
Kubernetes Context	: kind-solo
Kubernetes Cluster	: kind-solo
Kubernetes Namespace	: solo
**********************************************************************************
✔ Initialize
✔ Prepare chart values
✔ Deploy JSON RPC Relay
✔ Check relay is ready
```

## For Developers Working on Hedera Service Repo

First, please clone hedera service repo `https://github.com/hashgraph/hedera-services/` and build the code
with `./gradlew assemble`. If need to running nodes with different versions or releases, please duplicate the repo or build directories in
multiple directories, checkout to the respective version and build the code.

To set customized `settings.txt` file, edit the file
`~/.solo/cache/templates/settings.txt` after `solo init` command.

Then you can start customized built hedera network with the following command:

```
solo node setup --local-build-path <default path to hedera repo>,node1=<custom build hedera repo>,node2=<custom build repo>

# example: solo node setup --local-build-path node1=../hedera-services/hedera-node/data/,../hedera-services/hedera-node/data,node3=../hedera-services/hedera-node/data
```

## For Developers Working on Platform core

To deploy node with local build PTT jar files, run the following command:

```
solo node setup --local-build-path <default path to hedera repo>,node1=<custom build hedera repo>,node2=<custom build repo> --app PlatformTestingTool.jar --app-config <path-to-test-json1,path-to-test-json2>

# example: solo node setup --local-build-path ../hedera-services/platform-sdk/sdk/data,node1=../hedera-services/platform-sdk/sdk/data,node2=../hedera-services/platform-sdk/sdk/data --app PlatformTestingTool.jar --app-config ../hedera-services/platform-sdk/platform-apps/tests/PlatformTestingTool/src/main/resources/FCMFCQ-Basic-2.5k-5m.json
```

## Logs

You can find log for running solo command under the directory `~/.solo/logs/`
The file `solo.log` contains the logs for the solo command.
The file `hashgraph-sdk.log` contains the logs from Solo client when sending transactions to network nodes.

## Using IntelliJ remote debug with Solo

NOTE: the hedera-services path referenced '../hedera-services/hedera-node/data' may need to be updated based on what directory you are currently in.  This also assumes that you have done an assemble/build and the directory contents are up-to-date.

Example 1: attach jvm debugger to a hedera node

```bash
./test/e2e/setup-e2e.sh
solo node keys --gossip-keys --tls-keys
solo network deploy -i node1,node2,node3 --debug-nodeid node2
solo node setup -i node1,node2,node3 --local-build-path ../hedera-services/hedera-node/data
solo node start -i node1,node2,node3 --debug-nodeid node2
```

Once you see the following message, you can launch jvm debugger from Intellij

```
  Check node: node1,
  Check node: node3,  Please attach JVM debugger now.
  Check node: node4,
```

Example 2: attach jvm debugger with node add operation

```bash
./test/e2e/setup-e2e.sh
solo node keys --gossip-keys --tls-keys
solo network deploy -i node1,node2,node3 --pvcs
solo node setup -i node1,node2,node3 --local-build-path ../hedera-services/hedera-node/data
solo node start -i node1,node2,node3
solo node add --gossip-keys --tls-keys --node-id node4 --debug-nodeid node4 --local-build-path ../hedera-services/hedera-node/data
```

Example 3: attach jvm debugger with node update operation

```bash
./test/e2e/setup-e2e.sh
solo node keys --gossip-keys --tls-keys
solo network deploy -i node1,node2,node3
solo node setup -i node1,node2,node3 --local-build-path ../hedera-services/hedera-node/data
solo node start -i node1,node2,node3
solo node update --node-id node2  --debug-nodeid node2 --local-build-path ../hedera-services/hedera-node/data --new-account-number 0.0.7 --gossip-public-key ./s-public-node2.pem --gossip-private-key ./s-private-node2.pem --agreement-public-key ./a-public-node2.pem --agreement-private-key ./a-private-node2.pem
```

Example 4: attach jvm debugger with node delete operation

```bash
./test/e2e/setup-e2e.sh
solo node keys --gossip-keys --tls-keys
solo network deploy -i node1,node2,node3,node4
solo node setup -i node1,node2,node3,node4 --local-build-path ../hedera-services/hedera-node/data
solo node start -i node1,node2,node3,node4
solo node delete --node-id node2  --debug-nodeid node3
```

## Support

If you have a question on how to use the product, please see our [support guide](https://github.com/hashgraph/.github/blob/main/SUPPORT.md).

## Contributing

Contributions are welcome. Please see the [contributing guide](https://github.com/hashgraph/.github/blob/main/CONTRIBUTING.md) to see how you can get involved.

## Code of Conduct

This project is governed by the [Contributor Covenant Code of Conduct](https://github.com/hashgraph/.github/blob/main/CODE_OF_CONDUCT.md). By participating, you are
expected to uphold this code of conduct.

## License

[Apache License 2.0](LICENSE)
<!-- Filename: docs/content/_index.md -->
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

{{< button size="large" relref="User/README.md" >}}Getting Started{{< /button >}}

## Feature overview

{{< columns >}}

### Clean and simple design

Stay focused on deployment and don't get overwhelmed by a complex design.

{{< /columns >}}

{{< columns >}}

### Easy configuration

Getting started in minutes. Solo comes with easy to use configuration.

{{< /columns >}}
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
