set dotenv-load

# Path to your Obsidian vault. Override by setting OBSIDIAN_VAULT
# in a .env file or your shell environment.
vault_dir := if env_var("OBSIDIAN_VAULT") != "" { env_var("OBSIDIAN_VAULT") } else { "${HOME}/Obsidian/Vault" }

# Folder name under .obsidian/plugins where this plugin will live.
plugin_id := "obsidian-kindle-plugin"

default: build

install-deps:
    # Install npm dependencies
    npm install

build: install-deps
    # Build production bundle (outputs dist/main.js*)
    npm run build
    # Copy bundle to plugin root as expected by Obsidian
    if [ -d dist ]; then cp dist/main.js* .; fi

# Deploy by copying built files into the vault's plugin directory.
deploy: build
    mkdir -p "{{vault_dir}}/.obsidian/plugins/{{plugin_id}}"
    cp manifest.json main.js* "{{vault_dir}}/.obsidian/plugins/{{plugin_id}}"/
