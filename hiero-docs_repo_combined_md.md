<!-- Filename: MAINTAINERS.md -->
# Maintainers

The general handling of Maintainer rights and all groups in this GitHub org is done in the https://github.com/hiero-ledger/governance repository.

## Maintainer Scopes, GitHub Roles and GitHub Teams

Maintainers are assigned the following scopes in this repository:

| Scope      | Definition               | GitHub Role | GitHub Team                        |
| ---------- | ------------------------ | ----------- | ---------------------------------- |
| Maintainer | The GitHub Maintain role | Maintain    | `hiero-docs-maintainers` |

## Active Maintainers

<!-- Please keep this sorted alphabetically by github -->

| Name                 | GitHub ID       | Scope | LFID | Discord ID | Email | Company Affiliation |
|--------------------- | --------------- | ----- | ---- | ---------- | ----- | ------------------- |
| Simi Hunjan          | SimiHunjan      |       |      |            |       | Hashgraph           |
| Krystal Lee          | theekrystallee  |       |      |            |       | Hashgraph           |
| Pranali Deshmukh     | deshmukhpranali |       |      |            |       | Hashgraph           |


## Emeritus Maintainers

| Name | GitHub ID | Scope | LFID | Discord ID | Email | Company Affiliation |
|----- | --------- | ----- | ---- | ---------- | ----- | ------------------- |
|      |           |       |      |            |       |                     |

## The Duties of a Maintainer

Maintainers are expected to perform the following duties for this repository. The duties are listed in more or less priority order:

- Review, respond, and act on any security vulnerabilities reported against the repository.
- Review, provide feedback on, and merge or reject GitHub Pull Requests from
  Contributors.
- Review, triage, comment on, and close GitHub Issues
  submitted by Contributors.
- When appropriate, lead/facilitate architectural discussions in the community.
- When appropriate, lead/facilitate the creation of a product roadmap.
- Create, clarify, and label issues to be worked on by Contributors.
- Ensure that there is a well defined (and ideally automated) product test and
  release pipeline, including the publication of release artifacts.
- When appropriate, execute the product release process.
- Maintain the repository CONTRIBUTING.md file and getting started documents to
  give guidance and encouragement to those wanting to contribute to the product, and those wanting to become maintainers.
- Contribute to the product via GitHub Pull Requests.
- Monitor requests from the LF Decentralized Trust Technical Advisory Council about the
contents and management of LFDT repositories, such as branch handling,
required files in repositories and so on.
- Contribute to the LFDT Project's Quarterly Report.

## Becoming a Maintainer

This community welcomes contributions. Interested contributors are encouraged to
progress to become maintainers. To become a maintainer the following steps
occur, roughly in order.

- The proposed maintainer establishes their reputation in the community,
  including authoring five (5) significant merged pull requests, and expresses
  an interest in becoming a maintainer for the repository.
- A PR is created to update this file to add the proposed maintainer to the list of active maintainers.
- The PR is authored by an existing maintainer or has a comment on the PR from an existing maintainer supporting the proposal.
- The PR is authored by the proposed maintainer or has a comment on the PR from the proposed maintainer confirming their interest in being a maintainer.
  - The PR or comment from the proposed maintainer must include their
    willingness to be a long-term (more than 6 month) maintainer.
- Once the PR and necessary comments have been received, an approval timeframe begins.
- The PR **MUST** be communicated on all appropriate communication channels, including relevant community calls, chat channels and mailing lists. Comments of support from the community are welcome.
- The PR is merged and the proposed maintainer becomes a maintainer if either:
  - Two weeks have passed since at least three (3) Maintainer PR approvals have been recorded, OR
  - An absolute majority of maintainers have approved the PR.
- If the PR does not get the requisite PR approvals, it may be closed.
- Once the add maintainer PR has been merged, any necessary updates to the GitHub Teams are made.

## Removing Maintainers

Being a maintainer is not a status symbol or a title to be carried
indefinitely. It will occasionally be necessary and appropriate to move a
maintainer to emeritus status. This can occur in the following situations:

- Resignation of a maintainer.
- Violation of the Code of Conduct warranting removal.
- Inactivity.
  - A general measure of inactivity will be no commits or code review comments
    for one reporting quarter. This will not be strictly enforced if
    the maintainer expresses a reasonable intent to continue contributing.
  - Reasonable exceptions to inactivity will be granted for known long term
    leave such as parental leave and medical leave.
- Other circumstances at the discretion of the other Maintainers.

The process to move a maintainer from active to emeritus status is comparable to the process for adding a maintainer, outlined above. In the case of voluntary
resignation, the Pull Request can be merged following a maintainer PR approval. If the removal is for any other reason, the following steps **SHOULD** be followed:

- A PR is created to update this file to move the maintainer to the list of emeritus maintainers.
- The PR is authored by, or has a comment supporting the proposal from, an existing maintainer or a member of the project's Technical Steering Commitee (TSC).
- Once the PR and necessary comments have been received, the approval timeframe begins.
- The PR **MAY** be communicated on appropriate communication channels, including relevant community calls, chat channels and mailing lists.
- The PR is merged and the maintainer transitions to maintainer emeritus if:
  - The PR is approved by the maintainer to be transitioned, OR
  - Two weeks have passed since at least three (3) Maintainer PR approvals have been recorded, OR
  - An absolute majority of maintainers have approved the PR.
- If the PR does not get the requisite PR approvals, it may be closed.

Returning to active status from emeritus status uses the same steps as adding a
new maintainer. Note that the emeritus maintainer already has the 5 required
significant changes as there is no contribution time horizon for those.
<!-- Filename: README.md -->
---
cover: .gitbook/assets/hiero-docs-landing-hero-cover.png
coverY: 0
layout:
  cover:
    visible: true
    size: full
  title:
    visible: true
  description:
    visible: false
  tableOfContents:
    visible: true
  outline:
    visible: true
  pagination:
    visible: true
---

# Welcome to Hiero Documentation

