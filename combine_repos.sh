#!/bin/bash

# List of repositories
repos=(
    "hhttps://github.com/hiero-ledger/hiero-sdk-java.git"
    "https://github.com/hiero-ledger/hiero-sdk-js.git"
    "https://github.com/hiero-ledger/hiero-sdk-go.git"
    "https://github.com/hiero-ledger/hiero-sdk-swift.git"
    "https://github.com/hiero-ledger/hiero-sdk-rust.git"
    "https://github.com/hiero-ledger/hiero-sdk-cpp.git"
    "https://github.com/hashgraph/hedera-smart-contracts.git"
    "https://github.com/hashgraph/hedera-smart-contract-starter.git"
    "https://github.com/hiero-ledger/hiero-local-node.git"
    "https://github.com/hashgraph/solo.git"
    "https://github.com/hiero-ledger/hiero-docs.git"
)

for repo_url in "${repos[@]}"
do
    # Extract the repository name
    repo_name=$(basename -s .git "$repo_url")
    echo "Processing repository: $repo_name"

    # Clone or update the repository
    if [ -d "$repo_name" ]; then
        echo "Repository $repo_name already exists. Updating..."
        cd "$repo_name" || exit
        git pull
        cd ..
    else
        echo "Cloning repository $repo_name..."
        git clone "$repo_url"
    fi

    # Determine applicable file extensions based on the repository
    extensions=()
    case "$repo_name" in
        hiero-sdk-java)
            extensions=("java")
            ;;
        hiero-sdk-js)
            extensions=("js")
            ;;
        hiero-sdk-go)
            extensions=("go")
            ;;
        hiero-sdk-swift)
            extensions=("swift")
            ;;
        hiero-sdk-rust)
            extensions=("rs")
            ;;
        hiero-sdk-cpp)
            extensions=("cpp" "h")
            ;;
        hedera-smart-contracts | hedera-smart-contract-starter)
            extensions=("sol" "ts" "js" "md")
            ;;
        hiero-local-node | solo | hiero-docs)
            extensions=("md")
            ;;
        *)
            echo "No extensions defined for repository $repo_name"
            continue
            ;;
    esac

    cd "$repo_name" || exit

    # Generate combined files for each applicable extension
    for ext in "${extensions[@]}"
    do
        output_file="../${repo_name}_repo_combined_${ext}.${ext}"
        echo "Creating combined file for extension .$ext: $output_file"

        # Remove existing combined file if it exists
        rm -f "$output_file"

        # Define file pattern
        if [ "$repo_name" == "hiero-sdk-cpp" ] && [ "$ext" == "cpp" ]; then
            pattern='*.{cpp,h}'
        else
            pattern="*.$ext"
        fi

        # Combine files with filename headers
        git ls-files -z "$pattern" | while IFS= read -r -d '' file; do
            if [ "$ext" == "md" ]; then
                echo "<!-- Filename: $file -->" >> "$output_file"
            else
                echo "// Filename: $file" >> "$output_file"
            fi
            cat "$file" >> "$output_file"
        done
    done

    cd ..
done

# Combine all combined files into a single main file
all_hedera_repos_combined="all_hedera_repos_combined.txt"
echo "Creating single combined file for all repos: $all_hedera_repos_combined"

# Remove existing main combined file if it exists
rm -f "$all_hedera_repos_combined"

# Loop over combined files in the parent directory
for combined_file in ./*_repo_combined_*.*; do
    echo "Adding $combined_file to $all_hedera_repos_combined"
    echo "===== Start of $combined_file =====" >> "$all_hedera_repos_combined"
    cat "$combined_file" >> "$all_hedera_repos_combined"
    echo "===== End of $combined_file =====" >> "$all_hedera_repos_combined"
done