# Hedera Repositories Combiner Script

This repository contains a Bash script that automates the process of cloning specific Hedera repositories, generating combined files from certain file extensions, and organizing them in a centralized location.

## Overview

The script performs the following tasks:

1. **Clones or updates** the specified Hedera repositories into subfolders within the current directory.
2. **Generates combined files** for applicable file extensions within each repository, concatenating the contents of all files of that extension.
3. **Moves all combined files** to the parent directory for easy access.

## Combined Files Naming Convention

The combined files follow this naming pattern:

```
[repository_name]_repo_combined_[extension_name].[file_extension]
```

*Example:* `hedera-sdk-java_repo_combined_java.java`

## Supported Repositories and Extensions

### SDKs

Generates a combined file for the corresponding extension:

- **[hedera-sdk-java](https://github.com/hashgraph/hedera-sdk-java.git)**: `.java`
- **[hedera-sdk-js](https://github.com/hashgraph/hedera-sdk-js.git)**: `.js`
- **[hedera-sdk-go](https://github.com/hashgraph/hedera-sdk-go.git)**: `.go`
- **[hedera-sdk-swift](https://github.com/hashgraph/hedera-sdk-swift.git)**: `.swift`
- **[hedera-sdk-rust](https://github.com/hashgraph/hedera-sdk-rust.git)**: `.rs`
- **[hedera-sdk-cpp](https://github.com/hashgraph/hedera-sdk-cpp.git)**: `.cpp`, `.h`

### Smart Contracts

Generates combined files for `.sol`, `.ts`, `.js`, and `.md` extensions:

- **[hedera-smart-contracts](https://github.com/hashgraph/hedera-smart-contracts.git)**
- **[hedera-smart-contract-starter](https://github.com/hashgraph/hedera-smart-contract-starter.git)**

### Local Network Tools

Generates a combined file for `.md` extension:

- **[hedera-local-node](https://github.com/hashgraph/hedera-local-node.git)**
- **[solo](https://github.com/hashgraph/solo.git)**

### Documentation

Generates a combined file for `.md` extension:

- **[hedera-docs](https://github.com/hashgraph/hedera-docs.git)**

## Usage Instructions

### Prerequisites

- **Git**: Ensure that Git is installed and configured on your system.
- **Bash Shell**: The script is designed to run in a Unix-like environment.

### Steps

1. **Clone this repository** or copy the `combine_repos.sh` script into your desired directory.

2. **Make the script executable**:

   ```bash
   chmod +x combine_repos.sh
   ```

3. **Run the script**:

   ```bash
   ./combine_repos.sh
   ```

   This will:

   - Clone or update the specified repositories.
   - Generate combined files for the applicable extensions.
   - Move the combined files to the parent directory.

### Notes

- **Updating Repositories**: If a repository already exists, the script will update it using `git pull`.
- **File Headers**: Each combined file includes comments indicating the original filenames.
  - For code files, it uses `// Filename: [filepath]`.
  - For Markdown files, it uses `<!-- Filename: [filepath] -->`.
- **Output Location**: Combined files are placed in the parent directory of the cloned repositories.

## Script Details

Here's a brief overview of how the script works:

- **Repository Handling**:
  - Defines a list of repositories to process.
  - Checks if each repository is already cloned; if so, updates it, otherwise clones it.
- **Extension Processing**:
  - Determines applicable file extensions for each repository.
  - Uses `git ls-files` to list tracked files matching the extensions.
  - Concatenates file contents into a combined file with appropriate headers.
- **Combined Files**:
  - Named according to the specified naming convention.
  - Overwrites existing combined files to ensure they're up-to-date.

## Customization

- **Adding or Removing Repositories**:
  - Modify the `repos` array in the script to include the desired repositories.
- **Changing File Extensions**:
  - Adjust the `case` statement in the script to alter which file extensions are processed for each repository.
- **Output Directory**:
  - By default, combined files are moved to the parent directory.
  - You can modify the script to change the output location.

## Troubleshooting

- **Permissions**:
  - Ensure you have the necessary read/write permissions in the working directory.
- **Git Configuration**:
  - Verify that Git is properly installed and accessible in your system's PATH.
- **Script Execution Errors**:
  - Run the script with `bash -x combine_repos.sh` for detailed execution logs.