Hiero, a [Linux Foundation Decentralized Trust](http://www.lfdecentralizedtrust.org/) project, is an open-source, vendor-neutral distributed ledger technology used to build the [Hedera](https://hedera.com/) public ledger.

<table data-card-size="large" data-view="cards"><thead><tr><th align="center"></th><th data-hidden data-card-target data-type="content-ref"></th><th data-hidden data-card-cover data-type="files"></th></tr></thead><tbody><tr><td align="center"><a href="https://hiero.org/"><strong>LEARN THE BASICS</strong></a></td><td><a href="https://hiero.org/">https://hiero.org/</a></td><td></td></tr><tr><td align="center"><a href="getting-started/"><strong>GET STARTED</strong></a></td><td><a href="./#set-up-your-environment">#set-up-your-environment</a></td><td></td></tr><tr><td align="center"><a href="https://hiero.org/#roadmap"><strong>ROADMAP</strong></a></td><td><a href="https://hiero.org/#roadmap">https://hiero.org/#roadmap</a></td><td></td></tr><tr><td align="center"><a href="https://hiero.org/#contribute"><strong>CONTRIBUTE</strong></a></td><td><a href="https://hiero.org/#contribute">https://hiero.org/#contribute</a></td><td></td></tr></tbody></table>

## Contributing

Whether you’re fixing bugs, enhancing features, or improving documentation, your contributions are important — let’s build something great together!

Please read our [contributing guide](https://github.com/hashgraph/.github/blob/main/CONTRIBUTING.md) to see how you can get involved.

## Code of Conduct

This project is governed by the [Contributor Covenant Code of Conduct](https://github.com/hashgraph/.github/blob/main/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code of conduct.

## License

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
<!-- Filename: SUMMARY.md -->
# Table of contents

* [Welcome to Hiero Documentation](README.md)
* [Getting Started with Hiero](getting-started/README.md)
  * [Set Up Hiero Local Node Using Docker](getting-started/how-to-set-up-a-hedera-local-node.md)
  * [Set Up Hiero Node Using NPM CLI Tool](getting-started/setup-hedera-node-cli-npm.md)
  * [Set Up Hiero Local Node in Cloud Development Environments (CDEs)](getting-started/how-to-run-hedera-local-node-in-a-cloud-development-environment-cde/README.md)
    * [Run in Codespaces](getting-started/how-to-run-hedera-local-node-in-a-cloud-development-environment-cde/codespaces.md)
    * [Run in Gitpod](getting-started/how-to-run-hedera-local-node-in-a-cloud-development-environment-cde/gitpod.md)
* [Hiero SDKs](sdks/README.md)
  * [Hiero C++ SDK](https://github.com/hiero-ledger/hiero-sdk-cpp)
  * [Hiero DID SDK Python](https://github.com/hiero-ledger/hiero-did-sdk-python)
  * [Hiero Go SDK](https://github.com/hiero-ledger/hiero-sdk-go)
  * [Hiero Java SDK](https://github.com/hiero-ledger/hiero-sdk-java)
  * [Hiero JavaScript SDK](https://github.com/hiero-ledger/hiero-sdk-js)
  * [Hiero Python SDK](https://github.com/hiero-ledger/hiero-sdk-python)
  * [Hiero Rust SDK](https://github.com/hiero-ledger/hiero-sdk-rust)
  * [Hiero Swift SDKs](https://github.com/hiero-ledger/hiero-sdk-swift)
* [Hiero Block Node](https://github.com/hiero-ledger/hiero-block-node)
* [Hiero Consensus Node](https://github.com/hiero-ledger/hiero-consensus-node)
* [Hiero JSON RPC Relay](https://github.com/hiero-ledger/hiero-json-rpc-relay)
* [Hiero Local Node](https://github.com/hiero-ledger/hiero-local-node)
* [Hiero Mirror Node](https://github.com/hiero-ledger/hiero-mirror-node)
* [Hiero Mirror Node Explorer](https://github.com/hiero-ledger/hiero-mirror-node-explorer)
<!-- Filename: getting-started/README.md -->
# Getting Started with Hiero

Welcome to the Hiero Getting Started section where you'll find a collection of step-by-step guides designed to help you set up and explore a fully functional Hiero local node (network). The [**Hiero Local Node**](https://github.com/hashgraph/hedera-local-node) project empowers developers to deploy their own local network for development and testing. This network includes essential services such as the consensus node, mirror node, JSON-RPC relay, and more that can be deployed using multiple methods.

**➡** [**Deploy Your Hiero Local Node**](./#deploy-your-hiero-local-node)

**➡** [**Available Services and Dashboards**](./#available-services-and-dashboards)

***

## Deploy Your Hiero Local Node

Choose to deploy between Docker with the Hiero CLI, managing your node via the official NPM package, or leveraging Cloud Development Environments (CDEs) like Gitpod or GitHub Codespaces. These guides are designed to help you quickly and efficiently establish a testing environment. This flexibility enables you to work from any device without being tied down by a static local setup.

<table data-view="cards"><thead><tr><th align="center"></th><th></th><th data-hidden data-card-cover data-type="files"></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody><tr><td align="center"><a href="how-to-set-up-a-hedera-local-node.md"><strong>Set Up with Docker</strong></a></td><td>Use Docker and the Hiero CLI to spin up a complete local network on your machine. This includes a consensus node, mirror node, JSON-RPC relay, and other supporting services.</td><td><a href="../.gitbook/assets/hiero-docker-icon.png">hiero-docker-icon.png</a></td><td><a href="how-to-set-up-a-hedera-local-node.md">how-to-set-up-a-hedera-local-node.md</a></td></tr><tr><td align="center"><a href="setup-hedera-node-cli-npm.md"><strong>Use the NPM CLI Tool</strong></a></td><td>Use the CLI tool to install and run the Hiero local node using the official NPM package. This lets you start, stop, and generate accounts directly via CLI commands.</td><td><a href="../.gitbook/assets/hiero-cli-tool-icon.png">hiero-cli-tool-icon.png</a></td><td><a href="setup-hedera-node-cli-npm.md">setup-hedera-node-cli-npm.md</a></td></tr><tr><td align="center"><a href="how-to-run-hedera-local-node-in-a-cloud-development-environment-cde/"><strong>Use Cloud Development Environments (CDEs)</strong></a></td><td>Use a Cloud Development Environment (CDE) like Gitpod or GitHub Codespaces to build a virtual dev environment with the preconfigured Hiero node.</td><td><a href="../.gitbook/assets/hiero-cloud-env-icon.png">hiero-cloud-env-icon.png</a></td><td><a href="how-to-run-hedera-local-node-in-a-cloud-development-environment-cde/">how-to-run-hedera-local-node-in-a-cloud-development-environment-cde</a></td></tr></tbody></table>

***

## **Available Services and Dashboards**

The Hiero local node comes with various services, each serving different functions, and accessible locally. You can use these services on `localhost`.&#x20;

{% hint style="info" %}
In Gitpod and Codespaces, "localhost" refers to a virtual cloud server you're accessing via your browser. These platforms redirect local addresses to your cloud workspace, making it feel like you're working on a local setup.
{% endhint %}

These are the `localhost` endpoints for each service:

<table><thead><tr><th width="327.8828125">Type</th><th>Endpoint</th></tr></thead><tbody><tr><td>Consensus Node Endpoint</td><td><a href="http://localhost:50211/">http://localhost:50211/</a></td></tr><tr><td>Mirror Node GRPC Endpoint</td><td><a href="http://localhost:5600/">http://localhost:5600/</a></td></tr><tr><td>Mirror Node REST API Endpoint</td><td><a href="http://localhost:5551/">http://localhost:5551/</a></td></tr><tr><td>JSON RPC Relay Endpoint</td><td><a href="http://localhost:7546/">http://localhost:7546/</a></td></tr><tr><td>JSON RPC Relay Websocket Endpoint</td><td><a href="http://localhost:8546/">http://localhost:8546/</a></td></tr><tr><td>Mirror Node Explorer</td><td><a href="http://localhost:8080/devnet/dashboard">http://localhost:8080/devnet/dashboard</a></td></tr><tr><td>Grafana UI</td><td><a href="http://localhost:3000/">http://localhost:3000/</a></td></tr><tr><td>Prometheus UI</td><td><a href="http://localhost:9090/">http://localhost:9090/</a></td></tr></tbody></table>
<!-- Filename: getting-started/how-to-run-hedera-local-node-in-a-cloud-development-environment-cde/README.md -->
# Set Up Hiero Local Node in Cloud Development Environments (CDEs)

<table data-card-size="large" data-view="cards"><thead><tr><th align="center"></th><th data-hidden data-card-cover data-type="files"></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody><tr><td align="center"><a href="codespaces.md"><strong>Run in GitHub Codespaces</strong></a></td><td><a href="../../.gitbook/assets/hiero-github-icon.png">hiero-github-icon.png</a></td><td><a href="codespaces.md">codespaces.md</a></td></tr><tr><td align="center"><a href="gitpod.md"><strong>Run in Gitpod</strong></a></td><td><a href="../../.gitbook/assets/hiero-gitpod-icon.png">hiero-gitpod-icon.png</a></td><td><a href="gitpod.md">gitpod.md</a></td></tr></tbody></table>
<!-- Filename: getting-started/how-to-run-hedera-local-node-in-a-cloud-development-environment-cde/codespaces.md -->
# Run in Codespaces

Codespaces is a cloud development environment (CDE) that's hosted in the cloud. You can customize your project for GitHub Codespaces by committing configuration files to your repository (often known as Configuration-as-Code), which creates a repeatable codespaces configuration for all users of your project. [GitHub Codespaces overview](https://docs.github.com/en/codespaces/overview)

***

## Prerequisites

* Review the [Quickstart for GitHub Codespaces](https://docs.github.com/en/codespaces/getting-started/quickstart) guide.
* Install the VSCode Desktop application.
* In [Editor preference](https://github.com/settings/codespaces) change your client to `Visual Studio Code` (Should not be `Visual Studio Code for the Web`)

***

## Configure Dev Container

To configure the dev container, open the [Hiero Local Node repo](https://github.com/hashgraph/hedera-local-node) and click on `Code`->`Codespaces`->`...`-> `Configure dev container`.

<figure><img src="../../.gitbook/assets/codespace-config-dev-container.png" alt="" width="563"><figcaption></figcaption></figure>

This will open the dev container configuration file where you can customize your configuration like the CPUs and memory.

<figure><img src="../../.gitbook/assets/codespace-config-file.png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Note**: If you make changes to your config file, commit and push your changes before running local node, to ensure the project starts with the right configuration.
{% endhint %}

## Creating and Running Your Codespace

Open the [Hiero Local Node repo](https://github.com/hashgraph/hedera-local-node) and click on the `Code`->`Codespaces`->`...`-> `New with options...` button and choose the appropriate settings:

<figure><img src="../../.gitbook/assets/local-node-codespaces.jpeg" alt="" width="563"><figcaption></figcaption></figure>

Once your codespace is created, the template repository will be automatically cloned into it. Your codespace is all set up, and the local node is running!

<figure><img src="../../.gitbook/assets/local-node-codespace-config.png" alt=""><figcaption></figcaption></figure>

***

## Conclusion and Additional Resources

Congrats on successfully setting up your Codespace and running a Hiero Local Node!

**➡** [**Hiero Local Node Repository**](https://github.com/hashgraph/hedera-local-node#readme)

**➡** [**Quickstart for GitHub Codespaces**](https://docs.github.com/en/codespaces/getting-started/quickstart)

**➡** [**Adding Dev Container Config to Repo**](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration)
<!-- Filename: getting-started/how-to-run-hedera-local-node-in-a-cloud-development-environment-cde/gitpod.md -->
# Run in Gitpod

The local network comprises the consensus node, mirror node, [JSON-RPC relay](https://github.com/hashgraph/hedera-json-rpc-relay#readme), and other Consensus Node services and now be set up without Docker and draining your computer’s resources by using Gitpod. Gitpod provides Cloud Development Environments (CDEs) and allows developers to work from any device without the need to maintain static and brittle local development environments. By the end of this tutorial, you will have your Hedera local node running on Gitpod.

***

## Prerequisites

* Signed into your GitHub account in your browser.
* [Register](https://gitpod.io/login/) a Gitpod account with your GitHub account.
* If this is your first time using Gitpod, please read the [Gitpod getting started](https://www.gitpod.io/docs/introduction/getting-started) guide.
* Install the [Gitpod browser extension](https://www.gitpod.io/docs/configure/user-settings/browser-extension).
* The Mirror Node Web Explorer requires [VS Code Desktop](https://www.gitpod.io/docs/references/ides-and-editors/vscode) to be installed, as [VS Code Browser](https://www.gitpod.io/docs/references/ides-and-editors/vscode-browser) has limitations related to communicating with local ports, e.g. `http://127.0.0.1:5551/`.

***

## Set Up Gitpod Permissions

Enable `public_repo` permission for the GitHub provider on [Gitpod’s Git integrations page](https://gitpod.io/user/integrations).

<figure><img src="../../.gitbook/assets/gitpod-git-providers-table.png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../.gitbook/assets/gitpod-git-providers-edit-permissions-dialog.png" alt="" width="563"><figcaption></figcaption></figure>

***

## Running the Hiero Local Node

The `hiero-local-node` project repository already has a Gitpod configuration file ([`.gitpod.yml`](https://github.com/hashgraph/hedera-local-node/blob/main/.gitpod.yml)), which makes it easy to run it within a workspace on Gitpod. Open the [Hiero Local Node repo](https://github.com/hashgraph/hedera-local-node). Click on the Gitpod `Open` button.

<figure><img src="../../.gitbook/assets/gitpod-button-github-repo.png" alt=""><figcaption></figcaption></figure>

The Gitpod browser extension modifies the Github UI to add this button. This will spin up a new Gitpod workspace with your choice of CDE which will run the Hiero Local Node in your cloud environment.

### **Testing the Setup**

To confirm everything is running smoothly, run the `curl` commands below to query the mirror node for a list of accounts, query the JSON-RPC relay for the latest block, and open the mirror node explorer (HashScan) using the local endpoint ([http://localhost:8080/devnet/dashboard](http://localhost:8080/devnet/dashboard)).

**Mirror Node REST API**

The following command queries the Mirror Node for a list of accounts on your Hedera network.

```bash
curl "http://localhost:5551/api/v1/accounts" \
  -X GET
```

See the [Mirror Node interact API docs](https://testnet.mirrornode.hedera.com/api/v1/docs/) for a full list of available APIs.

**JSON RPC Relay**

The following command queries the RPC Relay for the latest block on your Hedera network.

{% code overflow="wrap" %}
```bash
curl "<http://localhost:7546>" \\
  -X POST \\
  -H "Content-Type: application/json" \\
  --data '{"method":"eth_getBlockByNumber","params":["latest",false],"id":1,"jsonrpc":"2.0"}'
```
{% endcode %}

See the [endpoint table](https://github.com/hashgraph/hedera-json-rpc-relay/blob/main/docs/rpc-api.md#endpoint-table) in `hiero-json-rpc-relay` for a full list of available RPCs.

**Mirror Node Explorer (Hashscan)**

Visit the local mirror node explorer endpoint ([http://localhost:8080/devnet/dashboard](http://localhost:8080/devnet/dashboard)) in your web browser. Ensure that `LOCALNET` is selected, as this will show you the Hedera network running within your Gitpod, and not one of the public nodes.

<figure><img src="../../.gitbook/assets/mirror-node-explorer-localnet.png" alt=""><figcaption></figcaption></figure>

### Shut Down the Gitpod Workspace

{% hint style="warning" %}
**Note**: Gitpod usage is billed by the hour on paid plans, and hours are limited on the free plans. Therefore, once completed, remember to stop the Gitpod workspace.
{% endhint %}

<figure><img src="../../.gitbook/assets/gitpod-stop-workspace.png" alt="" width="563"><figcaption></figcaption></figure>

***

## Conclusion and Additional Resources

Congrats on successfully setting up your Gitpod workspace and running a Hiero Local Node!

**➡** [**Hiero Local Node Repository**](https://github.com/hashgraph/hedera-local-node#readme)

**➡** [**Gitpod Documentation**](https://www.gitpod.io/docs/introduction/getting-started)
<!-- Filename: getting-started/how-to-set-up-a-hedera-local-node.md -->
# Set Up Hiero Local Node Using Docker

In this tutorial, we will adopt, set up, and run a Hiero node locally using Docker. By the end of this tutorial, you'll be equipped to run a Hiero local node and generate keys, allowing you to test your projects and deploy projects in your local environment.

***

## Prerequisites

* [Node.js](https://nodejs.org/en) >= v14.x
* [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) >= v6.14.1&#x37;**\*\***
* Minimum 16GB RAM
* [Docker](https://www.docker.com/) >= v20.10.x
* [Docker Compose](https://docs.docker.com/compose/) >= v2.12.3
* Have Docker running on your machine with the correct configurations.

<details>

<summary><a href="https://github.com/hashgraph/hedera-local-node#requirements">Docker configuration 🛠️</a></summary>

Ensure the **`VirtioFS`** file sharing implementation is enabled in the docker settings.

<img src="broken-reference" alt="" data-size="original">

Ensure the following configurations are set at minimum in Docker **Settings** -> **Resources** and are available for use:

* **CPUs:** 6
* **Memory:** 8GB
* **Swap:** 1 GB
* **Disk Image Size:** 64 GB

<img src="broken-reference" alt="" data-size="original">

Ensure the **`Allow the default Docker sockets to be used (requires password)`** is enabled in Docker **Settings -> Advanced**.

<img src="broken-reference" alt="" data-size="original">

**Note:** The image may look different if you are on a different version

</details>

{% hint style="info" %}
#### _**Note**_

_**\*\***&#x4C;ocal node can be run using Docker, NPM, or on CDEs but we will use Docker for this tutorial._ [_Here_](https://github.com/hashgraph/hedera-local-node#official-npm-release) _are the installation steps for NPM._
{% endhint %}

***

## Table of Contents

1. [Start Your Local Network](how-to-set-up-a-hedera-local-node.md#start-your-local-network)
2. [Generate Keys](how-to-set-up-a-hedera-local-node.md#generate-keys)
3. [Stop Your Local Network](how-to-set-up-a-hedera-local-node.md#stop-your-local-network)
4. [Additional Resources](how-to-set-up-a-hedera-local-node.md#additional-resources)

***

## Start Your Local Network

Open a new terminal and navigate to your preferred directory where your Hiero Local Node project will live. Run the following command to clone the repo and install dependencies to your local machine:

```bash
git clone https://github.com/hiero-ledger/hiero-local-node.git
cd hiero-local-node
npm install
```

For Windows users: You will need to update the file endings of `compose-network/mirror-node/init.sh` by running this in WSL:

```bash
dos2unix compose-network/mirror-node/init.sh
```

Ensure Docker is installed and open on your machine before running this command to get the network up and running:

```bash
// starts and generates the first 30 accounts
npm run start -- -d

or

// will start local node but will not generate the first 30 accounts
docker compose up -d
```

***

## Generate Keys

To generate accounts with random private keys, run the `generate-accounts` command. Specify the number of accounts generated by appending the number to the `hedera generate-account` command. For example, to generate 5 accounts, run `hedera generate-accounts 5`.

<details>

<summary><code>hedera generate-accounts 5</code></summary>

```
Generating accounts in synchronous mode...
|-----------------------------------------------------------------------------------------|
|-----------------------------| Accounts list ( ECDSA  keys) |----------------------------|
|-----------------------------------------------------------------------------------------|
|    id    |                            private key                            |  balance |
|-----------------------------------------------------------------------------------------|
| 0.0.1033 - 0xced34a00d3fff542e350a5e61cb41509812bf23ea581f83a0a862c94d8c69704 - 10000 ℏ |
| 0.0.1034 - 0xa4189ab682ba43925ce654ca09800bba86cf8b1b7f889006d5170d95f4fed365 - 10000 ℏ |
| 0.0.1035 - 0xf9106e9841677136c9cbe8c114dab80470ca62a15bfe9c777006bcb114288c22 - 10000 ℏ |
| 0.0.1036 - 0xe3517a9235971be1e1f95e791f3ffd7d753a652799fa11f1ace626036c4db275 - 10000 ℏ |
| 0.0.1037 - 0x636926cf2f6f9fd0a58043c600390eeef0bbed9d4b8a113ea68a8d67f922d04e - 10000 ℏ |
|-----------------------------------------------------------------------------------------|

|--------------------------------------------------------------------------------------------------------------------------------------|
|------------------------------------------------| Accounts list (Alias ECDSA keys) |--------------------------------------------------|
|--------------------------------------------------------------------------------------------------------------------------------------|
|    id    |               public address               |                             private key                            | balance |
|--------------------------------------------------------------------------------------------------------------------------------------|
| 0.0.1038 - 0xaBE90e20f394629e054Bc1E8F1338Fe8ea94F0b5 - 0x444913bd258f764e62db6c87abde7ca52ec22985db8c91b8c3b2b4f2c51775f0 - 10000 ℏ |
| 0.0.1039 - 0x26d941d8E1f6bF9B0F7e5156fA6ff02acEd0DF3E - 0xea25f427caf7029989669f93926b7902dde5361b176b4bc17b8ec0a967beaa0b - 10000 ℏ |
| 0.0.1040 - 0x64001c2d1f3a8d3574435B4F125944018E2E584D - 0xf2deb678a1e67e288d8a128334f41c890e7600b2a5471ecc9a3af4824e3021b7 - 10000 ℏ |
| 0.0.1041 - 0x6bE22CD9D16b64969683B74897E4EBB30c7c30E8 - 0xb9c2480cdbdddb2ecd6e032b87820c29e8791ad4f53b89f829269d856c835819 - 10000 ℏ |
| 0.0.1042 - 0x992d8aD211b28B23589c0b3Fe30de6C90662C4aB - 0x7e8bb0d85a8d80fa2eb2c9f6bd5c9b1a2c2f9f6992c7fffd201c8e81f0ec0000 - 10000 ℏ |
|--------------------------------------------------------------------------------------------------------------------------------------|

|-----------------------------------------------------------------------------------------|
|-----------------------------| Accounts list (ED25519 keys) |----------------------------|
|-----------------------------------------------------------------------------------------|
|    id    |                            private key                            |  balance |
|-----------------------------------------------------------------------------------------|
| 0.0.1043 - 0xd4917e152ca922b8bfbafffc3486512ae25ec0a75b05c44f517b11cd12fd949b - 10000 ℏ |
| 0.0.1044 - 0xbaeec69382fbb43e4d521b3d8717c9cba610a1fbcaededaaf4408c3138a683ae - 10000 ℏ |
| 0.0.1045 - 0x1f5c4b2efd3c36d29e9d2e16a825abd001f99bff2388bb8c6011cd5f956023c9 - 10000 ℏ |
| 0.0.1046 - 0x1976acdd5e71ce7e8db4cb0aa112fa1c16876155f0f20b9b7029916073f1d67f - 10000 ℏ |
| 0.0.1047 - 0x6e29f48b11ffc77e277f0500d607b35956da58f1ed30aad003fb1846bfffc483 - 10000 ℏ |
|-----------------------------------------------------------------------------------------|
```

</details>

{% hint style="info" %}
**Please note**: Since the first 10 accounts generated are with predefined private keys, if you need 5 generated with random keys, you will run `hedera start 15`. The same rule applies when you use the `hedera generate-accounts` command.
{% endhint %}

Grab any of the account private keys generated from the _**Alias ECDSA keys Accounts list**_. This will be used as the `LOCAL_NODE_OPERATOR_PRIVATE_KEY` environment variable value in your `.env` file of your project.

***

## Stop Your Local Network

To stop your local node, you can run the `hedera stop` command. If you want to keep any files created manually in the working directory, please save them before executing this command.

<details>

<summary><code>hedera stop</code></summary>

```
Stopping the network...
Stopping the docker containers...
Cleaning the volumes and temp files...
```

</details>

Alternatively, run `docker compose down -v; git clean -xfd; git reset --hard` to stop the local node and reset it to its original state.

<details>

<summary><code>docker compose down -v; git clean -xfd; git reset --hard</code></summary>

```bash
[+] Running 27/27
 ✔ Container mirror-node-web3           Removed            3.5s 
 ✔ Container json-rpc-relay-ws          Removed           10.8s 
 ✔ Container mirror-node-monitor        Removed            3.7s 
 ✔ Container relay-cache                Removed            0.9s 
 ✔ Container prometheus                 Removed            0.9s 
 ✔ Container record-sidecar-uploader    Removed            0.0s 
 ✔ Container grafana                    Removed            0.9s 
 ✔ Container hedera-explorer            Removed           10.4s 
 ✔ Container json-rpc-relay             Removed           10.7s 
 ✔ Container account-balances-uploader  Removed            0.1s 
 ✔ Container envoy-proxy                Removed            1.0s 
 ✔ Container mirror-node-grpc           Removed            2.7s 
 ✔ Container mirror-node-rest           Removed           10.4s 
 ✔ Container network-node               Removed           10.8s 
 ✔ Container mirror-node-importer       Removed           10.4s 
 ✔ Container record-streams-uploader    Removed            0.0s 
 ✔ Container haveged                    Removed            0.0s 
 ✔ Container mirror-node-db             Removed            0.3s 
 ✔ Container minio                      Removed            0.0s 
 ✔ Volume prometheus-data               Removed            0.0s 
 ✔ Volume minio-data                    Removed            0.0s 
 ✔ Volume mirror-node-postgres          Removed            0.1s 
 ✔ Volume grafana-data                  Removed            0.2s 
 ✔ Network network-node-bridge          Removed            0.1s 
 ✔ Network hedera-local-node_default    Removed            0.2s 
 ✔ Network cloud-storage                Removed            0.2s 
 ✔ Network mirror-node                  Removed            0.2s 
Removing .husky/_/
Removing network-logs/
Removing node_modules/
HEAD is now at ......
```

</details>

_**📣 Note**: All available commands can be checked out_ [_here_](https://github.com/hashgraph/hedera-local-node/tree/main?tab=readme-ov-file#using-hedera-local)_._

***

## Additional Resources

**➡** [**Hiero Local Node Repository**](https://github.com/hashgraph/hedera-local-node#readme)

**➡** [**Hiero Local Node CLI Tool Commands**](https://github.com/hashgraph/hedera-local-node#using-hedera-local)

**➡** [**Hiero Local Node Docker Setup** ](https://www.youtube.com/watch?v=KOhzu6ftmbY)**\[Video Tutorial]**
<!-- Filename: getting-started/setup-hedera-node-cli-npm.md -->
# Set Up Hiero Node Using NPM CLI Tool

In this tutorial, we will adopt, set up, and run a Hiero node locally using the [@hashgraph/hedera-local](https://www.npmjs.com/package/@hashgraph/hedera-local) NPM Command Line Interface (CLI) tool with `docker compose`.

{% hint style="info" %}
This tutorial is based on the [Hiero Local Node README documentation](https://github.com/hashgraph/hedera-local-node).
{% endhint %}

---

## Prerequisites

To get started with this tutorial, ensure that you have the following software installed:

- [Node.js](https://nodejs.org/) >= v14.x (Check version: `node -v`)
- NPM >= v6.14.17 (Check version: `npm -v`)
- [Docker](https://www.docker.com/) >= v20.10.x (Check version: `docker -v`)
- [Docker Compose](https://docs.docker.com/compose/) >= v2.12.3 (Check version: `docker compose version`)
- Hardware: Minimum 16GB RAM

### Installation

- Node.js and NPM: Refer to the [official installation guide](https://nodejs.org/en/learn/getting-started/how-to-install-nodejs).
- Docker: See [Docker Setup Guide](https://github.com/hashgraph/hedera-local-node?tab=readme-ov-file#note) to get Docker up and running (note: specific instructions may vary based on the OS).

## Getting Started

Clone the GitHub repo and navigate to the project folder using the commands below;

```bash
git clone https://github.com/hiero-ledger/hiero-local-node.git
cd hiero-local-node
```

### Install CLI Tool

The command below can be used to install the official release from the [NPM](https://www.npmjs.com/package/@hashgraph/hedera-local) repository.

```bash
npm install @hashgraph/hedera-local -g
```

{% hint style="warning" %}

#### **Note**

This version may not reflect the most recent changes to the main branch of this repository. It also uses a baked-in version of the Docker Compose definitions and will not reflect any local changes made to the repository.
{% endhint %}

#### Local development Installation

Install the dependencies locally.

```bash
npm install && npm install -g
```

### Running the Node:

Start the local node (Note: Ensure Docker is running):

```bash
npm run start
```

**You can pass the following CLI flags, this would be used later in the following sections:**

```bash
--d / --detached - Start the local node in detached mode.
--h / --host - Override the default host.
```

**Other NPM commands:**

- `npm run restart` to restart the network
- `npm run stop` to stop the network
- `npm run generate-accounts` to generate new accounts - network must be running first

**You should see the following response in the terminal:**

{% code overflow="wrap" fullWidth="false" %}

```bash
hiero-local-node % npm run start

> @hashgraph/hedera-local@2.26.2 restart
> npm run build && node ./build/index.js restart


> @hashgraph/hedera-local@2.26.2 build
> rimraf ./build && tsc

[Hedera-Local-Node] INFO (StateController) [✔︎] Starting restart procedure!
[Hedera-Local-Node] INFO (CleanUpState) ⏳ Initiating clean up procedure. Trying to revert unneeded changes to files...
[Hedera-Local-Node] INFO (CleanUpState) [✔︎] Clean up of consensus node properties finished.
[Hedera-Local-Node] INFO (CleanUpState) [✔︎] Clean up of mirror node properties finished.
[Hedera-Local-Node] INFO (StopState) ⏳ Initiating stop procedure. Trying to stop docker containers and clean up volumes...
[Hedera-Local-Node] INFO (StopState) ⏳ Stopping the network...
[Hedera-Local-Node] INFO (StopState) [✔︎] Hiero Local Node was stopped successfully.
[Hedera-Local-Node] INFO (InitState) ⏳ Making sure that Docker is started and it is correct version...
[Hedera-Local-Node] INFO (DockerService) ⏳ Checking docker compose version...
[Hedera-Local-Node] INFO (DockerService) ⏳ Checking docker resources...
[Hedera-Local-Node] WARNING (DockerService) [!] Port 3000 is in use.
[Hedera-Local-Node] INFO (InitState) ⏳ Setting configuration with latest images on host 127.0.0.1 with dev mode turned off using turbo mode in single node configuration...
[Hedera-Local-Node] INFO (InitState) [✔︎] Local Node Working directory set to /Users/owanate/Library/Application Support/hedera-local.
[Hedera-Local-Node] INFO (InitState) [✔︎] Hedera JSON-RPC Relay rate limits were disabled.
[Hedera-Local-Node] INFO (InitState) [✔︎] Needed environment variables were set for this configuration.
[Hedera-Local-Node] INFO (InitState) [✔︎] Needed bootsrap properties were set for this configuration.
[Hedera-Local-Node] INFO (InitState) [✔︎] Needed bootsrap properties were set for this configuration.
[Hedera-Local-Node] INFO (InitState) [✔︎] Needed mirror node properties were set for this configuration.
[Hedera-Local-Node] INFO (StartState) ⏳ Starting Hiero Local Node...
```

{% endcode %}

To generate default accounts and start the local node in detached mode, use the command below:

```bash
npm run start -- -d
```

**You should see the following response in the terminal:**

{% code overflow="wrap" fullWidth="false" %}

```bash
hiero-local-node % npm run start -- -d

> @hashgraph/hedera-local@2.26.2 start
> npm run build && node ./build/index.js start -d


> @hashgraph/hedera-local@2.26.2 build
> rimraf ./build && tsc
[Hedera-Local-Node] INFO (StartState) [✔︎] Hiero Local Node successfully started!
[Hedera-Local-Node] INFO (NetworkPrepState) ⏳ Starting Network Preparation State...
[Hedera-Local-Node] INFO (NetworkPrepState) [✔︎] Imported fees successfully!
[Hedera-Local-Node] INFO (NetworkPrepState) [✔︎] Topic was created!
[Hedera-Local-Node] INFO (AccountCreationState) ⏳ Starting Account Creation state in synchronous mode ...
[Hedera-Local-Node] INFO (AccountCreationState) |-----------------------------------------------------------------------------------------|
[Hedera-Local-Node] INFO (AccountCreationState) |-----------------------------| Accounts list (ECDSA keys) |----------------------------|
[Hedera-Local-Node] INFO (AccountCreationState) |-----------------------------------------------------------------------------------------|
[Hedera-Local-Node] INFO (AccountCreationState) |    id    |                            private key                            |  balance |
[Hedera-Local-Node] INFO (AccountCreationState) |-----------------------------------------------------------------------------------------|
[Hedera-Local-Node] INFO (AccountCreationState) | 0.0.1002 - 0x7f109a9e3b0d8ecfba9cc23a3614433ce0fa7ddcc80f2a8f10b222179a5a80d6 - 10000 ℏ |
[Hedera-Local-Node] INFO (AccountCreationState) | 0.0.1003 - 0x6ec1f2e7d126a74a1d2ff9e1c5d90b92378c725e506651ff8bb8616a5c724628 - 10000 ℏ |
[Hedera-Local-Node] INFO (AccountCreationState) | 0.0.1004 - 0xb4d7f7e82f61d81c95985771b8abf518f9328d019c36849d4214b5f995d13814 - 10000 ℏ |
[Hedera-Local-Node] INFO (AccountCreationState) | 0.0.1005 - 0x941536648ac10d5734973e94df413c17809d6cc5e24cd11e947e685acfbd12ae - 10000 ℏ |
[Hedera-Local-Node] INFO (AccountCreationState) | 0.0.1006 - 0x5829cf333ef66b6bdd34950f096cb24e06ef041c5f63e577b4f3362309125863 - 10000 ℏ |
[Hedera-Local-Node] INFO (AccountCreationState) | 0.0.1007 - 0x8fc4bffe2b40b2b7db7fd937736c4575a0925511d7a0a2dfc3274e8c17b41d20 - 10000 ℏ |
[Hedera-Local-Node] INFO (AccountCreationState) | 0.0.1008 - 0xb6c10e2baaeba1fa4a8b73644db4f28f4bf0912cceb6e8959f73bb423c33bd84 - 10000 ℏ |
[Hedera-Local-Node] INFO (AccountCreationState) | 0.0.1009 - 0xfe8875acb38f684b2025d5472445b8e4745705a9e7adc9b0485a05df790df700 - 10000 ℏ |
[Hedera-Local-Node] INFO (AccountCreationState) | 0.0.1010 - 0xbdc6e0a69f2921a78e9af930111334a41d3fab44653c8de0775572c526feea2d - 10000 ℏ |
[Hedera-Local-Node] INFO (AccountCreationState) | 0.0.1011 - 0x3e215c3d2a59626a669ed04ec1700f36c05c9b216e592f58bbfd3d8aa6ea25f9 - 10000 ℏ |
[Hedera-Local-Node] INFO (AccountCreationState) |-----------------------------------------------------------------------------------------|
[Hedera-Local-Node] INFO (AccountCreationState) |--------------------------------------------------------------------------------------------------------------------------------------|
[Hedera-Local-Node] INFO (AccountCreationState) |------------------------------------------------| Accounts list (Alias ECDSA keys) |--------------------------------------------------|
[Hedera-Local-Node] INFO (AccountCreationState) |--------------------------------------------------------------------------------------------------------------------------------------|
[Hedera-Local-Node] INFO (AccountCreationState) |    id    |               public address               |                             private key                            | balance |
[Hedera-Local-Node] INFO (AccountCreationState) |--------------------------------------------------------------------------------------------------------------------------------------|
[Hedera-Local-Node] INFO (AccountCreationState) | 0.0.1012 - 0x67d8d32e9bf1a9968a5ff53b87d777aa8ebbee69 - 0x105d050185ccb907fba04dd92d8de9e32c18305e097ab41dadda21489a211524 - 10000 ℏ |
.....
[Hedera-Local-Node] INFO (AccountCreationState) |-----------------------------------------------------------------------------------------|
[Hedera-Local-Node] INFO (AccountCreationState) [✔︎] Accounts created succefully!
[Hedera-Local-Node] INFO (CleanUpState) ⏳ Initiating clean up procedure. Trying to revert unneeded changes to files...
[Hedera-Local-Node] INFO (CleanUpState) [✔︎] Clean up of consensus node properties finished.
[Hedera-Local-Node] INFO (CleanUpState) [✔︎] Clean up of mirror node properties finished.
```

{% endcode %}

![Running Hedera Node on Terminal](../.gitbook/assets/01-hedera-local-node-terminal-npm-cli-running.png)

## Verify Running Node

There are different ways to verify that a node is running;

- Check Block Number using Hashscan Block Explorer
- Send `cURL` request to `getBlockNumber`

### Check Block Number using Hashscan Block Explorer

Visit the local mirror node explorer endpoint ([http://localhost:8080/devnet/dashboard](http://localhost:8080/devnet/dashboard)) in your web browser. Ensure that `LOCALNET` is selected, as this will show you the Hedera network running within your local network.

Select any of the listed blocks to view the details (Consensus, Block, Transaction Hash, etc) for a particular block.

![Hedera Explorer - View LOCALNET](../.gitbook/assets/02-hedera-local-node-terminal-view-localnet.png)

![Hedera Explorer - View LOCALNET Details](../.gitbook/assets/03-hedera-local-node-terminal-view-localnet-details.png)

### Send cURL request to getBlockNumber

Let's verify that we are able to interact with Hedera Testnet using JSON-RPC by issuing an `eth_getBlockByNumber` JSON-RPC request.

**Enter the curl command below:**

{% code overflow="wrap" %}

```bash
  curl http://localhost:7546/ \
  -X POST \
  -H "Content-Type: application/json" \
  --data '{"method":"eth_getBlockByNumber","params":["latest",false],"id":1,"jsonrpc":"2.0"}'
```

{% endcode %}

**You should get the following response:**

{% code overflow="wrap" %}

```bash
curl http://localhost:7546/ \
  -X POST \
  -H "Content-Type: application/json" \
  --data '{"method":"eth_getBlockByNumber","params":["latest",false],"id":1,"jsonrpc":"2.0"}'
{"result":{"timestamp":"0x667c000e","difficulty":"0x0","extraData":"0x","gasLimit":"0xe4e1c0","baseFeePerGas":"0xa54f4c3c00","gasUsed":"0x0","logsBloom":"0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","miner":"0x0000000000000000000000000000000000000000","mixHash":"0x0000000000000000000000000000000000000000000000000000000000000000","nonce":"0x0000000000000000","receiptsRoot":"0x0000000000000000000000000000000000000000000000000000000000000000","sha3Uncles":"0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347","size":"0x93d","stateRoot":"0x0000000000000000000000000000000000000000000000000000000000000000","totalDifficulty":"0x0","transactions":[],"transactionsRoot":"0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421","uncles":[],"withdrawals":[],"withdrawalsRoot":"0x0000000000000000000000000000000000000000000000000000000000000000","number":"0x1604","hash":"0xfef0932ffb429840fe765d6d87c77425e2991326ddae6747dcce5c929c69ef38","parentHash":"0xef1ef331626f4f50ba2541d440b45cac51c5d8d6b4c46407a00c15d593c31e96"},"jsonrpc":"2.0","id":1}%
```

{% endcode %}

### Troubleshooting

Find below some common errors and how to troubleshoot them:

**Error: Node cannot start properly because necessary ports are in use!**

{% code overflow="wrap" fullWidth="false" %}

```bash
hiero-local-node % npm run start -- -d

> @hashgraph/hedera-local@2.26.2 start
> npm run build && node ./build/index.js start -d


> @hashgraph/hedera-local@2.26.2 build
> rimraf ./build && tsc

[Hedera-Local-Node] INFO (StateController) [✔︎] Starting start procedure!
[Hedera-Local-Node] INFO (InitState) ⏳ Making sure that Docker is started and it is correct version...
[Hedera-Local-Node] INFO (DockerService) ⏳ Checking docker compose version...
[Hedera-Local-Node] INFO (DockerService) ⏳ Checking docker resources...
[Hedera-Local-Node] ERROR (DockerService) [✘] [✘] Port 5551 is in use.
[Hedera-Local-Node] ERROR (DockerService) [✘] [✘] Port 8545 is in use.
[Hedera-Local-Node] ERROR (DockerService) [✘] [✘] Port 5600 is in use.
[Hedera-Local-Node] ERROR (DockerService) [✘] [✘] Port 5433 is in use.
[Hedera-Local-Node] ERROR (DockerService) [✘] [✘] Port 8082 is in use.
[Hedera-Local-Node] ERROR (DockerService) [✘] [✘] Port 6379 is in use.
[Hedera-Local-Node] WARNING (DockerService) [!] Port 7546 is in use.
[Hedera-Local-Node] WARNING (DockerService) [!] Port 8080 is in use.
[Hedera-Local-Node] WARNING (DockerService) [!] Port 3000 is in use.
[Hedera-Local-Node] ERROR (DockerService) [✘] [✘] Node cannot start properly because necessary ports are in use!
```

{% endcode %}

{% hint style="success" %}

#### **Fix**

- **Option 1:** Instead of starting another instance of the network, use the `npm run generate-accounts` to generate new accounts for an already started network.
- **Option 2:** If you get the above error, ensure that you terminate any existing Docker processes for the local node, as well as any other processes that are bound to these port numbers, before running the npm start command. You can run `docker compose down -v`, `git clean -xfd`, `git reset --hard` to fix this.
  {% endhint %}

## Useful Terms

For an in-depth explanation of the different terms below, see the [glossary documentation](https://docs.hedera.com/hedera/support-and-community/glossary).

- Accounts list (ED25519 keys)
- Private keys
- Public address

## Next Steps

Want to learn how to deploy smart contracts on Hedera? Visit the guide on how to [Deploy a Smart Contract Using Hardhat and Hedera JSON-RPC Relay](https://docs.hedera.com/hedera/tutorials/smart-contracts/deploy-a-smart-contract-using-hardhat-hedera-json-rpc-relay).

## Summary

In this tutorial, we successfully set up and ran the Hedera local node using the [NPM CLI](https://www.npmjs.com/package/@hashgraph/hedera-local) tool, generated default accounts, and solved common errors encountered when running the local node.

## Useful Resources

- Set and Run a Hiero Node using the [Local Hedera Package](https://github.com/hashgraph/hedera-local-node?tab=readme-ov-file#using-hedera-local).
- [Setup node using Docker CLI](https://github.com/hashgraph/hedera-local-node?tab=readme-ov-file#docker).
- Use [local network variables](https://github.com/hashgraph/hedera-local-node?tab=readme-ov-file#network-variables) to interact with Consensus and Mirror Nodes
- Using [Grafana and Prometheus Endpoints](https://github.com/hashgraph/hedera-local-node?tab=readme-ov-file#grafana--prometheus).

<table data-card-size="large" data-view="cards"><thead><tr><th align="center"></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody><tr><td align="center"><p>Writer: Owanate, Technical Writer</p><p><a href="https://github.com/owans">GitHub</a> | <a href="https://https/medium.com/@owanateamachree">Medium</a></p></td><td><a href="https://medium.com/@owanateamachree">https://medium.com/@owanateamachree</a></td></tr><tr><td align="center"><p>Editor: Krystal, Technical Writer</p><p><a href="https://github.com/theekrystallee">GitHub</a> | <a href="https://twitter.com/theekrystallee">Twitter</a></p></td><td><a href="https://twitter.com/theekrystallee">https://twitter.com/theekrystallee</a></td></tr></tbody></table>
<!-- Filename: sdks/README.md -->
---
description: Hiero supported and community-maintained SDKs
---

# Hiero SDKs

There are several options for friendly, language-specific access to the Hiero API and its network services.

## Hiero Consensus Node SDKs

Hiero and the developer community contribute to and maintain Hiero Consensus Node SDKs across various languages.

{% hint style="info" %}
**Note:** The Hiero JavaScript SDK supports React Native with Expo on Android devices and Android emulators. It does not currently support React Native Bare.
{% endhint %}

<table data-view="cards"><thead><tr><th align="center"></th><th align="center"></th><th align="center"></th><th align="center"></th><th data-hidden data-card-cover data-type="files"></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody><tr><td align="center"><strong>Hiero Java SDK</strong></td><td align="center">Maintainer: Hiero</td><td align="center">License: Apache 2.0</td><td align="center"><a href="https://github.com/hashgraph/hedera-sdk-java"><mark style="color:purple;"><strong>GITHUB</strong></mark></a> </td><td></td><td><a href="https://github.com/hashgraph/hedera-sdk-java">https://github.com/hashgraph/hedera-sdk-java</a></td></tr><tr><td align="center"><strong>Hiero JavaScript SDK</strong></td><td align="center">Maintainer: Hiero</td><td align="center">License: Apache 2.0</td><td align="center"><a href="https://github.com/hashgraph/hedera-sdk-js"><mark style="color:purple;"><strong>GITHUB</strong></mark></a></td><td></td><td><a href="https://github.com/hashgraph/hedera-sdk-js">https://github.com/hashgraph/hedera-sdk-js</a></td></tr><tr><td align="center"><strong>Hiero Go SDK</strong></td><td align="center">Maintainer: Hiero</td><td align="center">License: Apache 2.0</td><td align="center"><a href="https://github.com/hashgraph/hedera-sdk-go"><mark style="color:purple;"><strong>GITHUB</strong></mark></a></td><td></td><td><a href="https://github.com/hashgraph/hedera-sdk-go">https://github.com/hashgraph/hedera-sdk-go</a></td></tr><tr><td align="center"><strong>Hiero Swift SDK</strong></td><td align="center">Maintainer: Hiero</td><td align="center">License: Apache 2.0</td><td align="center"><a href="https://github.com/hashgraph/hedera-sdk-swift"><mark style="color:purple;"><strong>GITHUB</strong></mark></a></td><td></td><td><a href="https://github.com/hashgraph/hedera-sdk-swift">https://github.com/hashgraph/hedera-sdk-swift</a></td></tr><tr><td align="center"><strong>Hiero Rust SDK</strong></td><td align="center">Maintainer: Hiero</td><td align="center">License: Apache 2.0</td><td align="center"><a href="https://github.com/hiero-ledger/hiero-sdk-rust"><mark style="color:purple;"><strong>GITHUB</strong></mark></a></td><td></td><td><a href="https://github.com/hiero-ledger/hiero-sdk-rust">https://github.com/hiero-ledger/hiero-sdk-rust</a></td></tr><tr><td align="center"><strong>Hiero C++ SDK</strong></td><td align="center">Maintainer: Hiero</td><td align="center">License: Apache 2.0</td><td align="center"><a href="https://github.com/hiero-ledger/hiero-sdk-cpp"><mark style="color:purple;"><strong>GITHUB</strong></mark></a></td><td></td><td><a href="https://github.com/hiero-ledger/hiero-sdk-cpp">https://github.com/hiero-ledger/hiero-sdk-cpp</a></td></tr><tr><td align="center"><strong>Hiero Python SDK</strong></td><td align="center">Maintainer: Community</td><td align="center">License: Apache 2.0</td><td align="center"><a href="https://github.com/hiero-ledger/hiero-sdk-python"><mark style="color:purple;"><strong>GITHUB</strong></mark></a></td><td></td><td><a href="https://github.com/hiero-ledger/hiero-sdk-python">https://github.com/hiero-ledger/hiero-sdk-python</a></td></tr><tr><td align="center"><strong>Hiero DID SDK Python</strong></td><td align="center">Maintainer: Hiero</td><td align="center">License: Apache 2.0</td><td align="center"><a href="https://github.com/hiero-ledger/hiero-did-sdk-python"><mark style="color:purple;"><strong>GITHUB</strong></mark></a></td><td></td><td><a href="https://github.com/hiero-ledger/hiero-did-sdk-python">https://github.com/hiero-ledger/hiero-did-sdk-python</a></td></tr></tbody></table>

Want to help contribute or have a project you'd like to see, here? Join the [community calls](https://www.lfdecentralizedtrust.org/meeting-calendar) to propose your project, or add a [pull request](https://github.com/hiero-ledger/hiero-docs)!
